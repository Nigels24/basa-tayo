/**
 * Seeds the teacher account, the class roster, the starter Filipino word bank
 * and one lesson per mini-game + level — the same content as the prototype.
 *
 *   npm run seed
 */
import { GameType, Level, PrismaClient, Theme } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ALL: GameType[] = ['TITIK', 'LARAWAN', 'BUUIN'];

type SeedWord = { word: string; syllables: string[]; emoji: string; theme: Theme; level: Level };

const WORDS: SeedWord[] = [
  // Beginner — first Marungko letters, two syllables
  { word: 'aso', syllables: ['a', 'so'], emoji: '🐕', theme: 'Q1', level: 'BEGINNER' },
  { word: 'bata', syllables: ['ba', 'ta'], emoji: '🧒', theme: 'Q1', level: 'BEGINNER' },
  { word: 'mata', syllables: ['ma', 'ta'], emoji: '👁️', theme: 'Q1', level: 'BEGINNER' },
  { word: 'kama', syllables: ['ka', 'ma'], emoji: '🛏️', theme: 'Q1', level: 'BEGINNER' },
  { word: 'bola', syllables: ['bo', 'la'], emoji: '⚽', theme: 'Q2', level: 'BEGINNER' },
  { word: 'baso', syllables: ['ba', 'so'], emoji: '🥛', theme: 'Q1', level: 'BEGINNER' },
  { word: 'ubas', syllables: ['u', 'bas'], emoji: '🍇', theme: 'Q4', level: 'BEGINNER' },
  { word: 'lobo', syllables: ['lo', 'bo'], emoji: '🎈', theme: 'Q3', level: 'BEGINNER' },
  { word: 'susi', syllables: ['su', 'si'], emoji: '🔑', theme: 'Q1', level: 'BEGINNER' },
  { word: 'mais', syllables: ['ma', 'is'], emoji: '🌽', theme: 'Q4', level: 'BEGINNER' },
  { word: 'tasa', syllables: ['ta', 'sa'], emoji: '☕', theme: 'Q1', level: 'BEGINNER' },
  { word: 'itlog', syllables: ['it', 'log'], emoji: '🥚', theme: 'Q1', level: 'BEGINNER' },

  // Intermediate — full consonant set, quarterly theme vocabulary
  { word: 'bahay', syllables: ['ba', 'hay'], emoji: '🏠', theme: 'Q1', level: 'INTERMEDIATE' },
  { word: 'lapis', syllables: ['la', 'pis'], emoji: '✏️', theme: 'Q2', level: 'INTERMEDIATE' },
  { word: 'aklat', syllables: ['ak', 'lat'], emoji: '📕', theme: 'Q2', level: 'INTERMEDIATE' },
  { word: 'guro', syllables: ['gu', 'ro'], emoji: '👩‍🏫', theme: 'Q2', level: 'INTERMEDIATE' },
  { word: 'papel', syllables: ['pa', 'pel'], emoji: '📄', theme: 'Q2', level: 'INTERMEDIATE' },
  { word: 'pusa', syllables: ['pu', 'sa'], emoji: '🐈', theme: 'Q1', level: 'INTERMEDIATE' },
  { word: 'manok', syllables: ['ma', 'nok'], emoji: '🐓', theme: 'Q3', level: 'INTERMEDIATE' },
  { word: 'saging', syllables: ['sa', 'ging'], emoji: '🍌', theme: 'Q4', level: 'INTERMEDIATE' },
  { word: 'puno', syllables: ['pu', 'no'], emoji: '🌳', theme: 'Q4', level: 'INTERMEDIATE' },
  { word: 'isda', syllables: ['is', 'da'], emoji: '🐟', theme: 'Q3', level: 'INTERMEDIATE' },
  { word: 'kamatis', syllables: ['ka', 'ma', 'tis'], emoji: '🍅', theme: 'Q4', level: 'INTERMEDIATE' },
  { word: 'kalabaw', syllables: ['ka', 'la', 'baw'], emoji: '🐃', theme: 'Q3', level: 'INTERMEDIATE' },
  { word: 'gunting', syllables: ['gun', 'ting'], emoji: '✂️', theme: 'Q2', level: 'INTERMEDIATE' },
  { word: 'tatay', syllables: ['ta', 'tay'], emoji: '👨', theme: 'Q1', level: 'INTERMEDIATE' },
  { word: 'nanay', syllables: ['na', 'nay'], emoji: '👩', theme: 'Q1', level: 'INTERMEDIATE' },

  // Advanced — final sounds, words differing by one sound, longer words
  { word: 'bato', syllables: ['ba', 'to'], emoji: '🪨', theme: 'Q4', level: 'ADVANCED' },
  { word: 'pato', syllables: ['pa', 'to'], emoji: '🦆', theme: 'Q3', level: 'ADVANCED' },
  { word: 'payong', syllables: ['pa', 'yong'], emoji: '☂️', theme: 'Q4', level: 'ADVANCED' },
  { word: 'araw', syllables: ['a', 'raw'], emoji: '☀️', theme: 'Q4', level: 'ADVANCED' },
  { word: 'buwan', syllables: ['bu', 'wan'], emoji: '🌙', theme: 'Q4', level: 'ADVANCED' },
  { word: 'ulan', syllables: ['u', 'lan'], emoji: '🌧️', theme: 'Q4', level: 'ADVANCED' },
  { word: 'bituin', syllables: ['bi', 'tu', 'in'], emoji: '⭐', theme: 'Q4', level: 'ADVANCED' },
  { word: 'halaman', syllables: ['ha', 'la', 'man'], emoji: '🪴', theme: 'Q4', level: 'ADVANCED' },
  { word: 'bintana', syllables: ['bin', 'ta', 'na'], emoji: '🪟', theme: 'Q1', level: 'ADVANCED' },
  { word: 'sapatos', syllables: ['sa', 'pa', 'tos'], emoji: '👟', theme: 'Q1', level: 'ADVANCED' },
  { word: 'kabayo', syllables: ['ka', 'ba', 'yo'], emoji: '🐎', theme: 'Q3', level: 'ADVANCED' },
  { word: 'paaralan', syllables: ['pa', 'a', 'ra', 'lan'], emoji: '🏫', theme: 'Q2', level: 'ADVANCED' },
  { word: 'bulaklak', syllables: ['bu', 'lak', 'lak'], emoji: '🌸', theme: 'Q4', level: 'ADVANCED' },
];

