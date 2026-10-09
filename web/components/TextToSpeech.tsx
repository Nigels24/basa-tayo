'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { stopSpeaking, useSpeech } from '@/lib/tts';

/**
 * "Pakinggan (text-to-speech)" in the word form: reads the typed word the way
 * the phone does when there is no recording. Speech stops when the form closes.
 */
export function TtsPreview({ word, hasRecording }: { word: string; hasRecording: boolean }) {
  const { supported, speakingId, speak, stop } = useSpeech();
  const [mine, setMine] = useState(0);
  const speaking = mine !== 0 && speakingId === mine;

  useEffect(() => stopSpeaking, []); // the dialog closed

  return (
    <div className="mt-2 grid gap-1">
      {supported ? (
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          disabled={!word.trim()}
          title={!word.trim() ? 'I-type muna ang salita' : undefined}
          onClick={() => (speaking ? stop() : setMine(speak(word)))}
        >
          {speaking ? '⏹ Nagsasalita… (itigil)' : '🔊 Pakinggan (text-to-speech)'}
        </Button>
      ) : null}
      <p className="text-xs text-ink3">
        {hasRecording
          ? 'May recording — ito ang gagamitin ng app sa halip na text-to-speech.'
          : 'Walang recording — ito ang boses na gagamitin ng app (text-to-speech). Opsyonal ang pag-record.'}{' '}
        Maaaring bahagyang iba ang tunog sa phone.
      </p>
    </div>
  );
}

/** Small 🔊 for a Word Bank row without a recording; hidden where speech is not supported. */
export function SpeakButton({ text }: { text: string }) {
  const { supported, speakingId, speak, stop } = useSpeech();
  const [mine, setMine] = useState(0);
  const speaking = mine !== 0 && speakingId === mine;
  if (!supported) return null;

  return (
    <button
      type="button"
      className="grid h-6 w-6 place-items-center rounded-full border border-line text-[11px] text-ink2 hover:bg-ground"
      aria-label={speaking ? 'Itigil' : `Pakinggan ang ${text} (text-to-speech)`}
      title={speaking ? 'Itigil' : 'Pakinggan (text-to-speech)'}
      onClick={() => (speaking ? stop() : setMine(speak(text)))}
    >
      {speaking ? '⏹' : '🔊'}
    </button>
  );
}
