import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SyncSessionsDto } from './dto';
import { CurrentUser, PupilGuard } from '../auth/guards';
import { JwtUser } from '../auth/jwt.strategy';

@Controller('sessions')
export class SessionsController {
  constructor(private sessions: SessionsService) {}

  /** The app posts every round it finished while offline. */
  @UseGuards(PupilGuard)
  @Post('sync')
  sync(@CurrentUser() user: JwtUser, @Body() dto: SyncSessionsDto) {
    return this.sessions.sync(user.id, dto);
  }
}