const LESSONS: { gameType: GameType; level: Level; competencyCode: string; title: string; target: string; say: string; example: string; body: string }[] = [
  { gameType: 'TITIK', level: 'BEGINNER', competencyCode: 'RL1PWS-I-2', title: 'Ang mga Unang Titik', target: 'Mm  Ss  Aa', say: 'm, s, a', example: 'mata', body: 'Ito ang mga unang titik: M, S, at A. Pakinggan ang tunog ng bawat titik. Ang M ay parang mmm. Ang mata ay nagsisimula sa M.' },
  { gameType: 'TITIK', level: 'INTERMEDIATE', competencyCode: 'RL1PA-I-5', title: 'Unang Tunog ng Salita', target: 'B — bahay', say: 'ba. bahay', example: 'bahay', body: 'Bawat salita ay may unang tunog. Pakinggan: bahay. Ang unang tunog ay B. Hanapin ang titik na simula ng salita.' },
  { gameType: 'TITIK', level: 'ADVANCED', competencyCode: 'RL1PWS-IV-3', title: 'Huling Tunog ng Salita', target: 'araW', say: 'araw. Ang huling tunog ay wa', example: 'araw', body: 'Ngayon, pakinggan ang huling tunog ng salita. Araw — ang huling titik ay W. Hanapin ang titik na nasa dulo ng salita.' },

  { gameType: 'LARAWAN', level: 'BEGINNER', competencyCode: 'RL1VWK-I-1', title: 'Mga Salita sa Bahay', target: 'baso', say: 'baso', example: 'baso', body: 'Tingnan ang larawan. Ito ay baso. Basahin natin: ba-so. Piliin ang salitang tugma sa larawan.' },
  { gameType: 'LARAWAN', level: 'INTERMEDIATE', competencyCode: 'RL1VWK-II-3', title: 'Mga Salita sa Paaralan', target: 'aklat', say: 'aklat', example: 'aklat', body: 'Sa paaralan may aklat, lapis, at papel. Basahin ang salita at itugma sa tamang larawan.' },
  { gameType: 'LARAWAN', level: 'ADVANCED', competencyCode: 'RL1PWS-IV-5', title: 'Isang Tunog Lang ang Pinagkaiba', target: 'bato / pato', say: 'bato. pato', example: 'bato', body: 'Bato at pato — isang tunog lang ang magkaiba! Makinig nang mabuti at piliin ang tamang salita.' },

  { gameType: 'BUUIN', level: 'BEGINNER', competencyCode: 'RL1PA-I-2', title: 'Pantig ng Salita', target: 'ba · ta', say: 'ba. ta. bata', example: 'bata', body: 'Ang salitang bata ay may dalawang pantig: ba at ta. Pagdugtungin ang mga pantig para mabuo ang salita.' },
  { gameType: 'BUUIN', level: 'INTERMEDIATE', competencyCode: 'RL1PA-I-2', title: 'Tatlong Pantig', target: 'ka · ma · tis', say: 'ka. ma. tis. kamatis', example: 'kamatis', body: 'Ang kamatis ay may tatlong pantig: ka, ma, tis. Ayusin ang mga pantig sa tamang pagkakasunod.' },
  { gameType: 'BUUIN', level: 'ADVANCED', competencyCode: 'RL1VWK-I-5', title: 'Buuin Nang Mag-isa', target: '?', say: 'Pakinggan ang salita at buuin ito.', example: 'bintana', body: 'Walang tulong ngayon! Pakinggan ang salita, tingnan ang larawan, at buuin ang buong salita. May isang pantig na hindi kasama — mag-ingat!' },
];

