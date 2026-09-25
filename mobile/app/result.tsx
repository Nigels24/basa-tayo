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

  // Server scoring when the round synced, the device's estimate when it did not.
  const server = lastResult?.server;
  const stars = server?.stars ?? lastResult?.stars ?? 0;

  useEffect(() => {
    if (!lastResult) return;
    const t = setTimeout(() => sound.speak(`${TITLES[stars]} ${stars} bituin!`), 400);
    return () => {
      clearTimeout(t);
      sound.stop();
    };
  }, [lastResult?.clientId]);

  if (!lastResult) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={{ padding: 20 }}>
          <BigButton label={TEXT.backHome} onPress={() => router.replace('/home')} />
        </View>
      </SafeAreaView>
    );
  }

  const score = server?.score ?? lastResult.score;
  const accuracy = server?.accuracy ?? lastResult.accuracy;
  const newBadges = server?.newBadges ?? lastResult.newBadges;

  const best = progress.scores.find((x: any) => x.gameType === lastResult.gameType && x.level === lastResult.level);
  const isNewBest = server ? server.isNewBest : !best || score >= best.highestScore;

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.eyebrow}>
          {gameInfo(lastResult.gameType)?.name} · {levelRule(lastResult.level)?.name}
        </Text>
        <Text style={s.title}>{TITLES[stars]}</Text>
        <Stars count={stars} size={52} />

        <View style={s.grid}>
          <Box value={`${lastResult.correct}/${lastResult.items}`} label="tama" />
          <Box value={`${accuracy}%`} label="husay" />
          <Box value={score} label="puntos" />
        </View>

        {isNewBest ? <Text style={s.newBest}>🏆 {TEXT.newBest}</Text> : <Text style={s.prevBest}>Pinakamataas mo: {best?.highestScore} puntos</Text>}

        <Text style={[s.sync, server ? s.syncOk : s.syncWait]}>
          {server ? `✓ ${TEXT.synced}` : `⏳ ${TEXT.offline}`}
        </Text>

        {newBadges.length ? (
          <View style={s.badges}>
            <Text style={s.badgeTitle}>Bagong gantimpala!</Text>
            {newBadges.map((b) => (
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
