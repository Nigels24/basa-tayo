/** Main menu — greeting, total stars, the three mini-games, sync status. */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../src/lib/session';
import { outbox } from '../src/lib/db';
import { sound } from '../src/lib/audio';
import { GAMES, LEVELS, TEXT } from '../src/lib/game-config';
import { Loading } from '../src/components/ui';
import { colors, radius } from '../src/theme';

/** How long Log out waits for queued rounds to send before asking anyway. */
const LOGOUT_SYNC_WAIT_MS = 15_000;

export default function Home() {
  const { pupil, bundle, progress, pending, ready, sync, logout, refresh } = useSession();
  const router = useRouter();
  // Held from the first Log out tap until the pupil confirms or cancels, so repeated taps do nothing.
  const loggingOut = useRef(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (ready && !pupil) router.replace('/');
  }, [ready, pupil]);

  // Refresh first, then retry anything queued; neither blocks the screen.
  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => sync());
  }, []);

  if (!ready || !pupil) return <Loading />;

  const firstName = pupil.name.split(' ')[0];

  /**
   * Tries to send queued rounds (at most LOGOUT_SYNC_WAIT_MS; a timeout or no
   * internet just leaves them queued), then asks before logging out. Rounds
   * still waiting stay in the outbox until this pupil logs in here again.
   */
  const tryLogout = async () => {
    let waiting: number;
    setSending(true);
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, LOGOUT_SYNC_WAIT_MS);
      });
      await Promise.race([sync(), timeout]);
      clearTimeout(timer);
      waiting = await outbox.count();
    } catch {
      loggingOut.current = false;
      return;
    } finally {
      setSending(false);
    }

    const cancel = { text: 'Cancel', style: 'cancel' as const, onPress: () => { loggingOut.current = false; } };
    const confirm = async () => {
      try {
        await logout();
        router.replace('/');
      } finally {
        loggingOut.current = false;
      }
    };

    if (waiting === 0) {
      Alert.alert('Mag-log out?', 'Ikaw ay mag-lo-log out sa app.', [cancel, { text: 'Log out', onPress: confirm }]);
    } else {
      Alert.alert(
        `May ${waiting} laro na hindi pa naipapadala`,
        `Kumonekta muna sa internet para maipadala. Kung mag-log out ngayon, maipapadala lang ito kapag nag-log in muli si ${firstName} sa tablet na ito.`,
        [
          { text: 'Subukang muli', onPress: () => { tryLogout(); } },
          cancel,
          { text: 'Mag-log out pa rin', style: 'destructive', onPress: confirm },
        ],
      );
    }
  };

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
          <Text style={s.helloName}>{TEXT.hello}, {firstName}!</Text>
          <Text style={s.helloSub}>{stars} / {maxStars} bituin · {TEXT.chooseGame}</Text>
        </View>
      </View>

      {pending > 0 ? (
        <Pressable style={({ pressed }) => [s.pendingBar, pressed && { opacity: 0.6 }]} onPress={() => sync()}>
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
            onPress={() => {
              if (loggingOut.current) return;
              loggingOut.current = true;
              tryLogout();
            }}
          >
            <Text style={s.logoutText}>Log out</Text>
          </Pressable>
        </View>

        {!bundle ? <Text style={s.warn}>Walang na-download na aralin. Kumonekta muna sa internet.</Text> : null}
      </ScrollView>

      <Modal visible={sending} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <ActivityIndicator size="large" color={colors.blue} />
            <Text style={s.overlayText}>Ipinapadala ang mga laro…</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  appName: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.ink },
  starChip: { backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, fontWeight: '800', fontSize: 16, color: colors.ink },
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
  play: { fontSize: 26, color: colors.ink },
  footer: { flexDirection: 'row', gap: 12, marginTop: 8 },
  rewards: { flex: 1, backgroundColor: '#fff', borderRadius: radius.lg, paddingVertical: 18, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: colors.shadow },
  rewardsText: { fontSize: 18, fontWeight: '800', color: colors.ink },
  logout: { paddingHorizontal: 18, justifyContent: 'center', backgroundColor: '#fff', borderRadius: radius.lg, borderBottomWidth: 4, borderBottomColor: colors.shadow },
  logoutText: { fontWeight: '700', color: colors.ink2 },
  overlay: { flex: 1, backgroundColor: 'rgba(29,40,56,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlayCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 24, paddingHorizontal: 28, alignItems: 'center', gap: 14 },
  overlayText: { fontSize: 17, fontWeight: '700', color: colors.ink },
  warn: { textAlign: 'center', color: colors.ink3, marginTop: 12 },
});
