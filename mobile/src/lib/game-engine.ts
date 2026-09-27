/**
 * Builds one round of items for any of the three mini-games, following the
 * level rules in Table 2. Ported from the prototype so the real app behaves
 * exactly like what the panel saw.
 */
import { BEGINNER_LETTER_COUNT, GameType, Level, MARUNGKO, levelRule } from './game-config';
import type { Bundle, CachedWord } from './db';

const DIGRAPH = 'ng';

export const firstLetter = (w: string) => (w.startsWith(DIGRAPH) ? DIGRAPH : w[0]);
export const lastLetter = (w: string) => (w.endsWith(DIGRAPH) ? DIGRAPH : w[w.length - 1]);
export const showLetter = (l: string) => (l === DIGRAPH ? 'Ng ng' : l.toUpperCase() + l);

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function letterPool(level: Level) {
  return level === 'BEGINNER' ? MARUNGKO.slice(0, BEGINNER_LETTER_COUNT) : [...MARUNGKO, DIGRAPH];
}

/** Rough "how similar" score, used to pick near-miss choices at Advanced. */
function closeness(a: string, b: string) {
  if (a === b) return 99;
  let d = Math.abs(a.length - b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d++;
  return d;
}

export interface Item {
  word: CachedWord;
  question: string;
  prompt: string; // stored with the answer, so reports can group items
  answer: string;
  choices?: string[];
  useLast?: boolean;
  // word-building
  syllables?: string[];
  given?: number; // how many syllables are filled in already
  tiles?: { s: string; k: number }[];
}

export function buildRound(bundle: Bundle, gameType: GameType, level: Level): Item[] {
  const lv = levelRule(level);
  const game = bundle.games.find((g) => g.gameType === gameType && g.level === level);
  const ids = new Set(game?.wordIds ?? []);
  const pool = bundle.words.filter((w) => ids.has(w.id));
  if (!pool.length) return [];

  let order: CachedWord[] = [];
  while (order.length < lv.items) order = order.concat(shuffle(pool));
  order = order.slice(0, lv.items);

  return order.map((w) => {
    if (gameType === 'TITIK') {
      const useLast = level === 'ADVANCED';
      const answer = useLast ? lastLetter(w.word) : firstLetter(w.word);
      const others = shuffle(letterPool(level).filter((l) => l !== answer)).slice(0, lv.choices - 1);
      return {
        word: w,
        answer,
        useLast,
        choices: shuffle([answer, ...others]),
        // Advanced asks for the ending sound (PA-4); say so, or "W — araw" reads as a wrong pairing.
        prompt: useLast ? `${w.word.slice(0, -answer.length)}${answer.toUpperCase()} (dulo)` : `${answer.toUpperCase()} — ${w.word}`,
        question: useLast ? 'Anong titik ang nasa DULO ng salita?' : 'Anong titik ang SIMULA ng salita?',
      };
    }

    if (gameType === 'LARAWAN') {
      let others = bundle.words.filter((x) => x.word !== w.word);
      others = level === 'ADVANCED'
        ? others.sort((a, b) => closeness(w.word, a.word) - closeness(w.word, b.word))
        : shuffle(others.filter((x) => x.level === level).concat(shuffle(others)));

      const seen = new Set([w.word]);
      const choices: string[] = [];
      for (const o of others) {
        if (!seen.has(o.word)) {
          seen.add(o.word);
          choices.push(o.word);
        }
        if (choices.length >= lv.choices - 1) break;
      }
      return {
        word: w,
        answer: w.word,
        choices: shuffle([w.word, ...choices]),
        prompt: w.word,
        question: 'Ano ang tawag dito? Piliin ang tamang salita.',
      };
    }

    // BUUIN — drag the syllables into place
    const syllables = w.syllables?.length ? w.syllables : [w.word];
    const given = lv.showFirstSyllable && syllables.length > 1 ? 1 : 0;
    const tiles = syllables.slice(given).map((s, i) => ({ s, k: i }));

    if (lv.distractorSyllable) {
      const extra = shuffle(bundle.words.flatMap((x) => x.syllables ?? []).filter((s) => !syllables.includes(s)))[0];
      if (extra) tiles.push({ s: extra, k: 99 });
    }

    return {
      word: w,
      answer: w.word,
      syllables,
      given,
      tiles: shuffle(tiles),
      prompt: w.word,
      question: 'Buuin ang salita gamit ang mga pantig.',
    };
  });
}
