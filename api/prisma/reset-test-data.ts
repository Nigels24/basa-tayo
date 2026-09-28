/**
 * One-off: run right before real testing with Grade 1 pupils. Removes all demo
 * and test gameplay so every pupil starts at zero, and keeps content and accounts.
 *
 * Gameplay lives only in these tables (users has no points/stars columns):
 *   game_sessions   — rows deleted
 *   session_answers — rows deleted (cascade with game_sessions)
 *   scores          — rows deleted (highest score, accuracy, stars per game/level)
 *   badges          — rows deleted
 *
 * Never touched: teachers, active words and their game_words, games, lessons,
 * competency codes, the schema. Pupils are never deleted, only deactivated on request.
 *
 * Default is a dry run that changes nothing. Idempotent: a second real run reports zeros.
 *
 *   npm run reset:test-data                                          dry run
 *   npm run reset:test-data -- --confirm                             real run (asks for RESET)
 *   npm run reset:test-data -- --confirm --deactivate-pupils=1234,2468
 *   npm run reset:test-data -- --confirm --purge-inactive-words
 *   npm run reset:test-data -- --confirm --yes                       no prompt, for scripts
 */
import { Prisma, PrismaClient } from '@prisma/client';
import * as readline from 'node:readline/promises';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const yes = args.includes('--yes');
const purgeWords = args.includes('--purge-inactive-words');
const deactivateArg = args.find((a) => a.startsWith('--deactivate-pupils='));
const deactivateCodes = deactivateArg
  ? [...new Set(deactivateArg.split('=')[1].split(',').map((c) => c.trim()).filter(Boolean))]
  : [];

type Db = PrismaClient | Prisma.TransactionClient;

async function gameplayCounts(db: Db) {
  const [gameSessions, sessionAnswers, scores, badges] = await Promise.all([
    db.gameSession.count(),
    db.sessionAnswer.count(),
    db.score.count(),
    db.badge.count(),
  ]);
  return { game_sessions: gameSessions, session_answers: sessionAnswers, scores, badges };
}

/** Inactive words with everything that still points at them. */
async function inactiveWords(db: Db) {
  const words = await db.word.findMany({
    where: { active: false },
    select: {
      id: true,
      filipinoWord: true,
      _count: { select: { answers: true, lessons: true, gameWords: true } },
    },
    orderBy: { id: 'asc' },
  });
  return words.map((w) => ({ id: w.id, word: w.filipinoWord, refs: w._count }));
}

function refText(refs: { answers: number; lessons: number; gameWords: number }) {
  const parts = [];
  if (refs.answers) parts.push(`${refs.answers} session_answers`);
  if (refs.lessons) parts.push(`${refs.lessons} lessons (example word)`);
  if (refs.gameWords) parts.push(`${refs.gameWords} game_words`);
  return parts.join(', ');
}

function dbHost() {
  try {
    const u = new URL(process.env.DATABASE_URL ?? '');
    return `${u.hostname}${u.pathname}`;
  } catch {
    return '(DATABASE_URL not set or unreadable)';
  }
}

