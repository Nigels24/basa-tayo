import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
import type { CachedWord } from '../lib/db';

/** Big chunky button — the main touch target for six-year-olds. */
export function BigButton({ label, onPress, color = colors.green, shadow = colors.greenDeep, labelColor = '#fff', disabled, style }: {
  label: string;
  onPress: () => void;
  color?: string;
  shadow?: string;
  labelColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.big,
        { backgroundColor: disabled ? '#b9c6d6' : color, borderBottomColor: disabled ? '#9aa9bc' : shadow },
        pressed && !disabled ? s.pressed : null,
        style,
      ]}
    >
      <Text style={[s.bigLabel, { color: disabled ? '#fff' : labelColor }]}>{label}</Text>
    </Pressable>
  );
}

/** The word's picture: an uploaded image, or the emoji placeholder. */
export function Picture({ word, size = 110 }: { word?: Pick<CachedWord, 'emoji' | 'imageUrl' | 'word'>; size?: number }) {
  if (!word) return null;
  if (word.imageUrl) {
    return <Image source={{ uri: word.imageUrl }} style={{ width: size, height: size, borderRadius: radius.sm }} resizeMode="contain" accessibilityLabel={word.word} />;
  }
  return <Text style={{ fontSize: size * 0.8, lineHeight: size * 1.05, color: colors.ink }} accessibilityLabel={word.word}>{word.emoji ?? '❓'}</Text>;
}

export function Stars({ count, size = 22 }: { count: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={`${count} sa 3 bituin`}>
      {[0, 1, 2].map((i) => (
        <Text key={i} style={{ fontSize: size, opacity: i < count ? 1 : 0.25, color: colors.ink }}>
          ⭐
        </Text>
      ))}
    </View>
  );
}

export function Loading({ label = 'Sandali lang...' }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.blue} />
      <Text style={s.loadingText}>{label}</Text>
    </View>
  );
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

const s = StyleSheet.create({
  big: {
    minHeight: 62,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    paddingHorizontal: 18,
  },
  pressed: { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
  bigLabel: { color: '#fff', fontSize: 21, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.ink2, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, flex: 1 },
});
