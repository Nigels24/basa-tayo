-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TEACHER', 'PUPIL');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('TITIK', 'LARAWAN', 'BUUIN');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "password_hash" TEXT,
    "school" TEXT,
    "login_code" TEXT,
    "section" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "teacher_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "competency_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "say" TEXT,
    "audio_url" TEXT,
    "example_word_id" INTEGER,
    "game_type" "GameType" NOT NULL,
    "level" "Level" NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "words" (
    "id" SERIAL NOT NULL,
    "filipino_word" TEXT NOT NULL,
    "syllables" TEXT[],
    "theme" "Theme" NOT NULL,
    "level" "Level" NOT NULL,
    "image_url" TEXT,
    "emoji" TEXT,
    "audio_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "game_type" "GameType" NOT NULL,
    "level" "Level" NOT NULL,
    "lesson_id" INTEGER,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_words" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "word_id" INTEGER NOT NULL,

    CONSTRAINT "game_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" SERIAL NOT NULL,
    "pupil_id" INTEGER NOT NULL,
    "game_id" INTEGER NOT NULL,
    "level" "Level" NOT NULL,
    "correct_count" INTEGER NOT NULL,
    "item_count" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_id" TEXT NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_answers" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "pupil_id" INTEGER NOT NULL,
    "word_id" INTEGER,
    "prompt" TEXT NOT NULL,
    "given_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "session_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" SERIAL NOT NULL,
    "pupil_id" INTEGER NOT NULL,
    "game_id" INTEGER NOT NULL,
    "level" "Level" NOT NULL,
    "highest_score" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" SERIAL NOT NULL,
    "pupil_id" INTEGER NOT NULL,
    "badge_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_login_code_key" ON "users"("login_code");

-- CreateIndex
CREATE INDEX "lessons_game_type_level_idx" ON "lessons"("game_type", "level");

-- CreateIndex
CREATE UNIQUE INDEX "words_filipino_word_key" ON "words"("filipino_word");

-- CreateIndex
CREATE INDEX "words_level_idx" ON "words"("level");

-- CreateIndex
CREATE UNIQUE INDEX "games_game_type_level_key" ON "games"("game_type", "level");

-- CreateIndex
CREATE UNIQUE INDEX "game_words_game_id_word_id_key" ON "game_words"("game_id", "word_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_client_id_key" ON "game_sessions"("client_id");

-- CreateIndex
CREATE INDEX "game_sessions_pupil_id_played_at_idx" ON "game_sessions"("pupil_id", "played_at");

-- CreateIndex
CREATE INDEX "session_answers_pupil_id_is_correct_idx" ON "session_answers"("pupil_id", "is_correct");

-- CreateIndex
CREATE UNIQUE INDEX "scores_pupil_id_game_id_level_key" ON "scores"("pupil_id", "game_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "badges_pupil_id_badge_key_key" ON "badges"("pupil_id", "badge_key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_example_word_id_fkey" FOREIGN KEY ("example_word_id") REFERENCES "words"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "words" ADD CONSTRAINT "words_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_words" ADD CONSTRAINT "game_words_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_words" ADD CONSTRAINT "game_words_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_pupil_id_fkey" FOREIGN KEY ("pupil_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_pupil_id_fkey" FOREIGN KEY ("pupil_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_pupil_id_fkey" FOREIGN KEY ("pupil_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_pupil_id_fkey" FOREIGN KEY ("pupil_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
