import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BADGES, GAMES, LEVELS } from '../common/game-config';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Everything the pupil app needs to play offline: lessons, words and the
   * game→word assignment. The app writes this into its SQLite cache.
   */
  async bundle() {
    const [games, words, lessons] = await Promise.all([
      this.prisma.game.findMany({
        include: { gameWords: { select: { wordId: true } }, lesson: true },
        orderBy: [{ gameType: 'asc' }, { level: 'asc' }],
      }),
      this.prisma.word.findMany({ where: { active: true }, orderBy: { filipinoWord: 'asc' } }),
      this.prisma.lesson.findMany({ orderBy: { updatedAt: 'desc' } }),
    ]);

    return {
      version: new Date().toISOString(),
      config: { games: GAMES, levels: LEVELS, badges: BADGES },
      games: games.map((g) => ({
        id: g.id,
        gameType: g.gameType,
        level: g.level,
        lessonId: g.lessonId,
        wordIds: g.gameWords.map((gw) => gw.wordId),
      })),
      lessons,
      words: words.map((w) => ({
        id: w.id,
        word: w.filipinoWord,
        syllables: w.syllables,
        theme: w.theme,
        level: w.level,
        emoji: w.emoji,
        imageUrl: w.imageUrl,
        audioUrl: w.audioUrl,
      })),
    };
  }

  /** The pupil's own stars, highest scores and badges. */
  async progress(pupilId: number) {
    const [scores, badges] = await Promise.all([
      this.prisma.score.findMany({ where: { pupilId }, include: { game: true } }),
      this.prisma.badge.findMany({ where: { pupilId } }),
    ]);
    return {
      scores: scores.map((s) => ({
        gameType: s.game.gameType,
        level: s.level,
        highestScore: s.highestScore,
        accuracy: s.accuracy,
        stars: s.stars,
      })),
      badges: badges.map((b) => ({ key: b.badgeKey, name: b.name, earnedAt: b.earnedAt })),
    };
  }
}
