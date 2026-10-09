/**
 * Combined research export for ALL teachers, for the researchers' analysis.
 * Writes sessions.csv and answers.csv to api/exports/<timestamp>/ with the same
 * columns as the teacher's anonymized CSV export, plus teacher_code and school.
 *
 *   npm run export:research
 *   npm run export:research -- --from 2026-10-01 --to 2026-10-31   (inclusive, Asia/Manila days)
 *
 * Anonymized: teachers are T01, T02… and pupils P01, P02… by account id across
 * the whole dataset, so the codes match between both files and between runs
 * (as long as no account is added before them). No real names, usernames or
 * login codes are written. Read-only: the database is never changed.
 */
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dayRange, manilaDateTime, toCsv } from '../src/reports/csv';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
function value(flag: string) {
  const eq = args.find((a) => a.startsWith(flag + '='));
  if (eq) return eq.slice(flag.length + 1);
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

const code = (prefix: string, i: number, total: number) => prefix + String(i + 1).padStart(Math.max(2, String(total).length), '0');

async function main() {
  let range: { from?: Date; to?: Date };
  try {
    range = dayRange({ from: value('--from'), to: value('--to') });
  } catch (e: any) {
    console.error(e?.response?.message ?? e?.message ?? e);
    process.exitCode = 1;
    return;
  }

  const [teachers, pupils] = await Promise.all([
    prisma.user.findMany({ where: { role: 'TEACHER' }, select: { id: true, school: true }, orderBy: { id: 'asc' } }),
    prisma.user.findMany({ where: { role: 'PUPIL' }, select: { id: true, teacherId: true }, orderBy: { id: 'asc' } }),
  ]);
  const teacherById = new Map(teachers.map((t, i) => [t.id, { code: code('T', i, teachers.length), school: t.school ?? '' }]));
  const pupilById = new Map(pupils.map((p, i) => [p.id, { code: code('P', i, pupils.length), teacher: teacherById.get(p.teacherId) }]));
  const who = (pupilId: number) => {
    const p = pupilById.get(pupilId);
    return [p?.teacher?.code, p?.teacher?.school, p?.code];
  };

  const playedAt: { gte?: Date; lt?: Date } = {};
  if (range.from) playedAt.gte = range.from;
  if (range.to) playedAt.lt = range.to;
  const sessions = await prisma.gameSession.findMany({
    where: { playedAt },
    include: {
      game: { select: { gameType: true } },
      answers: { include: { word: { select: { filipinoWord: true } } }, orderBy: { id: 'asc' } },
    },
    orderBy: [{ playedAt: 'asc' }, { id: 'asc' }],
  });

  const sessionsCsv = toCsv(
    ['session_id', 'teacher_code', 'school', 'pupil_code', 'game', 'level', 'correct_count', 'item_count', 'accuracy_pct', 'stars', 'points', 'played_at', 'synced_at'],
    sessions.map((s) => [
      s.id,
      ...who(s.pupilId),
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
  const answersCsv = toCsv(
    ['session_id', 'teacher_code', 'school', 'pupil_code', 'game', 'level', 'item_no', 'prompt', 'target_word', 'given_answer', 'is_correct'],
    sessions.flatMap((s) =>
      s.answers.map((a, i) => [s.id, ...who(s.pupilId), s.game.gameType, s.level, i + 1, a.prompt, a.word?.filipinoWord, a.givenAnswer, a.isCorrect]),
    ),
  );

  const stamp = manilaDateTime(new Date()).replace(' ', '_').replace(/:/g, '').slice(0, 15); // 2026-10-09_1530
  const dir = join(__dirname, '..', 'exports', stamp);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'sessions.csv'), sessionsCsv);
  writeFileSync(join(dir, 'answers.csv'), answersCsv);

  // Rows per teacher_code, every teacher listed even with zero rows.
  const counts = new Map([...teacherById.values()].map((t) => [t.code, { teacher_code: t.code, school: t.school, pupils: 0, sessions: 0, answers: 0 }]));
  for (const p of pupilById.values()) {
    const row = counts.get(p.teacher?.code);
    if (row) row.pupils++;
  }
  for (const s of sessions) {
    const row = counts.get(pupilById.get(s.pupilId)?.teacher?.code);
    if (!row) continue;
    row.sessions++;
    row.answers += s.answers.length;
  }

  const coverage = range.from || range.to ? `${value('--from') ?? 'simula'} hanggang ${value('--to') ?? 'ngayon'}` : 'lahat ng petsa';
  console.log(`Research export (${coverage}) → ${dir}`);
  console.table([...counts.values()]);
  console.log(`Kabuuan: ${sessions.length} sessions, ${sessions.reduce((a, s) => a + s.answers.length, 0)} answers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
