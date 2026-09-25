/** Results — stars, score, highest score and sync status. */
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../src/lib/session';
import { sound } from '../src/lib/audio';
import { TEXT, gameInfo, levelRule } from '../src/lib/game-config';
import { BigButton, Stars } from '../src/components/ui';
import { colors, radius } from '../src/theme';

const TITLES = ['Subukan muli!', 'Magaling!', 'Napakagaling!', 'Kahanga-hanga!'];

export default function Result() {
  const { lastResult, progress } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!lastResult) return;
    const t = setTimeout(() => sound.speak(`${TITLES[lastResult.stars]} ${lastResult.stars} bituin!`), 400);
    return () => {
      clearTimeout(t);
      sound.stop();
    };
  }, [lastResult]);

  if (!lastResult) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={{ padding: 20 }}>
          <BigButton label={TEXT.backHome} onPress={() => router.replace('/home')} />
        </View>
      </SafeAreaView>
    );
  }

  const best = progress.scores.find((x: any) => x.gameType === lastResult.gameType && x.level === lastResult.level);
  const isNewBest = !best || lastResult.score >= best.highestScore;

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.eyebrow}>
          {gameInfo(lastResult.gameType)?.name} · {levelRule(lastResult.level)?.name}
        </Text>
        <Text style={s.title}>{TITLES[lastResult.stars]}</Text>
        <Stars count={lastResult.stars} size={52} />

        <View style={s.grid}>
          <Box value={`${lastResult.correct}/${lastResult.items}`} label="tama" />
          <Box value={`${lastResult.accuracy}%`} label="husay" />
          <Box value={lastResult.score} label="puntos" />
        </View>

        {isNewBest ? <Text style={s.newBest}>🏆 {TEXT.newBest}</Text> : <Text style={s.prevBest}>Pinakamataas mo: {best?.highestScore} puntos</Text>}

        <Text style={[s.sync, lastResult.synced ? s.syncOk : s.syncWait]}>
          {lastResult.synced ? `✓ ${TEXT.synced}` : `⏳ ${TEXT.offline}`}
        </Text>

        {lastResult.newBadges?.length ? (
          <View style={s.badges}>
            <Text style={s.badgeTitle}>Bagong gantimpala!</Text>
            {lastResult.newBadges.map((b: any) => (
              <Text key={b.key} style={s.badgeRow}>🏅 {b.name} — {b.description}</Text>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 12, width: '100%', marginTop: 8 }}>
          <BigButton label={`↻  ${TEXT.playAgain}`} onPress={() => router.replace(`/lesson/${lastResult.gameType}/${lastResult.level}`)} />
          <BigButton label={TEXT.backHome} onPress={() => router.replace('/home')} color="#fff" shadow={colors.shadow} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Box({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={s.box}>
      <Text style={s.boxValue}>{value}</Text>
      <Text style={s.boxLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  body: { padding: 20, alignItems: 'center', gap: 12 },
  eyebrow: { fontSize: 12, fontWeight: '800', color: colors.ink3, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '800', color: colors.ink },
  grid: { flexDirection: 'row', gap: 8, width: '100%' },
  box: { flex: 1, backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: colors.shadow },
  boxValue: { fontSize: 24, fontWeight: '800', color: colors.ink },
  boxLabel: { fontSize: 12, fontWeight: '700', color: colors.ink2 },
  newBest: { backgroundColor: colors.mango, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8, fontWeight: '800', color: colors.ink },
  prevBest: { fontWeight: '700', color: colors.ink3 },
  sync: { fontSize: 13, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, overflow: 'hidden' },
  syncOk: { backgroundColor: colors.goodSoft, color: colors.good },
  syncWait: { backgroundColor: '#fdf3dc', color: '#8a5a10' },
  badges: { width: '100%', backgroundColor: '#fff', borderRadius: radius.md, padding: 14, gap: 6 },
  badgeTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  badgeRow: { fontWeight: '600', color: colors.ink2 },
});
