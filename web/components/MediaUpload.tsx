'use client';

/**
 * Picture and pronunciation uploads for the Word Bank form. Files go straight
 * from the browser to Cloudinary with a one-time signature from the API, so
 * the Cloudinary secret never reaches the browser. Removing only clears the
 * word's link; the file stays in Cloudinary.
 */
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { toastError } from '@/components/ui/toast';

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SECONDS = 5;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/webm', 'audio/ogg'];

type Upload = { abort: () => void; done: Promise<string> };

/** Uploads one file to Cloudinary with XHR (fetch has no upload progress). Resolves with secure_url. */
function uploadToCloudinary(file: Blob, kind: 'image' | 'audio', onProgress: (pct: number) => void): Upload {
  let xhr: XMLHttpRequest | null = null;
  let aborted = false;
  const done = api.mediaSignature(kind).then(
    (sig: { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; resourceType: string }) =>
      new Promise<string>((resolve, reject) => {
        if (aborted) return reject(new DOMException('Aborted', 'AbortError'));
        const data = new FormData();
        data.append('file', file);
        data.append('api_key', sig.apiKey);
        data.append('timestamp', String(sig.timestamp));
        data.append('signature', sig.signature);
        data.append('folder', sig.folder);
        xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`);
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
          let body: any = null;
          try {
            body = JSON.parse(xhr!.responseText);
          } catch {}
          if (xhr!.status >= 200 && xhr!.status < 300 && body?.secure_url) resolve(body.secure_url);
          else reject(new ApiError(body?.error?.message ? `Hindi na-upload: ${body.error.message}` : 'Hindi na-upload ang file. Subukan muli.', xhr!.status));
        };
        xhr.onerror = () => reject(new ApiError('Hindi na-upload ang file. Tingnan ang internet at subukan muli.', 0));
        xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
        xhr.send(data);
      }),
  );
  return {
    abort: () => {
      aborted = true;
      xhr?.abort();
    },
    done,
  };
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/** Resized, auto-format delivery URL: .../image/upload/f_auto,q_auto,w_512/v123/...jpg */
export const imageDeliveryUrl = (secureUrl: string) => secureUrl.replace('/upload/', '/upload/f_auto,q_auto,w_512/');

/** MP3 delivery URL (Cloudinary converts on request) so every Android phone can play it. */
export const audioDeliveryUrl = (secureUrl: string) =>
  /\.[a-z0-9]+$/i.test(secureUrl) ? secureUrl.replace(/\.[a-z0-9]+$/i, '.mp3') : `${secureUrl}.mp3`;

/** Length of an audio file in seconds, or null when the browser can't tell (e.g. an ogg in Safari). */
function audioDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio();
    const finish = (d: number | null) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    a.preload = 'metadata';
    a.onloadedmetadata = () => finish(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => finish(null);
    a.src = url;
  });
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Upload progress">
      <div className="h-2 overflow-hidden rounded-full bg-ground">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink3">Ina-upload… {pct}%</p>
    </div>
  );
}

/** Runs one upload at a time; aborts it if the form closes. */
function useUpload(kind: 'image' | 'audio', onBusyChange: (busy: boolean) => void) {
  const [progress, setProgress] = useState<number | null>(null);
  const current = useRef<Upload | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  async function start(file: Blob): Promise<string | null> {
    current.current?.abort();
    const up = uploadToCloudinary(file, kind, setProgress);
    current.current = up;
    setProgress(0);
    onBusyChange(true);
    try {
      return await up.done;
    } catch (e) {
      if (!isAbort(e)) toastError(e);
      return null;
    } finally {
      if (current.current === up) {
        current.current = null;
        setProgress(null);
        onBusyChange(false);
      }
    }
  }

  return { progress, start };
}

export function PictureUpload({ value, onChange, onBusyChange }: { value: string; onChange: (url: string) => void; onBusyChange: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const { progress, start } = useUpload('image', onBusyChange);

  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError('');
    if (!IMAGE_TYPES.includes(file.type)) return setError('PNG, JPG o WebP lang ang puwedeng larawan.');
    if (file.size > MAX_BYTES) return setError('Masyadong malaki ang larawan (hanggang 2 MB lang).');
    setLocalPreview(URL.createObjectURL(file));
    const url = await start(file);
    setLocalPreview(null);
    if (url) onChange(imageDeliveryUrl(url));
  }

  const shown = localPreview ?? value;
  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = ''; // picking the same file again still fires
        }}
      />
      <div className="flex items-center gap-3">
        {shown ? (
          <img src={shown} alt="Larawan ng salita" className={`h-20 w-20 shrink-0 rounded-lg border border-line object-cover ${progress !== null ? 'opacity-60' : ''}`} />
        ) : (
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-line text-xs text-ink3">Walang larawan</span>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={progress !== null} onClick={() => input.current?.click()}>
            {value ? 'Palitan' : 'Mag-upload ng larawan'}
          </Button>
          {value && progress === null ? (
            <Button type="button" variant="ghost" onClick={() => onChange('')}>Alisin</Button>
          ) : null}
        </div>
      </div>
      {progress !== null ? <ProgressBar pct={progress} /> : null}
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
      <p className="mt-1 text-xs text-ink3">PNG, JPG o WebP, hanggang 2 MB.</p>
    </div>
  );
}

type Take = { blob: Blob; url: string };

export function AudioUpload({ value, onChange, onBusyChange }: { value: string; onChange: (url: string) => void; onBusyChange: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState<Take | null>(null); // a finished recording waiting to be accepted
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { progress, start } = useUpload('audio', onBusyChange);
  const busy = progress !== null;

  const stopTracks = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  // Closing the form mid-recording releases the microphone.
  useEffect(() => () => {
    if (recorder.current && recorder.current.state !== 'inactive') {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    stopTracks();
  }, []);

  useEffect(() => () => {
    if (take) URL.revokeObjectURL(take.url);
  }, [take]);

  async function upload(blob: Blob) {
    const url = await start(blob);
    if (url) {
      onChange(audioDeliveryUrl(url));
      setTake(null);
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError('');
    if (!AUDIO_TYPES.includes(file.type)) return setError('MP3, M4A, WAV, WebM o OGG lang ang puwedeng audio.');
    if (file.size > MAX_BYTES) return setError('Masyadong malaki ang audio (hanggang 2 MB lang).');
    const seconds = await audioDuration(file);
    if (seconds !== null && seconds > MAX_SECONDS + 0.3) return setError(`Masyadong mahaba ang audio (${seconds.toFixed(1)} s). Hanggang 5 segundo lang.`);
    setTake(null);
    upload(file);
  }

  async function record() {
    setError('');
    setTake(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      return setError('Hindi makapag-record sa browser na ito. Mag-upload na lang ng audio file.');
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: any) {
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
        setError('Hindi pinayagan ang mikropono. Payagan ito sa settings ng browser (ang icon sa address bar), saka subukan muli.');
      } else if (e?.name === 'NotFoundError') {
        setError('Walang nakitang mikropono sa computer na ito.');
      } else {
        setError('Hindi mabuksan ang mikropono. Subukan muli.');
      }
      return;
    }
    const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.onstop = () => {
      stopTracks();
      setRecording(false);
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' });
      if (blob.size === 0) return setError('Walang nai-record. Subukan muli.');
      if (blob.size > MAX_BYTES) return setError('Masyadong malaki ang recording (hanggang 2 MB lang).');
      setTake({ blob, url: URL.createObjectURL(blob) });
    };
    recorder.current = rec;
    const began = Date.now();
    setElapsed(0);
    setRecording(true);
    rec.start();
    timer.current = setInterval(() => {
      const s = (Date.now() - began) / 1000;
      setElapsed(Math.min(s, MAX_SECONDS));
      if (s >= MAX_SECONDS && rec.state === 'recording') rec.stop(); // auto-stop at 5 s
    }, 100);
  }

  const stopRecording = () => recorder.current?.state === 'recording' && recorder.current.stop();

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={AUDIO_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {value && !take && !recording ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <audio controls src={value} className="h-9 max-w-full" preload="none" />
          {!busy ? <Button type="button" variant="ghost" onClick={() => onChange('')}>Alisin</Button> : null}
        </div>
      ) : null}

      {recording ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-600" aria-live="polite">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
            Nagre-record… {elapsed.toFixed(1)} / {MAX_SECONDS}.0 s
          </span>
          <Button type="button" variant="secondary" onClick={stopRecording}>Ihinto</Button>
        </div>
      ) : take ? (
        <div className="grid gap-2 rounded-lg border border-line p-3">
          <p className="text-xs font-semibold text-ink2">Bagong recording — pakinggan muna bago gamitin.</p>
          <audio controls src={take.url} className="h-9 max-w-full" aria-label="Pakinggan" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => upload(take.blob)}>Gamitin ito</Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={record}>Ulitin</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setTake(null)}>Kanselahin</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={record}>🎙 Mag-record</Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
            {value ? 'Palitan ng file' : 'Mag-upload ng audio'}
          </Button>
        </div>
      )}

      {busy ? <ProgressBar pct={progress} /> : null}
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
      <p className="mt-1 text-xs text-ink3">Hanggang 5 segundo at 2 MB. Kapag wala, babasahin ng device ang salita (text-to-speech).</p>
    </div>
  );
}

/** Small play button for the Word Bank table; one recording plays at a time. */
let playing: HTMLAudioElement | null = null;
export function PlayButton({ url, label }: { url: string; label: string }) {
  return (
    <button
      type="button"
      className="grid h-6 w-6 place-items-center rounded-full border border-line text-[10px] text-ink2 hover:bg-ground"
      aria-label={`Pakinggan ang ${label}`}
      title="Pakinggan"
      onClick={() => {
        playing?.pause();
        playing = new Audio(url);
        playing.play().catch(() => toastError(new ApiError('Hindi ma-play ang recording.', 0)));
      }}
    >
      ▶
    </button>
  );
}
