/**
 * Sound. A word plays the teacher's uploaded recording when it has one,
 * otherwise the device reads it aloud (Filipino voice when available).
 */
import * as Speech from 'expo-speech';
import { LETTER_SOUNDS } from './game-config';
import type { CachedWord } from './db';

export const sound = {
  speak(text: string, rate = 0.85) {
    Speech.stop();
    Speech.speak(text, { language: 'fil-PH', rate, pitch: 1.1 });
  },

  async playWord(word: Pick<CachedWord, 'word' | 'audioUrl'>) {
    if (!word) return;
    if (word.audioUrl) {
      try {
        // expo-audio: create a player for the Cloudinary URL and play once
        const { createAudioPlayer } = await import('expo-audio');
        const player = createAudioPlayer({ uri: word.audioUrl });
        player.play();
        return;
      } catch {
        // falls through to text-to-speech
      }
    }
    sound.speak(word.word, 0.8);
  },

  playLetter(letter: string) {
    sound.speak(LETTER_SOUNDS[letter.toLowerCase()] ?? letter, 0.7);
  },

  stop() {
    Speech.stop();
  },
};
