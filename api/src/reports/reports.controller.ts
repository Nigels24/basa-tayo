import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportFilter, ReportsService } from './reports.service';
import { dayRange, manilaToday } from './csv';
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

  /** ?from=&to= as in the pupil report; no dates = all time. */
  @Get('class')
  classScores(@CurrentUser() user: JwtUser, @Query() q: Record<string, string>) {
    return this.reports.classScores(user.id, dayRange(q));
  }

  /** Everything the printable class report needs in one call; ?details=1 adds every pupil's full report. */
  @Get('class-report')
  classReport(@CurrentUser() user: JwtUser, @Query() q: Record<string, string>) {
    return this.reports.classReport(user.id, dayRange(q), q.details === '1' || q.details === 'true');
  }

  @Get('recent')
  recent(@CurrentUser() user: JwtUser) {
    return this.reports.recent(user.id);
  }

  @Get('missed')
  missed(@CurrentUser() user: JwtUser, @Query() q: Record<string, string>) {
    return this.reports.missedItems(user.id, undefined, q.limit ? Number(q.limit) : 10, dayRange(q));
  }

  /** ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, Asia/Manila days); no dates = all time. */
  @Get('pupil/:id')
  pupil(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number, @Query() q: Record<string, string>) {
    return this.reports.pupil(user.id, id, dayRange(q));
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
  const { from, to } = dayRange(q);

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