async function main() {
  await prisma.$connect(); // loads api/.env into process.env
  console.log(`Database: ${dbHost()}`);
  console.log(confirm ? 'Mode: REAL RUN (--confirm)\n' : 'Mode: DRY RUN — nothing will be changed. Add --confirm to reset.\n');

  const before = await gameplayCounts(prisma);
  console.log('Gameplay rows to delete:');
  for (const [table, n] of Object.entries(before)) console.log(`  ${table.padEnd(16)} ${n}`);

  const pupils = await prisma.user.findMany({
    where: { role: 'PUPIL' },
    select: { id: true, name: true, loginCode: true, active: true },
    orderBy: { id: 'asc' },
  });
  console.log(`\nPupils (${pupils.length}) — never deleted:`);
  for (const p of pupils) console.log(`  #${p.id} ${p.loginCode ?? '-'} ${p.name}${p.active ? '' : '  [inactive]'}`);

  if (deactivateCodes.length) {
    const byCode = new Map(pupils.map((p) => [p.loginCode, p]));
    console.log(`\nDeactivate pupils (${deactivateCodes.join(', ')}):`);
    for (const code of deactivateCodes) {
      const p = byCode.get(code);
      if (!p) console.log(`  ${code}: unknown login code — skipped`);
      else console.log(`  ${code}: #${p.id} ${p.name}${p.active ? '' : ' (already inactive)'}`);
    }
  }

  const words = await inactiveWords(prisma);
  console.log(`\nInactive words (${words.length})${purgeWords ? ' — --purge-inactive-words:' : ' — listed only; add --purge-inactive-words to delete unreferenced ones:'}`);
  for (const w of words) {
    const refs = refText(w.refs);
    console.log(`  #${w.id} ${w.word}${refs ? `  (referenced by ${refs})` : ''}`);
  }
  if (purgeWords && words.length) {
    console.log('  (session_answers references disappear with the reset; lessons and game_words references block the delete)');
  }

  if (!confirm) {
    console.log('\nDry run finished. Nothing was changed.');
    return;
  }

  if (!yes) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`\nThis permanently deletes gameplay data on ${dbHost()}. Type RESET to continue: `);
    rl.close();
    if (answer.trim() !== 'RESET') {
      console.log('Not confirmed. Nothing was changed.');
      return;
    }
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const cascaded = await tx.sessionAnswer.count();
      const deleted = {
        session_answers: cascaded,
        game_sessions: (await tx.gameSession.deleteMany()).count,
        badges: (await tx.badge.deleteMany()).count,
        scores: (await tx.score.deleteMany()).count,
      };
      // session_answers cascade with their session; stray rows would mean the cascade is missing
      const answersLeft = await tx.sessionAnswer.count();
      if (answersLeft !== 0) throw new Error(`${answersLeft} session_answers left after deleting game_sessions — rolled back`);

      const deactivated: string[] = [];
      const alreadyInactive: string[] = [];
      const unknown: string[] = [];
      for (const code of deactivateCodes) {
        const p = await tx.user.findFirst({ where: { role: 'PUPIL', loginCode: code } });
        if (!p) {
          unknown.push(code);
          continue;
        }
        if (p.active) {
          await tx.user.update({ where: { id: p.id }, data: { active: false } });
          deactivated.push(`${code} #${p.id} ${p.name}`);
        } else {
          alreadyInactive.push(`${code} #${p.id} ${p.name}`);
        }
      }

      const purged: string[] = [];
      const skipped: string[] = [];
      if (purgeWords) {
        // Re-read inside the transaction: session_answers are gone now, so only lessons and game_words can block.
        for (const w of await inactiveWords(tx)) {
          const refs = refText(w.refs);
          if (refs) {
            skipped.push(`#${w.id} ${w.word} (${refs})`);
            continue;
          }
          // active: false again so an active word is never deleted, even if it was reactivated meanwhile
          const { count } = await tx.word.deleteMany({ where: { id: w.id, active: false } });
          if (count) purged.push(`#${w.id} ${w.word}`);
        }
      }

      return { deleted, deactivated, alreadyInactive, unknown, purged, skipped, after: await gameplayCounts(tx) };
    },
    { maxWait: 10_000, timeout: 60_000 },
  );

  console.log('\nDeleted:');
  console.log(`  game_sessions    ${result.deleted.game_sessions} (session_answers cascaded: ${result.deleted.session_answers})`);
  console.log(`  scores           ${result.deleted.scores}`);
  console.log(`  badges           ${result.deleted.badges}`);
  if (deactivateCodes.length) {
    console.log(`\nDeactivated pupils (${result.deactivated.length}):`);
    for (const d of result.deactivated) console.log(`  ${d}`);
    for (const d of result.alreadyInactive) console.log(`  ${d} — already inactive`);
    for (const c of result.unknown) console.log(`  ${c}: unknown login code — skipped`);
  }
  if (purgeWords) {
    console.log(`\nPurged inactive words (${result.purged.length}):`);
    for (const p of result.purged) console.log(`  ${p}`);
    if (result.skipped.length) console.log(`Skipped, still referenced (${result.skipped.length}):`);
    for (const s of result.skipped) console.log(`  ${s}`);
  }
  console.log('\nFinal counts:');
  for (const [table, n] of Object.entries(result.after)) console.log(`  ${table.padEnd(16)} ${n}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
