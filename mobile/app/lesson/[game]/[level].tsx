/**
 * Lesson screen — shown before EVERY round (Objective 1).
 * The only route into the game goes through here.
 */
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../../../src/lib/session';
import { sound } from '../../../src/lib/audio';
import { GameType, Level, TEXT, gameInfo, levelRule } from '../../../src/lib/game-config';
import { BigButton, Picture } from '../../../src/components/ui';
import { colors, radius } from '../../../src/theme';

export default function LessonScreen() {
  const { game, level } = useLocalSearchParams<{ game: GameType; level: Level }>();
  const router = useRouter();
  const { bundle } = useSession();
  // A double tap must not start two rounds or go back two screens.
  const leaving = useRef(false);
  const leave = (go: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    go();
  };

  const gameRow = bundle?.games.find((g) => g.gameType === game && g.level === level);
  const lesson =
    bundle?.lessons.find((l) => l.id === gameRow?.lessonId) ??
    bundle?.lessons.find((l) => l.gameType === game && l.level === level);
  const example = bundle?.words.find((w) => w.id === lesson?.exampleWordId);

  // The example word's recording when it has one; otherwise (or if it can't play) the lesson is read aloud as before.
  const readLesson = () => sound.speak(lesson?.say || lesson?.target || '', 0.7);
  const say = () => {
    if (example?.audioUrl) sound.playWord(example, readLesson);
    else readLesson();
  };

  useEffect(() => {
    const t = setTimeout(say, 400);
    return () => {
      clearTimeout(t);
      sound.stop();
    };
  }, [lesson?.id]);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.top}>
        <Pressable style={s.back} onPress={() => leave(() => router.back())}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.title}>{TEXT.lesson}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={s.pad}>
          <Text style={s.tag}>
            {gameInfo(game as GameType)?.name} · {levelRule(level as Level)?.name}
          </Text>
          <Text style={s.lessonTitle}>{lesson?.title ?? 'Aralin'}</Text>
          <Text style={s.target}>{lesson?.target ?? '—'}</Text>

          {example ? (
            <View style={s.example}>
              <Picture word={example} size={48} />
              <Text style={s.exampleWord}>{example.word}</Text>
            </View>
          ) : null}

          <Pressable style={s.listen} onPress={say}>
            <Text style={s.listenText}>🔊 {TEXT.listen}</Text>
          </Pressable>

          <Text style={s.body}>{lesson?.body ?? 'Wala pang aralin para sa antas na ito.'}</Text>
        </View>

        {lesson ? <Text style={s.comp}>Competency: {lesson.competencyCode}</Text> : null}

        <BigButton label={`▶  ${TEXT.start}`} onPress={() => leave(() => router.replace(`/play/${game}/${level}`))} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  back: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, fontWeight: '800', color: colors.ink, marginTop: -4 },
  title: { flex: 1, fontSize: 21, fontWeight: '800', color: colors.ink },
  // pad paper look, like the prototype
  pad: { backgroundColor: colors.pad, borderRadius: radius.md, padding: 20, gap: 12, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#e6dcb4' },
  tag: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '800', color: '#8a6d12', letterSpacing: 1 },
  lessonTitle: { alignSelf: 'flex-start', fontSize: 22, fontWeight: '800', color: colors.ink },
  target: { fontSize: 46, fontWeight: '700', color: colors.red, textAlign: 'center' },
  example: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.75)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm },
  exampleWord: { fontSize: 26, fontWeight: '700', color: colors.ink },
  listen: { flexDirection: 'row', backgroundColor: colors.blue, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill, borderBottomWidth: 4, borderBottomColor: '#1f65ab' },
  listenText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 26, fontWeight: '600', color: colors.ink, alignSelf: 'stretch' },
  comp: { textAlign: 'center', color: colors.ink3, fontSize: 12, fontWeight: '700' },
});
