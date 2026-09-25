/**
 * Copy of api/src/common/game-config.ts — the app needs the same rules offline.
 * If you change a rule, change it in both files.
 */
export type GameType = 'TITIK' | 'LARAWAN' | 'BUUIN';
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export const POINTS_PER_CORRECT = 10;
export const STAR_THRESHOLDS = { three: 90, two: 70, one: 50 };

export interface LevelRule {
  id: Level;
  name: string;
  filipino: string;
  items: number;
  choices: number;
  audioReplays: number; // -1 unlimited, 1 one replay, 0 plays once
  showModel: boolean;
  showFirstSyllable: boolean;
  distractorSyllable: boolean;
}

export const LEVELS: LevelRule[] = [
  { id: 'BEGINNER', name: 'Beginner', filipino: 'Baguhan', items: 5, choices: 3, audioReplays: -1, showModel: true, showFirstSyllable: false, distractorSyllable: false },
  { id: 'INTERMEDIATE', name: 'Intermediate', filipino: 'Katamtaman', items: 8, choices: 4, audioReplays: 1, showModel: false, showFirstSyllable: true, distractorSyllable: false },
  { id: 'ADVANCED', name: 'Advanced', filipino: 'Mahusay', items: 10, choices: 4, audioReplays: 0, showModel: false, showFirstSyllable: false, distractorSyllable: true },
];

export const GAMES: { id: GameType; name: string; english: string; color: string; art: string }[] = [
  { id: 'TITIK', name: 'Pagbigkas ng Titik', english: 'Letter and Sound', color: '#e4572e', art: 'Mm' },
  { id: 'LARAWAN', name: 'Larawan at Salita', english: 'Picture and Word', color: '#2e86de', art: '🐈' },
  { id: 'BUUIN', name: 'Buuin ang Salita', english: 'Word Building', color: '#3ba55c', art: 'ba·ta' },
];

export const MARUNGKO = ['m', 's', 'a', 'i', 'o', 'b', 'e', 'u', 't', 'k', 'l', 'y', 'n', 'g', 'p', 'r', 'd', 'h', 'w'];
export const BEGINNER_LETTER_COUNT = 11;

export const LETTER_SOUNDS: Record<string, string> = {
  m: 'mmm', s: 'sss', a: 'a', i: 'i', o: 'o', b: 'ba', e: 'e', u: 'u', t: 'ta', k: 'ka',
  l: 'la', y: 'ya', n: 'na', g: 'ga', p: 'pa', r: 'ra', d: 'da', h: 'ha', w: 'wa', ng: 'nga',
};

export const TEXT = {
  hello: 'Kumusta',
  chooseGame: 'Pumili ng laro',
  chooseLevel: 'Pumili ng antas',
  listen: 'Pakinggan',
  start: 'Simulan ang laro',
  correct: ['Magaling!', 'Tama!', 'Ang galing mo!', 'Mahusay!'],
  wrong: 'Ito ang tamang sagot',
  next: 'Susunod',
  finish: 'Tapos na!',
  playAgain: 'Maglaro muli',
  backHome: 'Bumalik',
  newBest: 'Bagong pinakamataas na iskor!',
  rewards: 'Aking Gantimpala',
  enterCode: 'Ilagay ang iyong code',
  wrongCode: 'Mali ang code. Subukan muli.',
  lesson: 'Aralin',
  offline: 'Offline — ise-save muna sa tablet',
  synced: 'Na-sync sa guro',
};

export const levelRule = (level: Level) => LEVELS.find((l) => l.id === level)!;
export const gameInfo = (game: GameType) => GAMES.find((g) => g.id === game)!;

export function starsOf(accuracy: number) {
  if (accuracy >= STAR_THRESHOLDS.three) return 3;
  if (accuracy >= STAR_THRESHOLDS.two) return 2;
  if (accuracy >= STAR_THRESHOLDS.one) return 1;
  return 0;
}
