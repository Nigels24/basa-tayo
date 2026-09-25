import { Injectable } from '@nestjs/common';
import { GameType, Level } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { LessonDto } from './dto';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.lesson.findMany({
      include: { exampleWord: true },
      orderBy: [{ gameType: 'asc' }, { level: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async create(teacherId: number, dto: LessonDto) {
    const lesson = await this.prisma.lesson.create({
      data: { ...this.data(dto), createdById: teacherId },
    });
    await this.attachToGame(lesson.id, dto.gameType as GameType, dto.level as Level);
    return lesson;
  }

  async update(id: number, dto: LessonDto) {
    const lesson = await this.prisma.lesson.update({ where: { id }, data: this.data(dto) });
    await this.attachToGame(lesson.id, dto.gameType as GameType, dto.level as Level);
    return lesson;
  }

  async remove(id: number) {
    await this.prisma.game.updateMany({ where: { lessonId: id }, data: { lessonId: null } });
    return this.prisma.lesson.delete({ where: { id } });
  }

  private data(dto: LessonDto) {
    return {
      competencyCode: dto.competencyCode,
      title: dto.title,
      target: dto.target,
      body: dto.body,
      say: dto.say,
      audioUrl: dto.audioUrl,
      exampleWordId: dto.exampleWordId ?? null,
      gameType: dto.gameType as GameType,
      level: dto.level as Level,
    };
  }

  /** The lesson a pupil sees before a game is the newest one for that game and level. */
  private async attachToGame(lessonId: number, gameType: GameType, level: Level) {
    const game = await this.prisma.game.upsert({
      where: { gameType_level: { gameType, level } },
      create: { gameType, level, lessonId },
      update: { lessonId },
    });
    return game;
  }
}
