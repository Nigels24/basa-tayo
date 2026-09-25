# Basa Tayo! — Android-Based Gamified Filipino Literacy Application

Real system for the capstone *Android-Based Gamified Filipino Literacy Application for Word
Recognition and Spelling Development of Grade 1 Learners of Dumingag Central Elementary School*.
Built to match the prototype and Chapters I–III.

Three projects, one language (TypeScript):

```
api/      NestJS + Prisma + PostgreSQL   — auth, content, scoring, reports
mobile/   Expo (React Native)            — pupil Android app, plays offline
web/      Next.js                        — teacher module (word bank, lessons, pupils, reports)
```

## Setup order

Run each in its own terminal tab. Do `api` first — the other two talk to it.

### 1. API

```bash
cd api
npm install
cp .env.example .env          # then put your PostgreSQL URL in DATABASE_URL
npx prisma migrate dev --name init
npm run seed                  # teacher account + starter word bank + 8 pupils
npm run start:dev             # http://localhost:3000
```

Free PostgreSQL: create a database at neon.tech or supabase.com and paste the connection string.

Demo accounts after seeding: teacher `teacher` / `guro123`, pupil codes `1234`, `2468`, `1357`.

### 2. Teacher module (web)

```bash
cd web
npm install
cp .env.example .env.local
npm run dev                   # http://localhost:3001
```

### 3. Pupil app (mobile)

```bash
cd mobile
npm install
cp .env.example .env          # EXPO_PUBLIC_API_URL must be your computer's LAN IP, not localhost
npx expo start                # scan the QR code with Expo Go
```

Find your LAN IP with `ipconfig` (Windows) or `ipconfig getifaddr en0` (Mac). The phone and the
computer must be on the same Wi-Fi.

### APK for the defense

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview      # produces an installable .apk
```

Do this in the first week. The first build needs credential setup and queues for a while.

## What maps to what in the manuscript

| Manuscript | Code |
|---|---|
| Fig. 3.7 ERD | `api/prisma/schema.prisma` |
| Table 1 competency mapping | `api/src/common/game-config.ts` → `COMPETENCIES` |
| Table 2 level rules | `api/src/common/game-config.ts` → `LEVELS`, used by both app and API |
| Stars, points, highest score | `api/src/common/scoring.ts` |
| Lesson before every game | `mobile/app/lesson/[game]/[level].tsx` blocks the route to play |
| Offline play and sync | `mobile/src/lib/db.ts` (SQLite cache + outbox), `POST /sessions/sync` |
| Most-missed items report | `session_answers` table → `api/src/reports` |

## Build order suggestion (20 days to Oct 15)

1. API auth + content endpoints, database seeded, deployed to Railway or Render.
2. Mobile login → home → levels → lesson → Pagbigkas ng Titik, on a real phone.
3. The other two mini-games.
4. Offline cache and sync.
5. Teacher module: word bank, lessons, pupils, reports.
6. First APK, then evaluation instruments and user acceptance testing.
