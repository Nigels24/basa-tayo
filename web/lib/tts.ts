'use client';

import { useEffect, useState } from 'react';

/**
 * Text-to-speech preview with the browser's Web Speech API, set up like the
 * phone app (mobile/src/lib/audio.ts: fil-PH, rate 0.85, pitch 1.1) so the
 * teacher hears roughly what a pupil hears when a word has no recording.
 */

const RATE = 0.85; // a little slower, for Grade 1
const PITCH = 1.1;

let voices: SpeechSynthesisVoice[] = [];
let current = 0; // id of the latest speak(); older callbacks are ignored
const listeners = new Set<() => void>();

export function ttsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** A Filipino / Tagalog voice (fil-PH, tl-PH, fil_PH …) if the device has one. */
function filipinoVoice() {
  if (!voices.length) voices = window.speechSynthesis.getVoices();
  return voices.find((v) => /^(fil|tl)([-_]|$)/i.test(v.lang));
}

function notify() {
  listeners.forEach((l) => l());
}

/** Speak text, stopping anything already speaking. Returns an id for isSpeaking(). */
export function speak(text: string) {
  if (!ttsSupported() || !text.trim()) return 0;
  const synth = window.speechSynthesis;
  synth.cancel();

  const id = ++current;
  const u = new SpeechSynthesisUtterance(text.trim());
  const voice = filipinoVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'fil-PH'; // no Filipino voice: the browser picks the closest one
  u.rate = RATE;
  u.pitch = PITCH;
  const done = () => {
    if (current === id) {
      current = 0;
      notify();
    }
  };
  u.onend = done;
  u.onerror = done;
  synth.speak(u);
  notify();
  return id;
}

export function stopSpeaking() {
  if (!ttsSupported()) return;
  current = 0;
  window.speechSynthesis.cancel();
  notify();
}

/**
 * { supported, speakingId, speak, stop } for a component. supported is false
 * on the server and in browsers without speechSynthesis, so the button can be
 * hidden. Voices load asynchronously, so the list is refreshed on voiceschanged.
 */
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speakingId, setSpeakingId] = useState(0);

  useEffect(() => {
    if (!ttsSupported()) return;
    setSupported(true);
    const synth = window.speechSynthesis;
    const refreshVoices = () => {
      voices = synth.getVoices();
    };
    refreshVoices();
    synth.addEventListener('voiceschanged', refreshVoices);
    const onChange = () => setSpeakingId(current);
    listeners.add(onChange);
    return () => {
      synth.removeEventListener('voiceschanged', refreshVoices);
      listeners.delete(onChange);
    };
  }, []);

  return { supported, speakingId, speak, stop: stopSpeaking };
}
