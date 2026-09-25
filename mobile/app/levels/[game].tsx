/** Level select — Beginner / Intermediate / Advanced with best score and stars. */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../../src/lib/session';
import { GameType, LEVELS, TEXT, gameInfo } from '../../src/lib/game-config';
import { Stars } from '../../src/components/ui';
import { colors, radius } from '../../src/theme';

export default function Levels() {
  const { game } = useLocalSearchParams<{ game: GameType }>();
  const router = useRouter();
  const { progress, bundle } = useSession();
  const info = gameInfo(game as GameType);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.top}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.title}>{info?.name}</Text>
      </View>

      <ScrollView contentContainerStyle={s.list}>
        <Text style={s.section}>{TEXT.chooseLevel}</Text>

        {LEVELS.map((lv, i) => {
          const best = progress.scores.find((x: any) => x.gameType === game && x.level === lv.id);
          const g = bundle?.games.find((x) => x.gameType === game && x.level === lv.id);
          const wordCount = g?.wordIds.length ?? 0;

          return (
            <Pressable
              key={lv.id}
              disabled={wordCount === 0}
              style={({ pressed }) => [s.card, wordCount === 0 && { opacity: 0.5 }, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 1 }]}
              onPress={() => router.push(`/lesson/${game}/${lv.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.levelName}>{lv.name}</Text>
                <Text style={[s.levelFil, { color: info?.color }]}>{lv.filipino}</Text>
                <View style={s.pips}>
                  {LEVELS.map((_, j) => (
                    <View key={j} style={[s.pip, j <= i && { backgroundColor: info?.color }]} />
                  ))}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Stars count={best?.stars ?? 0} size={20} />
                <Text style={s.meta}>{lv.items} tanong</Text>
                <Text style={s.meta}>{best ? `Pinakamataas: ${best.highestScore}` : wordCount === 0 ? 'Walang salita' : 'Hindi pa nalalaro'}</Text>
              </View>
            </Pressable>
          );
        })}
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
  list: { padding: 16, gap: 12 },
  section: { fontSize: 18, fontWeight: '800', color: colors.ink },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: radius.lg, padding: 18, borderBottomWidth: 4, borderBottomColor: colors.shadow, gap: 12 },
  levelName: { fontSize: 22, fontWeight: '800', color: colors.ink },
  levelFil: { fontSize: 14, fontWeight: '800' },
  pips: { flexDirection: 'row', gap: 4, marginTop: 8 },
  pip: { width: 18, height: 8, borderRadius: 4, backgroundColor: '#dfe6ef' },
  meta: { fontSize: 12, color: colors.ink2, fontWeight: '600' },
});
