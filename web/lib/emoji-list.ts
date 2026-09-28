// Picture choices for Grade 1 nouns, with English and Filipino search words
// (the first word is the name shown on hover). Mostly older emoji that every
// Android tablet shows; the newer ones (🦷 🧹 Android 9+, 🧊 Android 10+,
// 🪨 🪴 🪟 Android 11+) can show as a blank box on old devices — upload an
// image URL for those if needed.

export type PickEmoji = { emoji: string; name: string };

const e = (emoji: string, ...words: string[]) => ({ emoji, words });

export const EMOJI_GROUPS: { name: string; emoji: { emoji: string; words: string[] }[] }[] = [
  {
    name: 'Animals',
    emoji: [
      e('🐕', 'dog', 'aso', 'puppy', 'tuta'),
      e('🐈', 'cat', 'pusa'),
      e('🐟', 'fish', 'isda'),
      e('🐓', 'rooster', 'chicken', 'manok', 'tandang'),
      e('🦆', 'duck', 'pato', 'bibe'),
      e('🐻', 'bear', 'oso'),
      e('🐘', 'elephant', 'elepante'),
      e('🐃', 'carabao', 'water buffalo', 'kalabaw'),
      e('🐎', 'horse', 'kabayo'),
      e('🐖', 'pig', 'baboy'),
      e('🐐', 'goat', 'kambing'),
      e('🐸', 'frog', 'palaka'),
    ],
  },
  {
    name: 'Food',
    emoji: [
      e('🍌', 'banana', 'saging'),
      e('🍅', 'tomato', 'kamatis'),
      e('🌽', 'corn', 'mais'),
      e('🍇', 'grapes', 'ubas'),
      e('🍎', 'apple', 'mansanas'),
      e('🍍', 'pineapple', 'pinya'),
      e('🥚', 'egg', 'itlog'),
      e('🍚', 'rice', 'kanin', 'bigas'),
      e('🥛', 'milk', 'gatas'),
      e('☕', 'coffee', 'cup', 'kape', 'tasa'),
    ],
  },
  {
    name: 'Home and school',
    emoji: [
      e('🏠', 'house', 'home', 'bahay'),
      e('🏫', 'school', 'paaralan', 'eskuwela'),
      e('🚪', 'door', 'pinto'),
      e('🪟', 'window', 'bintana'),
      e('🛏️', 'bed', 'kama'),
      e('🔑', 'key', 'susi'),
      e('🧹', 'broom', 'walis'),
      e('⌚', 'watch', 'relo'),
      e('☂️', 'umbrella', 'payong'),
      e('👟', 'shoe', 'sneaker', 'sapatos'),
      e('📕', 'book', 'aklat', 'libro'),
      e('📄', 'paper', 'papel'),
      e('✏️', 'pencil', 'lapis'),
      e('✂️', 'scissors', 'gunting'),
      e('⚽', 'ball', 'soccer', 'bola'),
      e('🎈', 'balloon', 'lobo'),
    ],
  },
  {
    name: 'People and body',
    emoji: [
      e('👨', 'man', 'father', 'lalaki', 'tatay', 'ama'),
      e('👩', 'woman', 'mother', 'babae', 'nanay', 'ina'),
      e('🧒', 'child', 'kid', 'bata'),
      e('👩‍🏫', 'teacher', 'guro'),
      e('👁️', 'eye', 'mata'),
      e('👃', 'nose', 'ilong'),
      e('👂', 'ear', 'tainga', 'tenga'),
      e('👄', 'mouth', 'lips', 'bibig', 'labi'),
      e('✋', 'hand', 'kamay'),
      e('🦷', 'tooth', 'teeth', 'ngipin'),
    ],
  },
  {
    name: 'Nature',
    emoji: [
      e('🌳', 'tree', 'puno'),
      e('🌸', 'flower', 'bulaklak'),
      e('🪴', 'plant', 'halaman'),
      e('🍃', 'leaf', 'leaves', 'dahon'),
      e('☀️', 'sun', 'araw'),
      e('🌙', 'moon', 'buwan'),
      e('⭐', 'star', 'bituin'),
      e('☁️', 'cloud', 'ulap'),
      e('🌧️', 'rain', 'ulan'),
      e('💧', 'water', 'drop', 'tubig', 'patak'),
      e('🪨', 'rock', 'stone', 'bato'),
      e('🧊', 'ice', 'yelo'),
    ],
  },
];

export const GRID_EMOJI = new Set(EMOJI_GROUPS.flatMap((g) => g.emoji.map((x) => x.emoji)));

/** Trimmed and lower-case, as typed in the picture search. */
export const emojiNeedle = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ');

/** True when the needle starts any of the words, or any word inside them ("buffalo" finds "water buffalo"). */
const startsAny = (words: string[], needle: string) =>
  words.some((w) => {
    const lw = w.toLowerCase();
    return lw.startsWith(needle) || lw.split(/[\s:-]+/).some((part) => part.startsWith(needle));
  });

/** Curated pictures matching the search, keeping their groups; groups with no match are left out. */
export function searchCurated(needle: string) {
  return EMOJI_GROUPS.map((g) => ({
    name: g.name,
    emoji: startsAny([g.name], needle) ? g.emoji : g.emoji.filter((x) => startsAny(x.words, needle)),
  })).filter((g) => g.emoji.length > 0);
}

/** Variation selectors aside, so "☂️" and "☂" count as the same picture. */
const bare = (s: string) => s.replace(/️/g, '');
const CURATED_BARE = new Set([...GRID_EMOJI].map(bare));

type MoreEmoji = PickEmoji & { tags: string[] };
let more: Promise<MoreEmoji[]> | null = null;

/**
 * The full emoji list, loaded on first use so it stays out of the page bundle.
 * Only Emoji 11.0 and older (what Android 9 shows), base emoji only (skin
 * tones sit under `skins`, which is never read), without the components
 * (regional letters, skin-tone swatches, hair) and without the curated ones.
 */
export function loadMoreEmoji(): Promise<MoreEmoji[]> {
  more ??= import('emojibase-data/en/data.json')
    .then((m) =>
      (m.default as { emoji: string; label: string; tags?: string[]; version: number; group?: number }[])
        .filter((x) => x.version <= 11 && x.group !== undefined && x.group !== 2 && !CURATED_BARE.has(bare(x.emoji)))
        .map((x) => ({ emoji: x.emoji, name: x.label, tags: x.tags ?? [] })),
    )
    .catch((err) => {
      more = null; // let the next search try again
      throw err;
    });
  return more;
}

/** Up to `limit` matches from the full list; a name match ranks above a tag-only match. */
export function searchMore(list: MoreEmoji[], needle: string, limit = 40): PickEmoji[] {
  const byName: PickEmoji[] = [];
  const byTag: PickEmoji[] = [];
  for (const x of list) {
    if (startsAny([x.name], needle)) byName.push(x);
    else if (startsAny(x.tags, needle)) byTag.push(x);
    if (byName.length >= limit) break;
  }
  return [...byName, ...byTag].slice(0, limit).map(({ emoji, name }) => ({ emoji, name }));
}
