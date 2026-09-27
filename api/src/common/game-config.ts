/**
 * Game rules from the manuscript. The mobile app keeps a copy of this file
 * (mobile/src/lib/game-config.ts) — change both together.
 *
 * Table 1 — competency mapping
 * Table 2 — level specification
 */
import { GameType, Level } from '@prisma/client';

export const POINTS_PER_CORRECT = 10;

/** Table 2 note: 3 stars >= 90%, 2 stars 70–89%, 1 star 50–69%, else 0 */
export const STAR_THRESHOLDS = { three: 90, two: 70, one: 50 };

export interface LevelRule {
  id: Level;
  name: string;
  filipino: string;
  items: number;
  choices: number;
  /** -1 unlimited replays, 1 one replay, 0 plays once at the start */
  audioReplays: number;
  showModel: boolean;
  showFirstSyllable: boolean;
  distractorSyllable: boolean;
}

export const LEVELS: LevelRule[] = [
  { id: 'BEGINNER', name: 'Beginner', filipino: 'Baguhan', items: 5, choices: 3, audioReplays: -1, showModel: true, showFirstSyllable: false, distractorSyllable: false },
  { id: 'INTERMEDIATE', name: 'Intermediate', filipino: 'Katamtaman', items: 8, choices: 4, audioReplays: 1, showModel: false, showFirstSyllable: true, distractorSyllable: false },
  { id: 'ADVANCED', name: 'Advanced', filipino: 'Mahusay', items: 10, choices: 4, audioReplays: 0, showModel: false, showFirstSyllable: false, distractorSyllable: true },
];

export const GAMES: { id: GameType; name: string; english: string; skill: string }[] = [
  { id: 'TITIK', name: 'Pagbigkas ng Titik', english: 'Letter and Sound Game', skill: 'Letter identification and letter-sound correspondence' },
  { id: 'LARAWAN', name: 'Larawan at Salita', english: 'Picture and Word Game', skill: 'Word recognition and vocabulary' },
  { id: 'BUUIN', name: 'Buuin ang Salita', english: 'Word-Building Game', skill: 'Syllable segmentation and spelling' },
];

/** Marungko sequence — Beginner uses the first BEGINNER_LETTER_COUNT letters */
export const MARUNGKO = ['m', 's', 'a', 'i', 'o', 'b', 'e', 'u', 't', 'k', 'l', 'y', 'n', 'g', 'p', 'r', 'd', 'h', 'w'];
export const BEGINNER_LETTER_COUNT = 11;

const QUARTERS = ['I', 'II', 'III', 'IV'];

/** One entry per quarter: RL1<subdomain>-<quarter>-<number> */
const perQuarter = (subdomain: string, n: number, game: string, text: string) =>
  QUARTERS.map((q) => ({ code: `RL1${subdomain}-${q}-${n}`, game, text }));

/**
 * Table 1 — DepEd MATATAG Curriculum, Reading and Literacy, Grade 1.
 * RL1PA codes exist in Quarter 1 only; RL1PWS and RL1VWK exist in all four quarters.
 */
export const COMPETENCIES = [
  ...perQuarter('PWS', 2, 'TITIK', 'Identify the letters in L1.'),
  ...perQuarter('PWS', 1, 'TITIK', 'Produce the sound of the letters of L1.'),
  { code: 'RL1PA-I-5', game: 'TITIK', text: 'Identify initial sounds (vowels, consonants, and semi-vowels, if any).' },
  ...perQuarter('PWS', 3, 'TITIK', 'Isolate sounds (consonants and vowels) in a word (beginning and/or ending).'),
  ...perQuarter('VWK', 1, 'LARAWAN', 'Use vocabulary referring to oneself and family (Q I), school (Q II), community (Q III), environment (Q IV).'),
  ...perQuarter('VWK', 3, 'LARAWAN', 'Read high frequency words accurately for meaning.'),
  ...perQuarter('PWS', 5, 'LARAWAN', 'Sound out words accurately.'),
  { code: 'RL1PA-I-2', game: 'BUUIN', text: 'Segment a two-three syllable word into its syllabic parts.' },
  ...perQuarter('PWS', 4, 'BUUIN', 'Substitute individual sounds in simple words to make new words.'),
  ...perQuarter('VWK', 5, 'BUUIN', 'Write words legibly and correctly.'),
];

export interface BadgeRule {
  key: string;
  name: string;
  description: string;
  /** sessions>=N | perfect | stars>=N | allLevels:<GameType> | finished:<GameType>:<Level> */
  rule: string;
}

export const BADGES: BadgeRule[] = [
  { key: 'first', name: 'Unang Hakbang', description: 'Natapos ang unang laro', rule: 'sessions>=1' },
  { key: 'perfect', name: 'Perpekto!', description: 'Nakakuha ng 100% sa isang laro', rule: 'perfect' },
  { key: 'threestar', name: 'Tatlong Bituin', description: 'Nakakuha ng 3 bituin', rule: 'stars>=3' },
  { key: 'titik', name: 'Kampeon ng Titik', description: '3 bituin sa lahat ng antas ng Pagbigkas ng Titik', rule: 'allLevels:TITIK' },
  { key: 'diligent', name: 'Masipag', description: 'Naglaro ng 10 beses', rule: 'sessions>=10' },
  { key: 'builder', name: 'Batang Tagabuo', description: 'Natapos ang Advanced ng Buuin ang Salita', rule: 'finished:BUUIN:ADVANCED' },
];

export const levelRule = (level: Level): LevelRule => LEVELS.find((l) => l.id === level)!;
