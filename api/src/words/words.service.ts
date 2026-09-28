import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GameType, Level, Prisma, Theme } from '@prisma/client';
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
    this.checkEmoji(dto);
    const filipinoWord = dto.word.toLowerCase();

    // Re-adding a deleted word brings its row back with the new values, so
    // past results stay linked to the same word.
    const deleted = await this.prisma.word.findFirst({ where: { filipinoWord, active: false } });
    if (deleted) {
      const word = await this.prisma.word.update({ where: { id: deleted.id }, data: { ...wordData(dto), active: true } });
      await this.prisma.gameWord.deleteMany({ where: { wordId: word.id } });
      await this.assignGames(word.id, dto.level as Level, dto.gameTypes as GameType[]);
      return word;
    }

    const word = await this.prisma.word.create({
      data: { ...wordData(dto), createdById: teacherId },
    }).catch(duplicateWord);
    await this.assignGames(word.id, dto.level as Level, dto.gameTypes as GameType[]);
    return word;
  }

  async update(id: number, dto: WordDto) {
    this.checkSyllables(dto);
    const exists = await this.prisma.word.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Word not found');
    this.checkEmoji(dto);

    // Renaming onto a deleted word's name would clash with its hidden row; say so instead of merging.
    const clash = await this.prisma.word.findFirst({ where: { filipinoWord: dto.word.toLowerCase(), id: { not: id }, active: false } });
    if (clash) {
      throw new ConflictException('Ang salitang ito ay nasa mga binurang salita. Idagdag ito muli gamit ang "+ Add word".');
    }

    const word = await this.prisma.word.update({ where: { id }, data: wordData(dto) }).catch(duplicateWord);
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

  /** One picture = one emoji. Grapheme count keeps 👨‍👩‍👧, 👋🏽 and flags as one. */
  private checkEmoji(dto: WordDto) {
    if (dto.emoji && [...graphemes.segment(dto.emoji)].length > 1) {
      throw new BadRequestException('Isang emoji lang ang puwede.');
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

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** The editable columns, shared by create, re-add and update. */
function wordData(dto: WordDto) {
  return {
    filipinoWord: dto.word.toLowerCase(),
    syllables: dto.syllables,
    theme: dto.theme as Theme,
    level: dto.level as Level,
    emoji: dto.emoji,
    imageUrl: dto.imageUrl,
    audioUrl: dto.audioUrl,
  };
}

/** filipino_word is unique: a clash is the teacher's mistake (409), not a server error. */
function duplicateWord(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && String(e.meta?.target ?? '').includes('filipino_word')) {
    throw new ConflictException('Mayroon na ang salitang ito sa Word Bank.');
  }
  throw e;
}
