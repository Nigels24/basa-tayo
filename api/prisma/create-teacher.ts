/**
 * Teacher accounts, for the researchers (there is no admin screen). Teachers
 * normally sign up themselves on /register with the registration code; this
 * script lists them and fixes problems. Password hashes are never printed.
 *
 *   npm run teacher -- --list
 *   npm run teacher -- --reset-password --username juan.cruz            asks twice (Enter = generate one)
 *   npm run teacher -- --reset-password --username juan.cruz --generate prints a new readable password once
 *   npm run teacher -- --deactivate --username juan.cruz                 she can no longer log in
 *   npm run teacher -- --activate --username juan.cruz
 *   npm run teacher -- --create --name "Ana B. Santos" --username ana.santos [--school "…"] [--section "Rosal"] [--generate]
 *
 * Uses DATABASE_URL from api/.env — check which database that is before running.
 */
import { PrismaClient, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import * as readline from 'node:readline';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
function value(flag: string) {
  const i = args.indexOf(flag);
  const v = i >= 0 ? args[i + 1] : undefined;
  return v && !v.startsWith('--') ? v.trim() : undefined;
}

const DEFAULT_SCHOOL = 'Dumingag Central Elementary School';
const USERNAME_RULE = /^[a-z0-9._]{4,30}$/;
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // same as the sign-up form
const WORDS = ['araw', 'bahay', 'buwan', 'dahon', 'ibon', 'isda', 'lapis', 'mesa', 'puno', 'saging', 'tubig', 'ulan', 'aklat', 'bola', 'gatas', 'kamay'];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** e.g. "dahon-4827-ulan": easy to read aloud or copy from a slip of paper. */
function readablePassword() {
  const word = () => WORDS[randomInt(WORDS.length)];
  return `${word()}-${randomInt(1000, 10000)}-${word()}`;
}

/** Reads a line without echoing it. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const rlAny = rl as any;
    rlAny._writeToOutput = (s: string) => {
      if (s.startsWith(question)) process.stdout.write(question);
      else if (s.includes('\n') || s.includes('\r')) process.stdout.write('\n');
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/** Asks twice (Enter = generate), or generates with --generate / without a terminal. Returns [password, generated]. */
async function newPassword(): Promise<[string, boolean]> {
  if (has('--generate') || !process.stdin.isTTY) return [readablePassword(), true];
  const first = await askHidden('Bagong password (Enter = gumawa ng isa): ');
  if (!first) return [readablePassword(), true];
  if (!PASSWORD_RULE.test(first)) fail('Ang password ay dapat may 8 o higit pang character, may letra at numero.');
  const again = await askHidden('Ulitin ang password: ');
  if (first !== again) fail('Hindi magkapareho ang dalawang password. Walang binago.');
  return [first, false];
}

async function teacherByUsername(username?: string) {
  if (!username) fail('Kailangan ang --username');
  const user = await prisma.user.findFirst({ where: { role: 'TEACHER', username: { equals: username, mode: 'insensitive' } } });
  if (!user) fail(`Walang teacher na may username na "${username}". Tingnan ang --list.`);
  return user;
}

function printPassword(user: Pick<User, 'username'>, password: string) {
  console.log(`\n  username: ${user.username}\n  password: ${password}\n`);
  console.log('Isulat ito at ibigay sa teacher. Hindi na ito maipapakita muli.');
  console.log('Maaari niya itong palitan sa "Aking Account".');
}

async function list() {
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: { id: true, name: true, username: true, school: true, section: true, active: true, createdAt: true, _count: { select: { pupils: true } } },
    orderBy: { id: 'asc' },
  });
  if (!teachers.length) return console.log('Wala pang teacher.');
  console.table(
    teachers.map((t) => ({
      name: t.name,
      username: t.username,
      school: t.school ?? '',
      section: t.section ?? '',
      active: t.active ? 'oo' : 'HINDI',
      pupils: t._count.pupils,
      created: t.createdAt.toISOString().slice(0, 10),
    })),
  );
}

async function resetPassword() {
  const user = await teacherByUsername(value('--username'));
  const [password, generated] = await newPassword();
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  console.log(`Napalitan ang password ni ${user.name}.`);
  if (generated) printPassword(user, password);
}

async function setActive(active: boolean) {
  const user = await teacherByUsername(value('--username'));
  await prisma.user.update({ where: { id: user.id }, data: { active } });
  console.log(active ? `Aktibo na muli si ${user.name} (${user.username}).` : `Na-deactivate si ${user.name} (${user.username}); hindi na siya makakapag-log in. Hindi binago ang mga pupil niya.`);
}

async function create() {
  const name = value('--name');
  const username = value('--username')?.toLowerCase();
  const school = value('--school') ?? DEFAULT_SCHOOL;
  const section = value('--section') ?? null;
  if (!name || name.length < 3 || name.length > 80) fail('Kailangan ang --name "Buong Pangalan" (3–80 character).');
  if (!username || !USERNAME_RULE.test(username)) fail('Kailangan ang --username: 4–30 maliliit na letra, numero, tuldok o underscore.');
  if (school.length < 3 || school.length > 120) fail('Ang --school ay dapat 3–120 character.');
  if (section && section.length > 60) fail('Ang --section ay hanggang 60 character.');
  const taken = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } });
  if (taken) fail('Gamit na ang username na ito.');

  const [password, generated] = await newPassword();
  const user = await prisma.user.create({
    data: { role: 'TEACHER', name, username, school, section, passwordHash: await bcrypt.hash(password, 10), active: true },
  });
  console.log(`Nagawa ang account ni ${user.name}.`);
  if (generated) printPassword(user, password);
}

async function main() {
  if (has('--list')) return list();
  if (has('--reset-password')) return resetPassword();
  if (has('--deactivate')) return setActive(false);
  if (has('--activate')) return setActive(true);
  if (has('--create')) return create();
  console.log('Gamit: npm run teacher -- --list | --reset-password --username X [--generate] | --deactivate --username X | --activate --username X | --create --name "…" --username X [--school "…"] [--section "…"] [--generate]');
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
