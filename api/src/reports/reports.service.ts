import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /** Dashboard figures for the teacher's own class. */
  async summary(teacherId: number) {
    const pupils = await this.prisma.user.findMany({ where: { role: 'PUPIL', teacherId }, select: { id: true } });
    const ids = pupils.map((p) => p.id);
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const [wordCount, sessions, weekCount] = await Promise.all([
      this.prisma.word.count({ where: { active: true } }),
      this.prisma.gameSession.findMany({ where: { pupilId: { in: ids } }, select: { accuracy: true } }),
      this.prisma.gameSession.count({ where: { pupilId: { in: ids }, playedAt: { gte: weekAgo } } }),
    ]);

    const avgAccuracy = sessions.length
      ? Math.round(sessions.reduce((a, s) => a + s.accuracy, 0) / sessions.length)
      : 0;

    return { pupils: ids.length, words: wordCount, roundsThisWeek: weekCount, totalRounds: sessions.length, avgAccuracy };
  }

  /** Highest score per pupil, mini-game and level — the class matrix. */
  async classScores(teacherId: number) {
    const pupils = await this.prisma.user.findMany({
      where: { role: 'PUPIL', teacherId, active: true },
      include: {
        scores: { include: { game: { select: { gameType: true } } } },
        _count: { select: { sessions: true } },
      },
      orderBy: { name: 'asc' },
    });

    return pupils.map((p) => ({
      id: p.id,
      name: p.name,
      rounds: p._count.sessions,
      scores: p.scores.map((s) => ({
        gameType: s.game.gameType,
        level: s.level,
        highestScore: s.highestScore,
        stars: s.stars,
      })),
    }));
  }

  /** One pupil: rounds, accuracy, stars, badges and round history. */
  async pupil(teacherId: number, pupilId: number) {
    const pupil = await this.prisma.user.findFirst({
      where: { id: pupilId, teacherId, role: 'PUPIL' },
      include: {
        badges: true,
        scores: { include: { game: { select: { gameType: true } } } },
        sessions: { include: { game: { select: { gameType: true } } }, orderBy: { playedAt: 'desc' }, take: 50 },
      },
    });
    if (!pupil) return null;

    const avgAccuracy = pupil.sessions.length
      ? Math.round(pupil.sessions.reduce((a, s) => a + s.accuracy, 0) / pupil.sessions.length)
      : 0;

    return {
      id: pupil.id,
      name: pupil.name,
      section: pupil.section,
      loginCode: pupil.loginCode,
      avgAccuracy,
      stars: pupil.scores.reduce((a, s) => a + s.stars, 0),
      badges: pupil.badges.map((b) => ({ key: b.badgeKey, name: b.name, earnedAt: b.earnedAt })),
      scores: pupil.scores.map((s) => ({ gameType: s.game.gameType, level: s.level, highestScore: s.highestScore, stars: s.stars })),
      history: pupil.sessions.map((s) => ({
        id: s.id,
        gameType: s.game.gameType,
        level: s.level,
        correct: s.correctCount,
        items: s.itemCount,
        accuracy: s.accuracy,
        stars: s.stars,
        score: s.score,
        playedAt: s.playedAt,
      })),
      missed: await this.missedItems(teacherId, pupilId),
    };
  }

  /**
   * Items most frequently answered incorrectly — the report the manuscript
   * promises. This is what the session_answers table exists for.
   */
  async missedItems(teacherId: number, pupilId?: number, limit = 10) {
    const pupils = await this.prisma.user.findMany({ where: { role: 'PUPIL', teacherId }, select: { id: true } });
    const ids = pupilId ? [pupilId] : pupils.map((p) => p.id);

    const answers = await this.prisma.sessionAnswer.findMany({
      where: { pupilId: { in: ids } },
      select: { prompt: true, isCorrect: true, word: { select: { filipinoWord: true, emoji: true, imageUrl: true } }, session: { select: { game: { select: { gameType: true } } } } },
    });

    const tally = new Map<string, { prompt: string; gameType: string; word?: string; emoji?: string; imageUrl?: string; wrong: number; total: number }>();
    for (const a of answers) {
      const gameType = a.session.game.gameType;
      const key = `${gameType}|${a.prompt}`;
      const row = tally.get(key) ?? {
        prompt: a.prompt,
        gameType,
        word: a.word?.filipinoWord,
        emoji: a.word?.emoji ?? undefined,
        imageUrl: a.word?.imageUrl ?? undefined,
        wrong: 0,
        total: 0,
      };
      row.total++;
      if (!a.isCorrect) row.wrong++;
      tally.set(key, row);
    }

    return [...tally.values()]
      .filter((r) => r.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || b.wrong / b.total - a.wrong / a.total)
      .slice(0, limit);
  }

  /** Recent rounds for the dashboard activity list. */
  async recent(teacherId: number, take = 8) {
    const sessions = await this.prisma.gameSession.findMany({
      where: { pupil: { teacherId } },
      include: { pupil: { select: { name: true } }, game: { select: { gameType: true } } },
      orderBy: { playedAt: 'desc' },
      take,
    });

    return sessions.map((s) => ({
      pupil: s.pupil.name,
      gameType: s.game.gameType,
      level: s.level,
      correct: s.correctCount,
      items: s.itemCount,
      stars: s.stars,
      playedAt: s.playedAt,
    }));
  }
}
