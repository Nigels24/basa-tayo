import { Injectable, Logger } from '@nestjs/common';
import { GameType, Level, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { accuracyOf, pointsOf, starsOf } from '../common/scoring';
import { BADGES, LEVELS } from '../common/game-config';
import { SyncOutcome, SyncSessionsDto, SyncSessionDto } from './dto';

@Injectable()
export class SessionsService {
  private readonly log = new Logger(SessionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * The device plays offline and posts finished rounds here. Answers are
   * re-checked against the stored score rules, so a modified app can't invent
   * a score: the device sends what the pupil answered, the server decides the
   * points, stars and highest score.
   *
   * clientId makes this idempotent — re-sending a round after a dropped
   * connection does not create a duplicate.
   *
   * Each session is handled on its own and gets its own outcome, so one bad
   * round never blocks the others:
   *   ok        — saved and scored now
   *   duplicate — already stored; the stored scoring is returned
   *   rejected  — can never be saved (invalid, unknown game or level); the device drops it
   *   failed    — unexpected server error; the device keeps it and retries later
   */
  async sync(pupilId: number, dto: SyncSessionsDto) {
    const results: SyncOutcome[] = [];
    for (const raw of dto.sessions) {
      results.push(await this.handleOne(pupilId, raw));
    }
    return { results };
  }

  private async handleOne(pupilId: number, raw: unknown): Promise<SyncOutcome> {
    const rawId = (raw as { clientId?: unknown } | null)?.clientId;
    const clientId = typeof rawId === 'string' ? rawId : '';

    const s = plainToInstance(SyncSessionDto, raw ?? {});
    const errors = await validate(s, { whitelist: true });
    if (errors.length) {
      return { clientId, status: 'rejected', reason: firstMessage(errors) };
    }

    try {
      return await this.saveOne(pupilId, s);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // Same clientId saved by a concurrent request — answer as a duplicate.
        if (e.code === 'P2002') {
          const existing = await this.prisma.gameSession.findUnique({ where: { clientId: s.clientId } });
          if (existing?.pupilId === pupilId) return this.duplicate(existing);
        }
        // A referenced row (e.g. a wordId) does not exist; retrying will not help.
        if (e.code === 'P2003') return { clientId, status: 'rejected', reason: 'Unknown word in answers' };
      }
      this.log.error(`sync failed for ${clientId}`, e instanceof Error ? e.stack : String(e));
      return { clientId, status: 'failed', reason: 'Server error, try again later' };
    }
  }

  private async saveOne(pupilId: number, s: SyncSessionDto): Promise<SyncOutcome> {
    const existing = await this.prisma.gameSession.findUnique({ where: { clientId: s.clientId } });
    if (existing) {
      if (existing.pupilId !== pupilId) return { clientId: s.clientId, status: 'rejected', reason: 'clientId belongs to another pupil' };
      return this.duplicate(existing);
    }

    const game = await this.prisma.game.findUnique({
      where: { gameType_level: { gameType: s.gameType as GameType, level: s.level as Level } },
    });
    if (!game) return { clientId: s.clientId, status: 'rejected', reason: 'Unknown game or level' };
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

    return { clientId: s.clientId, status: 'ok', sessionId: session.id, stars, score, accuracy, isNewBest, newBadges };
  }

  /** A round the server already stored: its stored scoring, never a new best or new badges. */
  private duplicate(existing: { id: number; clientId: string; stars: number; score: number; accuracy: number }): SyncOutcome {
    return {
      clientId: existing.clientId,
      status: 'duplicate',
      sessionId: existing.id,
      stars: existing.stars,
      score: existing.score,
      accuracy: existing.accuracy,
      isNewBest: false,
      newBadges: [],
    };
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

/** First human-readable validation message, including nested answer errors. */
function firstMessage(errors: ValidationError[]): string {
  for (const e of errors) {
    if (e.constraints) return Object.values(e.constraints)[0];
    if (e.children?.length) return firstMessage(e.children);
  }
  return 'Invalid session';
}
