import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CurrentUser, TeacherGuard } from '../auth/guards';
import { JwtUser } from '../auth/jwt.strategy';

@UseGuards(TeacherGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtUser) {
    return this.reports.summary(user.id);
  }

  @Get('class')
  classScores(@CurrentUser() user: JwtUser) {
    return this.reports.classScores(user.id);
  }

  @Get('recent')
  recent(@CurrentUser() user: JwtUser) {
    return this.reports.recent(user.id);
  }

  @Get('missed')
  missed(@CurrentUser() user: JwtUser, @Query('limit') limit?: string) {
    return this.reports.missedItems(user.id, undefined, limit ? Number(limit) : 10);
  }

  @Get('pupil/:id')
  pupil(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.reports.pupil(user.id, id);
  }
}
