/**
 * Pictures and recordings kept on the device, so a word shows its picture and
 * plays its recording with no internet.
 *
 * After each successful content download the files are fetched in the
 * background into <documents>/media. The URL → file name map lives in the
 * SQLite cache (kv key 'media'); names, not full paths, because the app's
 * folder path can change between installs. A failed download is simply
 * tried again on the next refresh.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { kv, type Bundle } from './db';

type MediaIndex = Record<string, string>; // remote URL → file name in DIR

const KEY = 'media';
let dir: Directory | null = null;
let index: MediaIndex = {};
let syncing = false;

function mediaDir() {
  if (!dir) dir = new Directory(Paths.document, 'media');
  return dir;
}

/** Stable file name for a URL: a hash plus the URL's extension (.mp3, .jpg, …). */
function fileName(url: string) {
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const ext = url.split('?')[0].match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() ?? 'bin';
  return `${(h >>> 0).toString(16)}-${url.length}.${ext}`;
}

function bundleUrls(bundle: Bundle) {
  const urls = new Set<string>();
  for (const w of bundle.words) {
    if (w.imageUrl) urls.add(w.imageUrl);
    if (w.audioUrl) urls.add(w.audioUrl);
  }
  return urls;
}

export const media = {
  /** Reads the saved map into memory. Called on every refresh, online or not. */
  async load() {
    try {
      index = (await kv.get<MediaIndex>(KEY)) ?? {};
    } catch {
      index = {};
    }
  },

  /** The downloaded copy of `url`, or null when it isn't on the device. */
  localUri(url?: string | null): string | null {
    if (!url) return null;
    const name = index[url];
    if (!name) return null;
    try {
      const f = new File(mediaDir(), name);
      return f.exists ? f.uri : null;
    } catch {
      return null;
    }
  },

  /**
   * Downloads what's missing and deletes what the bundle no longer uses.
   * Never throws and is never awaited by the UI; one run at a time.
   */
  async sync(bundle: Bundle) {
    if (syncing) return;
    syncing = true;
    try {
      const d = mediaDir();
      if (!d.exists) d.create({ intermediates: true, idempotent: true });
      const wanted = bundleUrls(bundle);
      const next: MediaIndex = {};

      // Keep what is already downloaded and still used.
      for (const [url, name] of Object.entries(index)) {
        if (wanted.has(url) && new File(d, name).exists) next[url] = name;
      }

      // Delete files for words that were removed or changed, and leftovers of interrupted downloads.
      const keep = new Set(Object.values(next));
      for (const entry of d.list()) {
        if (entry instanceof File && !keep.has(entry.name)) {
          try {
            entry.delete();
          } catch {}
        }
      }
      index = next;
      await kv.put(KEY, index);

      for (const url of wanted) {
        if (index[url]) continue;
        const name = fileName(url);
        try {
          await File.downloadFileAsync(url, new File(d, name), { idempotent: true });
          index = { ...index, [url]: name };
          await kv.put(KEY, index); // saved after each file, so progress survives the app closing
        } catch {
          try {
            const partial = new File(d, name);
            if (partial.exists) partial.delete();
          } catch {}
          // offline or a bad link: tried again on the next refresh
        }
      }
    } catch {
      // storage trouble: the app keeps using remote URLs and emoji/TTS
    } finally {
      syncing = false;
    }
  },
};
