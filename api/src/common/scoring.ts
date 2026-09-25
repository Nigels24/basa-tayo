import { POINTS_PER_CORRECT, STAR_THRESHOLDS } from './game-config';

export function accuracyOf(correct: number, total: number): number {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

export function starsOf(accuracy: number): number {
  if (accuracy >= STAR_THRESHOLDS.three) return 3;
  if (accuracy >= STAR_THRESHOLDS.two) return 2;
  if (accuracy >= STAR_THRESHOLDS.one) return 1;
  return 0;
}

export function pointsOf(correct: number): number {
  return correct * POINTS_PER_CORRECT;
}
