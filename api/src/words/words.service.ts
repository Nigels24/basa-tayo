import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GameType, Level, Theme } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { WordDto } from './dto';

@Injectable()
export class WordsService {
  constructor(private prisma: PrismaService) {}

  list(filters: { level?: Level; theme?: Theme; gameType?: GameType; q?: string }) {
    return this.prisma.word.findMany({
      where: {
        level: filters.level,
        theme: filters.theme,
        filipinoWord: filters.q ? { contains: filters.q, mode: 'insensitive' } : undefined,
        gameWords: filters.gameType ? { some: { game: { gameType: filters.gameType } } } : undefined,
      },
      include: { gameWords: { include: { game: { select: { gameType: true, level: true } } } } },
      orderBy: { filipinoWord: 'asc' },
    });
  }

  async create(teacherId: number, dto: WordDto) {
    this.checkSyllables(dto);
    const word = await this.prisma.word.create({
      data: {
        filipinoWord: dto.word.toLowerCase(),
        syllables: dto.syllables,
        theme: dto.theme as Theme,
        level: dto.level as Level,
        emoji: dto.emoji,
        imageUrl: dto.imageUrl,
        audioUrl: dto.audioUrl,
        createdById: teacherId,
      },
    });
    await this.assignGames(word.id, dto.level as Level, dto.gameTypes as GameType[]);
    return word;
  }

  async update(id: number, dto: WordDto) {
    this.checkSyllables(dto);
    const exists = await this.prisma.word.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Word not found');

    const word = await this.prisma.word.update({
      where: { id },
      data: {
        filipinoWord: dto.word.toLowerCase(),
        syllables: dto.syllables,
        theme: dto.theme as Theme,
        level: dto.level as Level,
        emoji: dto.emoji,
        imageUrl: dto.imageUrl,
        audioUrl: dto.audioUrl,
      },
    });
    await this.prisma.gameWord.deleteMany({ where: { wordId: id } });
    await this.assignGames(id, dto.level as Level, dto.gameTypes as GameType[]);
    return word;
  }

  /** Soft delete — past results stay readable in the reports. */
  async remove(id: number) {
    await this.prisma.gameWord.deleteMany({ where: { wordId: id } });
    return this.prisma.word.update({ where: { id }, data: { active: false } });
  }

  private checkSyllables(dto: WordDto) {
    const joined = dto.syllables.join('').toLowerCase();
    if (joined !== dto.word.toLowerCase()) {
      throw new BadRequestException(`The syllables "${dto.syllables.join('-')}" don't spell "${dto.word}"`);
    }
  }

  /** A word belongs to the mini-games the teacher ticked, at its own level. */
  private async assignGames(wordId: number, level: Level, gameTypes: GameType[]) {
    for (const gameType of gameTypes) {
      const game = await this.prisma.game.upsert({
        where: { gameType_level: { gameType, level } },
        create: { gameType, level },
        update: {},
      });
      await this.prisma.gameWord.upsert({
        where: { gameId_wordId: { gameId: game.id, wordId } },
        create: { gameId: game.id, wordId },
        update: {},
      });
    }
  }
}
