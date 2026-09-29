/**
 * Sound. A word plays the teacher's recording when it has one — the copy
 * downloaded to the device, else the online file — otherwise the device reads
 * it aloud (Filipino voice when available). A recording that fails to play
 * falls back to reading aloud.
 */
import * as Speech from 'expo-speech';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { LETTER_SOUNDS } from './game-config';
import type { CachedWord } from './db';
import { media } from './media';

/** How long a recording may take to load before we read the word aloud instead (e.g. offline, not downloaded). */
const LOAD_TIMEOUT_MS = 4000;

let player: AudioPlayer | null = null;

function releasePlayer() {
  const p = player;
  player = null;
  if (!p) return;
  try {
    p.pause();
    p.remove();
  } catch {}
}

export const sound = {
  speak(text: string, rate = 0.85) {
    releasePlayer();
    Speech.stop();
    Speech.speak(text, { language: 'fil-PH', rate, pitch: 1.1 });
  },

  /**
   * Plays the word's recording, or `fallback` (default: read the word aloud)
   * when it has none or it can't play.
   */
  playWord(word: Pick<CachedWord, 'word' | 'audioUrl'>, fallback?: () => void) {
    if (!word) return;
    const readAloud = fallback ?? (() => sound.speak(word.word, 0.8));
    const uri = media.localUri(word.audioUrl) ?? word.audioUrl;
    if (!uri) return readAloud();

    sound.stop();
    let p: AudioPlayer;
    try {
      p = createAudioPlayer({ uri });
    } catch {
      return readAloud();
    }
    player = p;

    // Falls back once, and only if this is still the current sound.
    let settled = false;
    const giveUp = () => {
      if (settled || player !== p) return;
      settled = true;
      releasePlayer();
      readAloud();
    };
    const timer = setTimeout(() => !p.isLoaded && giveUp(), LOAD_TIMEOUT_MS);
    p.addListener('playbackStatusUpdate', (status) => {
      if (status.error) {
        clearTimeout(timer);
        giveUp();
      } else if (status.isLoaded) {
        clearTimeout(timer);
        settled = true;
        if (status.didJustFinish && player === p) releasePlayer();
      }
    });
    try {
      p.play();
    } catch {
      clearTimeout(timer);
      giveUp();
    }
  },

  playLetter(letter: string) {
    sound.speak(LETTER_SOUNDS[letter.toLowerCase()] ?? letter, 0.7);
  },

  stop() {
    releasePlayer();
    Speech.stop();
  },
};
