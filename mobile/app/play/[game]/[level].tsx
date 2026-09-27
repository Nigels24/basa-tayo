/**
 * The mini-game. One screen drives all three games; the differences live in
 * game-engine.ts (items) and game-config.ts (level rules).
 *
 * Immediate feedback after every answer. When the round ends the session is
 * queued in SQLite and sent to the API — right away when online, later when not.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../../../src/lib/session';
import { sound } from '../../../src/lib/audio';
import { GameType, Level, POINTS_PER_CORRECT, TEXT, levelRule, starsOf } from '../../../src/lib/game-config';
import { Item, buildRound, showLetter } from '../../../src/lib/game-engine';
import { newClientId, outbox } from '../../../src/lib/db';
import { BigButton, Loading, Picture } from '../../../src/components/ui';
import { colors, radius } from '../../../src/theme';

interface Answer {
  wordId: number;
  prompt: string;
  given: string;
  isCorrect: boolean;
}

export default function Play() {
  const { game, level } = useLocalSearchParams<{ game: GameType; level: Level }>();
  const router = useRouter();
  const { bundle, sync, setLastResult } = useSession();
  const lv = levelRule(level as Level);

  const items = useMemo(() => (bundle ? buildRound(bundle, game as GameType, level as Level) : []), [bundle, game, level]);
  const answers = useRef<Answer[]>([]);
  // One id per round, made when the round starts, so however often "Tapos na"
  // fires the outbox and the server see the same round.
  const [clientId] = useState(newClientId);
  // Refs, not state: a second tap can arrive before React re-renders.
  const answered = useRef(false);
  const finishing = useRef(false);
  const [busy, setBusy] = useState(false);

  const [index, setIndex] = useState(0);
  const [built, setBuilt] = useState<{ s: string; k: number }[]>([]);
  const [replays, setReplays] = useState(Math.max(0, lv.audioReplays));
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);

  const item = items[index];

  useEffect(() => {
    if (!item) return;
    const t = setTimeout(() => sound.playWord(item.word), 350);
    return () => clearTimeout(t);
  }, [index, item?.word.id]);

  useEffect(() => () => sound.stop(), []);

  if (!bundle) return <Loading label="Naglo-load ng aralin…" />;
  if (!items.length) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={{ padding: 20, gap: 14 }}>
          <Text style={s.info}>Walang salita para sa larong ito. Magdagdag muna ang guro sa word bank.</Text>
          <BigButton label={TEXT.backHome} onPress={() => router.replace('/home')} color={colors.blue} shadow="#1f65ab" />
        </View>
      </SafeAreaView>
    );
  }

  const canReplay = lv.audioReplays < 0 || replays > 0;

  const replay = () => {
    if (!canReplay || feedback) return;
    if (lv.audioReplays >= 0) setReplays((r) => Math.max(0, r - 1));
    sound.playWord(item.word);
  };

  const answer = (given: string) => {
    if (feedback || answered.current) return;
    answered.current = true;
    const isCorrect = game === 'BUUIN' ? given === item.answer : given === item.answer;
    answers.current.push({ wordId: item.word.id, prompt: item.prompt, given, isCorrect });

    if (isCorrect) {
      const praise = TEXT.correct[Math.floor(Math.random() * TEXT.correct.length)];
      setFeedback({ correct: true, text: praise });
      setTimeout(() => sound.speak(praise), 200);
    } else {
      setFeedback({ correct: false, text: TEXT.wrong });
      setTimeout(() => {
        if (game === 'TITIK') sound.playLetter(item.answer);
        else sound.playWord(item.word);
      }, 300);
    }
  };

  const tapTile = (tile: { s: string; k: number }) => {
    if (feedback) return;
    const slots = (item.syllables?.length ?? 0) - (item.given ?? 0);
    if (built.includes(tile) || built.length >= slots) return;

    const next = [...built, tile];
    setBuilt(next);
    if (next.length === slots) {
      const word = (item.syllables ?? []).slice(0, item.given).join('') + next.map((t) => t.s).join('');
      answer(word);
    }
  };

  const next = async () => {
    if (finishing.current) return;
    sound.stop();
    if (index + 1 < items.length) {
      answered.current = false;
      setIndex(index + 1);
      setBuilt([]);
      setReplays(Math.max(0, lv.audioReplays));
      setFeedback(null);
      return;
    }
    await finish();
  };

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true; // before any await, so repeated taps are no-ops
    setBusy(true);

    const list = answers.current;
    const correct = list.filter((a) => a.isCorrect).length;
    const accuracy = Math.round((correct / list.length) * 100);

    const session = {
      clientId,
      gameType: game as string,
      level: level as string,
      playedAt: new Date().toISOString(),
      answers: list,
    };
    try {
      await outbox.add(session);
    } catch (e) {
      // Not queued: let the pupil tap again. Same clientId, so a retry is still one round.
      finishing.current = false;
      setBusy(false);
      throw e;
    }

    // Local estimate for the results screen; the API re-scores it on sync.
    setLastResult({
      clientId: session.clientId,
      gameType: game as GameType,
      level: level as Level,
      correct,
      items: list.length,
      accuracy,
      stars: starsOf(accuracy),
      score: correct * POINTS_PER_CORRECT,
      newBadges: [],
    });

    const server = await sync(session.clientId); // silently queues when offline
    if (server) setLastResult((prev) => (prev?.clientId === server.clientId ? { ...prev, server } : prev));
    router.replace('/result');
  };

  const slots = item.syllables ?? [];

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.top}>
        <Pressable style={s.quit} onPress={() => router.replace(`/levels/${game}`)}>
          <Text style={s.quitText}>✕</Text>
        </Pressable>
        <View style={s.bar}>
          <View style={[s.barFill, { width: `${(index / items.length) * 100}%` }]} />
        </View>
        <Text style={s.count}>{index + 1}/{items.length}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={s.card}>
          <Text style={s.question}>{item.question}</Text>
          <Picture word={item.word} size={120} />

          {game === 'TITIK' && lv.showModel ? (
            <Text style={s.model}>{item.word.word}</Text>
          ) : null}

          <Pressable style={[s.listen, !canReplay && s.listenOff]} onPress={replay} disabled={!canReplay}>
            <Text style={s.listenText}>🔊 {TEXT.listen}</Text>
          </Pressable>
          {lv.audioReplays >= 0 ? (
            <Text style={s.replays}>{lv.audioReplays === 0 ? 'Isang beses lang ang tunog' : `${replays} ulit pa`}</Text>
          ) : null}
        </View>

        {game === 'BUUIN' ? (
          <>
            <View style={s.slots}>
              {slots.map((syl, i) => {
                if (i < (item.given ?? 0)) return <View key={i} style={[s.slot, s.slotGiven]}><Text style={s.slotText}>{syl}</Text></View>;
                const filled = built[i - (item.given ?? 0)];
                return (
                  <Pressable
                    key={i}
                    style={[s.slot, filled && s.slotFilled, feedback && (feedback.correct ? s.slotOk : s.slotNo)]}
                    onPress={() => !feedback && filled && setBuilt(built.filter((b) => b !== filled))}
                  >
                    <Text style={s.slotText}>{filled ? filled.s : lv.showModel ? syl : ''}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={s.tiles}>
              {(item.tiles ?? []).map((t, i) => (
                <Pressable key={i} style={[s.tile, built.includes(t) && { opacity: 0 }]} onPress={() => tapTile(t)}>
                  <Text style={s.tileText}>{t.s}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={s.choices}>
            {(item.choices ?? []).map((c) => {
              const state = !feedback ? null : c === item.answer ? 'right' : 'wrong';
              return (
                <Pressable
                  key={c}
                  disabled={!!feedback}
                  style={[
                    s.choice,
                    state === 'right' && s.choiceRight,
                    state === 'wrong' && s.choiceDim,
                  ]}
                  onPress={() => answer(c)}
                >
                  <Text style={[s.choiceText, state === 'right' && { color: '#fff' }]}>
                    {game === 'TITIK' ? showLetter(c) : c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {feedback ? (
        <View style={[s.feedback, feedback.correct ? s.fbGood : s.fbBad]}>
          <View style={s.fbHead}>
            <Text style={[s.fbText, { color: feedback.correct ? colors.good : colors.bad }]}>
              {feedback.correct ? '✓' : '✕'} {feedback.text}
            </Text>
            {feedback.correct ? <Text style={s.points}>+{POINTS_PER_CORRECT}</Text> : null}
          </View>

          {!feedback.correct ? (
            <Pressable style={s.answerRow} onPress={() => (game === 'TITIK' ? sound.playLetter(item.answer) : sound.playWord(item.word))}>
              <Picture word={item.word} size={38} />
              <Text style={s.answerText}>
                {game === 'TITIK' ? showLetter(item.answer) : (item.syllables ?? [item.answer]).join('·')}
              </Text>
              <Text style={{ fontSize: 22, color: colors.ink }}>🔊</Text>
            </Pressable>
          ) : null}

          <BigButton
            label={index + 1 === items.length ? TEXT.finish : TEXT.next}
            onPress={next}
            disabled={busy}
            color={feedback.correct ? colors.green : colors.bad}
            shadow={feedback.correct ? colors.greenDeep : '#a33131'}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  info: { fontSize: 16, color: colors.ink, fontWeight: '600' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  quit: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  quitText: { fontSize: 20, fontWeight: '800', color: colors.ink },
  bar: { flex: 1, height: 14, backgroundColor: '#d7e2ef', borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.green, borderRadius: radius.pill },
  count: { fontWeight: '800', fontSize: 16, color: colors.ink },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, alignItems: 'center', gap: 10, borderBottomWidth: 4, borderBottomColor: colors.shadow },
  question: { fontSize: 17, fontWeight: '800', textAlign: 'center', color: colors.ink },
  model: { fontSize: 32, fontWeight: '700', color: colors.ink, letterSpacing: 2 },
  listen: { backgroundColor: colors.blue, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill, borderBottomWidth: 4, borderBottomColor: '#1f65ab' },
  listenOff: { backgroundColor: '#b9c6d6', borderBottomColor: '#9aa9bc' },
  listenText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  replays: { fontSize: 12, fontWeight: '700', color: colors.ink3 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  choice: { flexGrow: 1, flexBasis: '45%', minHeight: 78, backgroundColor: '#fff', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: colors.shadow, padding: 8 },
  choiceRight: { backgroundColor: colors.good, borderBottomColor: '#1f7a41' },
  choiceDim: { opacity: 0.45 },
  choiceText: { fontSize: 26, fontWeight: '700', color: colors.ink },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  slot: { minWidth: 72, height: 66, borderRadius: radius.sm, borderWidth: 3, borderStyle: 'dashed', borderColor: '#aebdd0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  slotGiven: { borderStyle: 'solid', borderColor: colors.shadow, backgroundColor: '#e7eef7' },
  slotFilled: { borderStyle: 'solid', borderColor: colors.blue, backgroundColor: '#fff' },
  slotOk: { borderColor: colors.good, backgroundColor: colors.goodSoft },
  slotNo: { borderColor: colors.bad, backgroundColor: colors.badSoft },
  slotText: { fontSize: 26, fontWeight: '700', color: colors.ink },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  tile: { minWidth: 74, height: 62, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.mango, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: colors.mangoDeep },
  tileText: { fontSize: 24, fontWeight: '700', color: colors.ink },
  feedback: { padding: 16, gap: 10 },
  fbGood: { backgroundColor: colors.goodSoft },
  fbBad: { backgroundColor: colors.badSoft },
  fbHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fbText: { fontSize: 22, fontWeight: '800', flex: 1, color: colors.ink },
  points: { fontSize: 16, fontWeight: '800', color: colors.good },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  answerText: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.ink },
});
