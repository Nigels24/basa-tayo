import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { GameType, Level, Theme } from '@prisma/client';
import { WordsService } from './words.service';
import { WordDto } from './dto';
import { CurrentUser, TeacherGuard } from '../auth/guards';
import { JwtUser } from '../auth/jwt.strategy';

@UseGuards(TeacherGuard)
@Controller('words')
export class WordsController {
  constructor(private words: WordsService) {}

  @Get()
  list(@Query('level') level?: Level, @Query('theme') theme?: Theme, @Query('gameType') gameType?: GameType, @Query('q') q?: string) {
    return this.words.list({ level, theme, gameType, q });
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: WordDto) {
    return this.words.create(user.id, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: WordDto) {
    return this.words.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.words.remove(id);
  }
}
