import { Injectable, NotFoundException } from '@nestjs/common';
import { GameType, Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { manilaDateTime, toCsv } from './csv';

/** from is inclusive, to is exclusive (the start of the day after the chosen end date). */
export type DayRange = { from?: Date; to?: Date };
export type ExportFilter = DayRange & { pupilId?: number; anonymize: boolean };

type AnswerRow = {
  prompt: string;
  isCorrect: boolean;
  gameType: GameType;
  word: { filipinoWord: string; emoji: string | null; imageUrl: string | null } | null;
};

const GAME_ORDER: GameType[] = ['TITIK', 'LARAWAN', 'BUUIN'];
const LEVEL_ORDER: Level[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

function playedAtFilter(range: DayRange): Prisma.DateTimeFilter {
  const playedAt: Prisma.DateTimeFilter = {};
  if (range.from) playedAt.gte = range.from;
  if (range.to) playedAt.lt = range.to;
  return playedAt;
}

/** Wrong and total answers per mini-game and prompt; only items missed at least once, most missed first. */
function tallyMissed(answers: AnswerRow[]) {
  const tally = new Map<string, { prompt: string; gameType: string; word?: string; emoji?: string; imageUrl?: string; wrong: number; total: number }>();
  for (const a of answers) {
    const key = `${a.gameType}|${a.prompt}`;
    const row = tally.get(key) ?? {
      prompt: a.prompt,
      gameType: a.gameType,
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
    .sort((a, b) => b.wrong - a.wrong || b.wrong / b.total - a.wrong / a.total);
}

/** Missed items grouped by mini-game, then level; words sorted by wrong count, then A–Z. */
function missedByCategory(answers: (AnswerRow & { level: Level })[]) {
  const groups = GAME_ORDER.flatMap((gameType) =>
    LEVEL_ORDER.map((level) => ({
      gameType,
      level,
      words: tallyMissed(answers.filter((a) => a.gameType === gameType && a.level === level))
        .map(({ prompt, word, emoji, imageUrl, wrong, total }) => ({ prompt, word, emoji, imageUrl, wrong, total }))
        .sort((a, b) => b.wrong - a.wrong || a.prompt.localeCompare(b.prompt)),
    })),
  );
  return groups.filter((g) => g.words.length > 0);
}

/**
 * Highest score per mini-game and level from a set of rounds, by the same rule
 * as the scores table: a later round replaces the best only with more points.
 */
function bestPerGame(sessions: { game: { gameType: GameType }; level: Level; score: number; stars: number; playedAt: Date; id: number }[]): { gameType: GameType; level: Level; highestScore: number; stars: number }[] {
  const oldestFirst = [...sessions].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime() || a.id - b.id);
  const best = new Map<string, { gameType: GameType; level: Level; highestScore: number; stars: number }>();
  for (const s of oldestFirst) {
    const key = `${s.game.gameType}|${s.level}`;
    const prev = best.get(key);
    if (!prev || s.score > prev.highestScore) {
      best.set(key, { gameType: s.game.gameType, level: s.level, highestScore: s.score, stars: s.stars });
    }
  }
  return [...best.values()];
}

/**
 * The right answer for one item. It is not stored on its own: for Larawan and
 * Buuin it is the target word; for Titik it is the letter shown in the prompt
 * ("B — bahay", or the capitalised ending in "araW (dulo)").
 */
function expectedAnswer(gameType: GameType, prompt: string, word?: string): string | null {
  if (gameType === 'TITIK') {
    const first = prompt.match(/^(\S+) — /);
    if (first) return first[1];
    const last = prompt.match(/([A-ZÑ]+) \(dulo\)$/);
    return last ? last[1] : null;
  }
  return word ?? prompt;
}

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

  /**
   * Highest score per pupil, mini-game and level — the class matrix — with
   * rounds and average accuracy. With a range, all of it comes from the rounds
   * played in that range, by the same rule as the pupil report.
   */
  async classScores(teacherId: number, range: DayRange = {}) {
    const ranged = !!(range.from || range.to);
    const pupils = await this.prisma.user.findMany({
      where: { role: 'PUPIL', teacherId, active: true },
      include: { scores: { include: { game: { select: { gameType: true } } } } },
      orderBy: { name: 'asc' },
    });
    const sessions = await this.prisma.gameSession.findMany({
      where: { pupilId: { in: pupils.map((p) => p.id) }, playedAt: playedAtFilter(range) },
      select: { id: true, pupilId: true, level: true, score: true, stars: true, accuracy: true, playedAt: true, game: { select: { gameType: true } } },
    });

    return pupils.map((p) => {
      const own = sessions.filter((s) => s.pupilId === p.id);
      return {
        id: p.id,
        name: p.name,
        section: p.section,
        rounds: own.length,
        avgAccuracy: own.length ? Math.round(own.reduce((a, s) => a + s.accuracy, 0) / own.length) : 0,
        scores: ranged
          ? bestPerGame(own)
          : p.scores.map((s) => ({ gameType: s.game.gameType, level: s.level, highestScore: s.highestScore, stars: s.stars })),
      };
    });
  }

  /**
   * The printable class report in one call: class summary, the class matrix,
   * the 10 most-missed items and, with details, every active pupil's report.
   */
  async classReport(teacherId: number, range: DayRange = {}, details = false) {
    const [pupils, missed] = await Promise.all([this.classScores(teacherId, range), this.missedItems(teacherId, undefined, 10, range)]);
    const rounds = pupils.reduce((a, p) => a + p.rounds, 0);
    const accuracy = await this.prisma.gameSession.aggregate({
      where: { pupilId: { in: pupils.map((p) => p.id) }, playedAt: playedAtFilter(range) },
      _avg: { accuracy: true },
    });

    // One pupil at a time keeps the connection pool free for a class of ~40.
    const reports = [];
    if (details) for (const p of pupils) reports.push(await this.pupil(teacherId, p.id, range));

    return {
      range: { from: range.from ?? null, to: range.to ?? null }, // to is exclusive
      summary: { pupils: pupils.length, rounds, avgAccuracy: Math.round(accuracy._avg.accuracy ?? 0) },
      pupils,
      missed,
      reports: details ? reports : undefined,
    };
  }

  /**
   * One pupil: rounds, accuracy, stars, badges, highest scores, missed words
   * and round history with each round's answers. With a range, everything but
   * badges comes from the rounds played in it; badges are always all time.
   */
  async pupil(teacherId: number, pupilId: number, range: DayRange = {}) {
    const ranged = !!(range.from || range.to);
    const pupil = await this.prisma.user.findFirst({
      where: { id: pupilId, teacherId, role: 'PUPIL' },
      include: {
        badges: true,
        scores: { include: { game: { select: { gameType: true } } } },
      },
    });
    if (!pupil) throw new NotFoundException('Hindi mahanap ang pupil na ito');

    const sessions = await this.prisma.gameSession.findMany({
      where: { pupilId, playedAt: playedAtFilter(range) },
      include: {
        game: { select: { gameType: true } },
        answers: { include: { word: { select: { filipinoWord: true, emoji: true, imageUrl: true } } }, orderBy: { id: 'asc' } },
      },
      orderBy: [{ playedAt: 'desc' }, { id: 'desc' }],
    });

    const avgAccuracy = sessions.length
      ? Math.round(sessions.reduce((a, s) => a + s.accuracy, 0) / sessions.length)
      : 0;

    // All time: the scores table. In a range: the same rule over that range's
    // rounds — the first round with the highest points per mini-game and level.
    const scores = ranged
      ? bestPerGame(sessions)
      : pupil.scores.map((s) => ({ gameType: s.game.gameType, level: s.level, highestScore: s.highestScore, stars: s.stars }));

    const answers = sessions.flatMap((s) => s.answers.map((a) => ({ ...a, gameType: s.game.gameType, level: s.level })));

    return {
      id: pupil.id,
      name: pupil.name,
      section: pupil.section,
      loginCode: pupil.loginCode,
      range: { from: range.from ?? null, to: range.to ?? null }, // to is exclusive
      rounds: sessions.length,
      avgAccuracy,
      stars: scores.reduce((a, s) => a + s.stars, 0),
      badges: pupil.badges.map((b) => ({ key: b.badgeKey, name: b.name, earnedAt: b.earnedAt })),
      badgesAllTime: true,
      scores,
      history: sessions.map((s) => ({
        id: s.id,
        gameType: s.game.gameType,
        level: s.level,
        correct: s.correctCount,
        items: s.itemCount,
        accuracy: s.accuracy,
        stars: s.stars,
        score: s.score,
        playedAt: s.playedAt,
        answers: s.answers.map((a) => ({
          prompt: a.prompt,
          word: a.word?.filipinoWord ?? null,
          emoji: a.word?.emoji ?? null,
          isCorrect: a.isCorrect,
          given: a.givenAnswer || null,
          expected: expectedAnswer(s.game.gameType, a.prompt, a.word?.filipinoWord),
        })),
      })),
      missed: tallyMissed(answers).slice(0, 10),
      missedByCategory: missedByCategory(answers),
    };
  }

  /**
   * Items most frequently answered incorrectly — the report the manuscript
   * promises. This is what the session_answers table exists for.
   */
  async missedItems(teacherId: number, pupilId?: number, limit = 10, range: DayRange = {}) {
    const pupils = await this.prisma.user.findMany({ where: { role: 'PUPIL', teacherId }, select: { id: true } });
    const ids = pupils.map((p) => p.id).filter((id) => !pupilId || id === pupilId);

    const answers = await this.prisma.sessionAnswer.findMany({
      where: { pupilId: { in: ids }, ...(range.from || range.to ? { session: { playedAt: playedAtFilter(range) } } : {}) },
      select: { prompt: true, isCorrect: true, word: { select: { filipinoWord: true, emoji: true, imageUrl: true } }, session: { select: { game: { select: { gameType: true } } } } },
    });

    return tallyMissed(answers.map((a) => ({ ...a, gameType: a.session.game.gameType }))).slice(0, limit);
  }

  /** Research export: one row per round (game_sessions). */
  async exportSessions(teacherId: number, filter: ExportFilter) {
    const { where, pupilCols, pupilCells } = await this.exportScope(teacherId, filter);
    const sessions = await this.prisma.gameSession.findMany({
      where,
      include: { game: { select: { gameType: true } } },
      orderBy: [{ playedAt: 'asc' }, { id: 'asc' }],
    });

    return toCsv(
      ['session_id', ...pupilCols, 'game', 'level', 'correct_count', 'item_count', 'accuracy_pct', 'stars', 'points', 'played_at', 'synced_at'],
      sessions.map((s) => [
        s.id,
        ...pupilCells(s.pupilId),
        s.game.gameType,
        s.level,
        s.correctCount,
        s.itemCount,
        s.accuracy,
        s.stars,
        s.score,
        manilaDateTime(s.playedAt),
        manilaDateTime(s.syncedAt),
      ]),
    );
  }

  /**
   * Research export: one row per answered item (session_answers). Answers are
   * stored in the order they were played, so item_no is their position by id.
   */
  async exportAnswers(teacherId: number, filter: ExportFilter) {
    const { where, pupilCols, pupilCells } = await this.exportScope(teacherId, filter);
    const sessions = await this.prisma.gameSession.findMany({
      where,
      include: {
        game: { select: { gameType: true } },
        answers: { include: { word: { select: { filipinoWord: true } } }, orderBy: { id: 'asc' } },
      },
      orderBy: [{ playedAt: 'asc' }, { id: 'asc' }],
    });

    return toCsv(
      ['session_id', ...pupilCols, 'game', 'level', 'item_no', 'prompt', 'target_word', 'given_answer', 'is_correct'],
      sessions.flatMap((s) =>
        s.answers.map((a, i) => [
          s.id,
          ...pupilCells(s.pupilId),
          s.game.gameType,
          s.level,
          i + 1,
          a.prompt,
          a.word?.filipinoWord,
          a.givenAnswer,
          a.isCorrect,
        ]),
      ),
    );
  }

  /**
   * Shared filter and pupil columns for both exports. Anonymous codes P01, P02…
   * follow the whole roster's id order, so they match across files and filters.
   * Login codes are never exported.
   */
  private async exportScope(teacherId: number, filter: ExportFilter) {
    const roster = await this.prisma.user.findMany({
      where: { role: 'PUPIL', teacherId },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
    const width = Math.max(2, String(roster.length).length);
    const byId = new Map(roster.map((p, i) => [p.id, { name: p.name, code: 'P' + String(i + 1).padStart(width, '0') }]));

    const ids = filter.pupilId ? roster.filter((p) => p.id === filter.pupilId).map((p) => p.id) : roster.map((p) => p.id);
    return {
      where: { pupilId: { in: ids }, playedAt: playedAtFilter(filter) } satisfies Prisma.GameSessionWhereInput,
      pupilCols: filter.anonymize ? ['pupil_code'] : ['pupil_id', 'pupil_name'],
      pupilCells: (pupilId: number) =>
        filter.anonymize ? [byId.get(pupilId)?.code] : [pupilId, byId.get(pupilId)?.name],
    };
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
