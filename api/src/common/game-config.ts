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

/** Table 1 — replace the codes with the official MATATAG curriculum guide codes */
export const COMPETENCIES = [
  { code: 'PA-1', game: 'TITIK', text: 'Identify the letters in L1' },
  { code: 'PA-2', game: 'TITIK', text: 'Produce the sound of the letters in L1' },
  { code: 'PA-3', game: 'TITIK', text: 'Identify initial sounds (vowels, consonants, semi-vowels)' },
  { code: 'PA-4', game: 'TITIK', text: 'Isolate sounds in a word (beginning and ending)' },
  { code: 'VW-1', game: 'LARAWAN', text: 'Use vocabulary referring to oneself, family, school, community, environment' },
  { code: 'VW-2', game: 'LARAWAN', text: 'Read high-frequency words accurately for meaning' },
  { code: 'PW-1', game: 'LARAWAN', text: 'Sound out words accurately' },
  { code: 'PA-5', game: 'BUUIN', text: 'Segment a two- to three-syllable word into its syllabic parts' },
  { code: 'PA-6', game: 'BUUIN', text: 'Substitute individual sounds in simple words to make new words' },
  { code: 'CC-1', game: 'BUUIN', text: 'Write words legibly and correctly' },
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