const PUPILS = [
  { name: 'Ana Reyes', loginCode: '1234' },
  { name: 'Juan Dela Cruz', loginCode: '2468' },
  { name: 'Maria Santos', loginCode: '1357' },
  { name: 'Jose Bautista', loginCode: '4321' },
  { name: 'Liza Mendoza', loginCode: '5555' },
  { name: 'Paolo Villanueva', loginCode: '8080' },
  { name: 'Grace Lim', loginCode: '3690' },
  { name: 'Nico Garcia', loginCode: '7412' },
];

async function main() {
  const teacher = await prisma.user.upsert({
    where: { username: 'teacher' },
    update: {},
    create: {
      role: 'TEACHER',
      name: 'Gng. Liza M. Ramos',
      username: 'teacher',
      passwordHash: await bcrypt.hash('guro123', 10),
      school: 'Dumingag Central Elementary School',
    },
  });
  console.log('teacher:', teacher.username, '/ guro123');

  for (const p of PUPILS) {
    await prisma.user.upsert({
      where: { loginCode: p.loginCode },
      update: {},
      create: { role: 'PUPIL', name: p.name, loginCode: p.loginCode, section: 'Sampaguita', teacherId: teacher.id },
    });
  }

  // games: one row per mini-game and level
  for (const gameType of ALL) {
    for (const level of ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as Level[]) {
      await prisma.game.upsert({
        where: { gameType_level: { gameType, level } },
        update: {},
        create: { gameType, level },
      });
    }
  }

  // word bank, assigned to all three mini-games at its own level
  for (const w of WORDS) {
    const word = await prisma.word.upsert({
      where: { filipinoWord: w.word },
      update: { syllables: w.syllables, emoji: w.emoji, theme: w.theme, level: w.level },
      create: {
        filipinoWord: w.word,
        syllables: w.syllables,
        emoji: w.emoji,
        theme: w.theme,
        level: w.level,
        createdById: teacher.id,
      },
    });

    for (const gameType of ALL) {
      const game = await prisma.game.findUnique({ where: { gameType_level: { gameType, level: w.level } } });
      await prisma.gameWord.upsert({
        where: { gameId_wordId: { gameId: game.id, wordId: word.id } },
        update: {},
        create: { gameId: game.id, wordId: word.id },
      });
    }
  }

  // one lesson per mini-game and level, attached to its game
  for (const l of LESSONS) {
    const example = await prisma.word.findUnique({ where: { filipinoWord: l.example } });
    const existing = await prisma.lesson.findFirst({ where: { gameType: l.gameType, level: l.level, title: l.title } });

    const lesson = existing
      ? await prisma.lesson.update({ where: { id: existing.id }, data: { target: l.target, body: l.body, say: l.say, exampleWordId: example?.id } })
      : await prisma.lesson.create({
          data: {
            competencyCode: l.competencyCode,
            title: l.title,
            target: l.target,
            body: l.body,
            say: l.say,
            exampleWordId: example?.id,
            gameType: l.gameType,
            level: l.level,
            createdById: teacher.id,
          },
        });

    await prisma.game.update({
      where: { gameType_level: { gameType: l.gameType, level: l.level } },
      data: { lessonId: lesson.id },
    });
  }

  console.log(`seeded ${WORDS.length} words, ${LESSONS.length} lessons, ${PUPILS.length} pupils`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
