/** Aking Gantimpala — badges earned and highest score per game and level. */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../src/lib/session';
import { GAMES, LEVELS, TEXT } from '../src/lib/game-config';
import { Stars } from '../src/components/ui';
import { colors, radius } from '../src/theme';

// Same badge list as api/src/common/game-config.ts
const BADGES = [
  { key: 'first', name: 'Unang Hakbang', icon: '👣' },
  { key: 'perfect', name: 'Perpekto!', icon: '👑' },
  { key: 'threestar', name: 'Tatlong Bituin', icon: '🌟' },
  { key: 'titik', name: 'Kampeon ng Titik', icon: '🔤' },
  { key: 'diligent', name: 'Masipag', icon: '☀️' },
  { key: 'builder', name: 'Batang Tagabuo', icon: '🧱' },
];

export default function Rewards() {
  const router = useRouter();
  const { progress } = useSession();
  const earned = new Set(progress.badges.map((b: any) => b.key));
  const stars = progress.scores.reduce((a: number, s: any) => a + s.stars, 0);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.top}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.title}>{TEXT.rewards}</Text>
        <Text style={s.chip}>⭐ {stars}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={s.section}>Mga Tsapa ({earned.size}/{BADGES.length})</Text>
        <View style={s.badgeGrid}>
          {BADGES.map((b) => (
            <View key={b.key} style={[s.badge, !earned.has(b.key) && s.badgeLocked]}>
              <Text style={s.badgeIcon}>{earned.has(b.key) ? b.icon : '🔒'}</Text>
              <Text style={s.badgeName}>{b.name}</Text>
            </View>
          ))}
        </View>

        <Text style={s.section}>Pinakamataas na Iskor</Text>
        <View style={s.table}>
          <View style={s.row}>
            <Text style={[s.cellHead, { flex: 1 }]}>Laro</Text>
            {LEVELS.map((l) => (
              <Text key={l.id} style={[s.cellHead, s.cell]}>{l.name.slice(0, 3)}</Text>
            ))}
          </View>
          {GAMES.map((g) => (
            <View key={g.id} style={s.row}>
              <Text style={[s.gameName, { color: g.color }]}>{g.name}</Text>
              {LEVELS.map((l) => {
                const best = progress.scores.find((x: any) => x.gameType === g.id && x.level === l.id);
                return (
                  <View key={l.id} style={s.cell}>
                    {best ? (
                      <>
                        <Stars count={best.stars} size={12} />
                        <Text style={s.score}>{best.highestScore}</Text>
                      </>
                    ) : (
                      <Text style={s.dash}>—</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
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
  chip: { backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, fontWeight: '800', color: colors.ink },
  section: { fontSize: 18, fontWeight: '800', color: colors.ink },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '31%', backgroundColor: '#fff', borderRadius: radius.md, padding: 12, alignItems: 'center', gap: 6, borderBottomWidth: 3, borderBottomColor: colors.shadow },
  badgeLocked: { opacity: 0.55 },
  badgeIcon: { fontSize: 30, color: colors.ink },
  badgeName: { fontSize: 12, fontWeight: '700', textAlign: 'center', color: colors.ink },
  table: { backgroundColor: '#fff', borderRadius: radius.md, padding: 12, borderBottomWidth: 3, borderBottomColor: colors.shadow },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef1f6' },
  cellHead: { fontSize: 11, fontWeight: '800', color: colors.ink3, textTransform: 'uppercase' },
  cell: { width: 58, alignItems: 'center' },
  gameName: { flex: 1, fontWeight: '800', fontSize: 13, color: colors.ink },
  score: { fontSize: 11, color: colors.ink3, fontWeight: '700' },
  dash: { color: colors.ink3 },
});
