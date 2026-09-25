/** Log-in — the pupil types the short code the teacher issued. */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../src/lib/session';
import { sound } from '../src/lib/audio';
import { TEXT } from '../src/lib/game-config';
import { Loading } from '../src/components/ui';
import { colors, radius } from '../src/theme';

const CODE_LENGTH = 4;

export default function Login() {
  const { pupil, login, ready } = useSession();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && pupil) router.replace('/home');
  }, [ready, pupil]);

  const press = async (n: string) => {
    if (busy || code.length >= CODE_LENGTH) return;
    setError('');
    const next = code + n;
    setCode(next);
    if (next.length === CODE_LENGTH) await submit(next);
  };

  const submit = async (value: string) => {
    setBusy(true);
    try {
      await login(value);
      router.replace('/home');
    } catch (e: any) {
      setError(e.message || TEXT.wrongCode);
      sound.speak(TEXT.wrongCode);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <Loading />;

  return (
    <SafeAreaView style={s.screen}>
      <Text style={s.logo}>Basa Tayo!</Text>
      <Text style={s.sub}>Grade 1 · Filipino</Text>

      <Text style={s.prompt}>{TEXT.enterCode}</Text>
      <View style={s.dots}>
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <View key={i} style={s.dot}>
            <Text style={s.dotText}>{code[i] ?? ''}</Text>
          </View>
        ))}
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}
      {busy ? <Text style={s.busy}>Sandali lang…</Text> : null}

      <View style={s.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <Key key={n} label={n} onPress={() => press(n)} />
        ))}
        <Key label="⌫" util onPress={() => setCode(code.slice(0, -1))} />
        <Key label="0" onPress={() => press('0')} />
        <Key label="🔊" util onPress={() => sound.speak(TEXT.enterCode)} />
      </View>
    </SafeAreaView>
  );
}

function Key({ label, onPress, util }: { label: string; onPress: () => void; util?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.key, util && s.keyUtil, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 1 }]}
    >
      <Text style={s.keyText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mango, alignItems: 'center', paddingTop: 28, paddingHorizontal: 20, gap: 12 },
  logo: { fontSize: 42, fontWeight: '800', color: colors.ink },
  sub: { fontWeight: '700', color: '#6b4b00', marginTop: -8 },
  prompt: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 8 },
  dots: { flexDirection: 'row', gap: 12 },
  dot: { width: 54, height: 62, borderRadius: radius.md, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 30, fontWeight: '700', color: colors.ink },
  error: { backgroundColor: '#fff', color: colors.bad, fontWeight: '800', paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm, textAlign: 'center' },
  busy: { fontWeight: '700', color: '#6b4b00' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 264, gap: 12, justifyContent: 'center', marginTop: 6 },
  key: { width: 80, height: 66, borderRadius: radius.md, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: '#e0c678' },
  keyUtil: { backgroundColor: '#ffe39a' },
  keyText: { fontSize: 26, fontWeight: '700', color: colors.ink },
});
