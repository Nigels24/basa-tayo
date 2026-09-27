import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportFilter, ReportsService } from './reports.service';
import { manilaDayStart, manilaToday } from './csv';
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

  @Get('export/sessions.csv')
  async exportSessions(@CurrentUser() user: JwtUser, @Query() q: Record<string, string>, @Res({ passthrough: true }) res: Response) {
    const filter = exportFilter(q);
    sendCsv(res, 'sessions');
    return this.reports.exportSessions(user.id, filter);
  }

  @Get('export/answers.csv')
  async exportAnswers(@CurrentUser() user: JwtUser, @Query() q: Record<string, string>, @Res({ passthrough: true }) res: Response) {
    const filter = exportFilter(q);
    sendCsv(res, 'answers');
    return this.reports.exportAnswers(user.id, filter);
  }
}

/** ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, Asia/Manila days), ?pupilId=, ?anonymize=true */
function exportFilter(q: Record<string, string>): ExportFilter {
  const day = (name: string) => {
    if (!q[name]) return undefined;
    const d = manilaDayStart(q[name]);
    if (!d) throw new BadRequestException(`${name} must be a date like 2026-09-27`);
    return d;
  };
  const from = day('from');
  const toStart = day('to');
  const to = toStart ? new Date(toStart.getTime() + 86400000) : undefined;
  if (from && to && from >= to) throw new BadRequestException('from must not be after to');

  let pupilId: number | undefined;
  if (q.pupilId) {
    pupilId = Number(q.pupilId);
    if (!Number.isInteger(pupilId) || pupilId <= 0) throw new BadRequestException('pupilId must be a number');
  }
  return { from, to, pupilId, anonymize: q.anonymize === 'true' };
}

function sendCsv(res: Response, kind: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="basa-tayo-${kind}-${manilaToday()}.csv"`);
}
