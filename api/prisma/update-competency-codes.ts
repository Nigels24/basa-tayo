/**
 * One-off: moves the 9 seeded lessons from the placeholder competency codes
 * to the official MATATAG codes (see COMPETENCIES in src/common/game-config.ts).
 *
 * Idempotent: a row is matched on its old code, so running this again changes
 * nothing. Lessons the teacher added are left alone and listed at the end, since
 * their quarter can't be known here — fix those in the teacher module.
 *
 *   npx ts-node prisma/update-competency-codes.ts
 */
import { GameType, Level, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLACEHOLDERS = ['PA-1', 'PA-2', 'PA-3', 'PA-4', 'PA-5', 'PA-6', 'VW-1', 'VW-2', 'PW-1', 'CC-1'];

// quarter taken from each lesson's example word theme
const UPDATES: { gameType: GameType; level: Level; title: string; from: string; to: string }[] = [
  { gameType: 'TITIK', level: 'BEGINNER', title: 'Ang mga Unang Titik', from: 'PA-1', to: 'RL1PWS-I-2' },
  { gameType: 'TITIK', level: 'INTERMEDIATE', title: 'Unang Tunog ng Salita', from: 'PA-3', to: 'RL1PA-I-5' },
  { gameType: 'TITIK', level: 'ADVANCED', title: 'Huling Tunog ng Salita', from: 'PA-4', to: 'RL1PWS-IV-3' },
  { gameType: 'LARAWAN', level: 'BEGINNER', title: 'Mga Salita sa Bahay', from: 'VW-1', to: 'RL1VWK-I-1' },
  { gameType: 'LARAWAN', level: 'INTERMEDIATE', title: 'Mga Salita sa Paaralan', from: 'VW-2', to: 'RL1VWK-II-3' },
  { gameType: 'LARAWAN', level: 'ADVANCED', title: 'Isang Tunog Lang ang Pinagkaiba', from: 'PW-1', to: 'RL1PWS-IV-5' },
  { gameType: 'BUUIN', level: 'BEGINNER', title: 'Pantig ng Salita', from: 'PA-5', to: 'RL1PA-I-2' },
  { gameType: 'BUUIN', level: 'INTERMEDIATE', title: 'Tatlong Pantig', from: 'PA-5', to: 'RL1PA-I-2' },
  { gameType: 'BUUIN', level: 'ADVANCED', title: 'Buuin Nang Mag-isa', from: 'CC-1', to: 'RL1VWK-I-5' },
];

async function main() {
  const counts = await prisma.$transaction(
    UPDATES.map((u) =>
      prisma.lesson.updateMany({
        where: { gameType: u.gameType, level: u.level, title: u.title, competencyCode: u.from },
        data: { competencyCode: u.to },
      }),
    ),
  );
  UPDATES.forEach((u, i) => console.log(`${counts[i].count} × ${u.gameType} ${u.level} "${u.title}": ${u.from} → ${u.to}`));

  const left = await prisma.lesson.findMany({
    where: { competencyCode: { in: PLACEHOLDERS } },
    select: { id: true, gameType: true, level: true, title: true, competencyCode: true },
  });
  if (left.length) {
    console.log(`\n${left.length} lesson(s) still on a placeholder code — update these in the teacher module:`);
    for (const l of left) console.log(`  #${l.id} ${l.gameType} ${l.level} "${l.title}" (${l.competencyCode})`);
  } else {
    console.log('\nNo lessons left on placeholder codes.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
