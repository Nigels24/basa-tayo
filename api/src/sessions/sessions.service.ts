import { Injectable, NotFoundException } from '@nestjs/common';
import { GameType, Level } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { accuracyOf, pointsOf, starsOf } from '../common/scoring';
import { BADGES, LEVELS } from '../common/game-config';
import { SyncSessionsDto, SyncSessionDto } from './dto';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * The device plays offline and posts finished rounds here. Answers are
   * re-checked against the stored score rules, so a modified app can't invent
   * a score: the device sends what the pupil answered, the server decides the
   * points, stars and highest score.
   *
   * clientId makes this idempotent — re-sending a round after a dropped
   * connection does not create a duplicate.
   */
  async sync(pupilId: number, dto: SyncSessionsDto) {
    const results = [];
    for (const s of dto.sessions) {
      results.push(await this.saveOne(pupilId, s));
    }
    return { results };
  }

  private async saveOne(pupilId: number, s: SyncSessionDto) {
    const existing = await this.prisma.gameSession.findUnique({ where: { clientId: s.clientId } });
    if (existing) {
      return { clientId: s.clientId, sessionId: existing.id, duplicate: true, stars: existing.stars, score: existing.score, isNewBest: false, newBadges: [] };
    }

    const game = await this.prisma.game.findUnique({
      where: { gameType_level: { gameType: s.gameType as GameType, level: s.level as Level } },
    });
    if (!game) throw new NotFoundException('Unknown game or level');

    const itemCount = s.answers.length;
    const correctCount = s.answers.filter((a) => a.isCorrect).length;
    const accuracy = accuracyOf(correctCount, itemCount);
    const stars = starsOf(accuracy);
    const score = pointsOf(correctCount);

    const session = await this.prisma.gameSession.create({
      data: {
        clientId: s.clientId,
        pupilId,
        gameId: game.id,
        level: s.level as Level,
        itemCount,
        correctCount,
        accuracy,
        score,
        stars,
        playedAt: new Date(s.playedAt),
        answers: {
          create: s.answers.map((a) => ({
            pupilId,
            wordId: a.wordId ?? null,
            prompt: a.prompt,
            givenAnswer: a.given ?? '',
            isCorrect: a.isCorrect,
          })),
        },
      },
    });

    const isNewBest = await this.updateHighestScore(pupilId, game.id, s.level as Level, score, accuracy, stars);
    const newBadges = await this.checkBadges(pupilId, { gameType: s.gameType as GameType, level: s.level as Level, accuracy, stars });

    return { clientId: s.clientId, sessionId: session.id, duplicate: false, stars, score, accuracy, isNewBest, newBadges };
  }

  /** Highest-score system: keep the best result per pupil, mini-game and level. */
  private async updateHighestScore(pupilId: number, gameId: number, level: Level, score: number, accuracy: number, stars: number) {
    const key = { pupilId_gameId_level: { pupilId, gameId, level } };
    const prev = await this.prisma.score.findUnique({ where: key });
    if (prev && prev.highestScore >= score) return false;

    await this.prisma.score.upsert({
      where: key,
      create: { pupilId, gameId, level, highestScore: score, accuracy, stars },
      update: { highestScore: score, accuracy, stars },
    });
    return true;
  }

  private async checkBadges(pupilId: number, ctx: { gameType: GameType; level: Level; accuracy: number; stars: number }) {
    const [owned, sessionCount, scores] = await Promise.all([
      this.prisma.badge.findMany({ where: { pupilId }, select: { badgeKey: true } }),
      this.prisma.gameSession.count({ where: { pupilId } }),
      this.prisma.score.findMany({ where: { pupilId }, include: { game: true } }),
    ]);
    const have = new Set(owned.map((b) => b.badgeKey));
    const earned = [];

    for (const badge of BADGES) {
      if (have.has(badge.key)) continue;
      const r = badge.rule;
      let ok = false;

      if (r.startsWith('sessions>=')) ok = sessionCount >= Number(r.split('>=')[1]);
      else if (r === 'perfect') ok = ctx.accuracy === 100;
      else if (r.startsWith('stars>=')) ok = ctx.stars >= Number(r.split('>=')[1]);
      else if (r.startsWith('allLevels:')) {
        const gt = r.split(':')[1] as GameType;
        ok = LEVELS.every((lv) => scores.some((s) => s.game.gameType === gt && s.level === lv.id && s.stars === 3));
      } else if (r.startsWith('finished:')) {
        const [, gt, lv] = r.split(':');
        ok = ctx.gameType === gt && ctx.level === lv;
      }

      if (ok) {
        await this.prisma.badge.create({ data: { pupilId, badgeKey: badge.key, name: badge.name } });
        earned.push({ key: badge.key, name: badge.name, description: badge.description });
      }
    }
    return earned;
  }
}
