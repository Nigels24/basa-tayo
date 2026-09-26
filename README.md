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

The build runs on Expo's servers (EAS). `mobile/eas.json` has three profiles:

| Profile | Output | Use it for |
|---|---|---|
| `preview` | installable `.apk` | **The defense** and user acceptance testing. Sideload it on any Android phone. |
| `production` | `.aab` app bundle | Only if the app ever goes to the Play Store. It cannot be installed directly. |
| `development` | dev-client `.apk` | Debugging native code. Needs `npx expo install expo-dev-client` first; Expo Go covers everyday work. |

**API URL.** `EXPO_PUBLIC_API_URL` is baked into the APK when it is built. At the defense the phone
will not be on your Wi-Fi, so the APK must point at the **deployed** API (Render/Railway), an
`https://` address, never a LAN IP or `localhost`. Android release builds also block plain `http`.
`mobile/.env` is gitignored, and EAS leaves gitignored files out of the upload, so the URL is set
as an EAS environment variable for the `preview` profile instead (step 4). Your local `.env` keeps
the LAN IP for Expo Go.

First build, in order:

```bash
cd mobile
npm install -g eas-cli                        # 1. install the EAS command-line tool
eas login                                     # 2. sign in to your expo.dev account
eas init                                      # 3. creates the project on expo.dev and writes its projectId into app.json
eas env:create --environment preview --name EXPO_PUBLIC_API_URL \
  --value https://YOUR-API.onrender.com/api --visibility plaintext   # 4. the deployed API URL
eas build -p android --profile preview        # 5. build the APK
```

- On the first build EAS asks **"Generate a new Android Keystore?"** Answer **yes**. EAS stores
  the keystore on expo.dev, and every later build signs with it so updates install over the old app.
  Don't delete it: a new keystore means the APK has to be uninstalled before the new one installs.
- Commit the `app.json` change that `eas init` makes (the `extra.eas.projectId` and `owner` fields).
- When the build finishes, the terminal prints a link and a QR code. Open it on the phone,
  download the `.apk`, and allow "Install unknown apps" when Android asks.
- Before the defense, raise `android.versionCode` in `app.json` (1 → 2 → …) for each APK you
  hand out, so it installs as an update.
- Later builds need only step 5. If the API URL changes, update it with
  `eas env:update --environment preview --variable-name EXPO_PUBLIC_API_URL`, then rebuild.

Do this in the first week. The first build queues for a while on the free plan.

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
