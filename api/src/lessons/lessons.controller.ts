import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonDto } from './dto';
import { CurrentUser, TeacherGuard } from '../auth/guards';
import { JwtUser } from '../auth/jwt.strategy';
import { COMPETENCIES } from '../common/game-config';

@UseGuards(TeacherGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private lessons: LessonsService) {}

  @Get()
  list() {
    return this.lessons.list();
  }

  /** The competency list the lesson form shows (Table 1). */
  @Get('competencies')
  competencies() {
    return COMPETENCIES;
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: LessonDto) {
    return this.lessons.create(user.id, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: LessonDto) {
    return this.lessons.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lessons.remove(id);
  }
}
