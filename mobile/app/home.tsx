/** Main menu — greeting, total stars, the three mini-games, sync status. */
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../src/lib/session';
import { sound } from '../src/lib/audio';
import { GAMES, LEVELS, TEXT } from '../src/lib/game-config';
import { Loading } from '../src/components/ui';
import { colors, radius } from '../src/theme';

export default function Home() {
  const { pupil, bundle, progress, pending, ready, sync, logout, refresh } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready && !pupil) router.replace('/');
  }, [ready, pupil]);

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  if (!ready || !pupil) return <Loading />;

  const stars = progress.scores.reduce((a: number, s: any) => a + s.stars, 0);
  const maxStars = GAMES.length * LEVELS.length * 3;

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.top}>
        <Text style={s.appName}>Basa Tayo!</Text>
        <Text style={s.starChip}>⭐ {stars}</Text>
      </View>

      <View style={s.hello}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{pupil.name[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.helloName}>{TEXT.hello}, {pupil.name.split(' ')[0]}!</Text>
          <Text style={s.helloSub}>{stars} / {maxStars} bituin · {TEXT.chooseGame}</Text>
        </View>
      </View>

      {pending > 0 ? (
        <Pressable style={s.pendingBar} onPress={() => sync()}>
          <Text style={s.pendingText}>📶 {pending} laro ang naghihintay i-sync. Pindutin kapag may internet.</Text>
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={s.list}>
        {GAMES.map((g) => {
          const played = progress.scores.filter((x: any) => x.gameType === g.id).length;
          return (
            <Pressable
              key={g.id}
              style={({ pressed }) => [s.tile, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 1 }]}
              onPress={() => {
                sound.speak(g.name);
                router.push(`/levels/${g.id}`);
              }}
            >
              <View style={[s.art, { backgroundColor: g.color }]}>
                <Text style={s.artText}>{g.art}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tileTitle}>{g.name}</Text>
                <Text style={s.tileSub}>{played}/{LEVELS.length} antas nalaro</Text>
              </View>
              <Text style={[s.play, { color: g.color }]}>▶</Text>
            </Pressable>
          );
        })}

        <View style={s.footer}>
          <Pressable style={s.rewards} onPress={() => router.push('/rewards')}>
            <Text style={s.rewardsText}>🏆 {TEXT.rewards}</Text>
          </Pressable>
          <Pressable
            style={s.logout}
            onPress={async () => {
              await logout();
              router.replace('/');
            }}
          >
            <Text style={s.logoutText}>Log out</Text>
          </Pressable>
        </View>

        {!bundle ? <Text style={s.warn}>Walang na-download na aralin. Kumonekta muna sa internet.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  appName: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.ink },
  starChip: { backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, fontWeight: '800', fontSize: 16 },
  hello: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.mango, margin: 16, marginBottom: 8, padding: 16, borderRadius: radius.lg },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.red },
  helloName: { fontSize: 22, fontWeight: '800', color: colors.ink },
  helloSub: { fontWeight: '700', color: '#6b4b00' },
  pendingBar: { marginHorizontal: 16, marginBottom: 4, backgroundColor: '#fdf3dc', borderRadius: radius.sm, padding: 10 },
  pendingText: { color: '#8a5a10', fontWeight: '700', fontSize: 13 },
  list: { padding: 16, gap: 12 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: radius.lg, padding: 12, borderBottomWidth: 4, borderBottomColor: colors.shadow },
  art: { width: 76, height: 76, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  artText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  tileTitle: { fontSize: 19, fontWeight: '800', color: colors.ink },
  tileSub: { color: colors.ink2, fontWeight: '600', fontSize: 13 },
  play: { fontSize: 26 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 8 },
  rewards: { flex: 1, backgroundColor: '#fff', borderRadius: radius.lg, paddingVertical: 18, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: colors.shadow },
  rewardsText: { fontSize: 18, fontWeight: '800', color: colors.ink },
  logout: { paddingHorizontal: 18, justifyContent: 'center', backgroundColor: '#fff', borderRadius: radius.lg, borderBottomWidth: 4, borderBottomColor: colors.shadow },
  logoutText: { fontWeight: '700', color: colors.ink2 },
  warn: { textAlign: 'center', color: colors.ink3, marginTop: 12 },
});
