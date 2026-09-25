import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PupilsService } from './pupils.service';
import { PupilDto } from './dto';
import { CurrentUser, TeacherGuard } from '../auth/guards';
import { JwtUser } from '../auth/jwt.strategy';

@UseGuards(TeacherGuard)
@Controller('pupils')
export class PupilsController {
  constructor(private pupils: PupilsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.pupils.list(user.id);
  }

  /** Suggests a free log-in code for the "Register pupil" form. */
  @Get('new-code')
  async newCode() {
    return { code: await this.pupils.freeCode() };
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: PupilDto) {
    return this.pupils.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number, @Body() dto: PupilDto) {
    return this.pupils.update(user.id, id, dto);
  }
}
