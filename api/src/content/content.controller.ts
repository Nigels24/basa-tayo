import { Controller, Get, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { CurrentUser, JwtAuthGuard, PupilGuard } from '../auth/guards';
import { JwtUser } from '../auth/jwt.strategy';

@Controller('content')
export class ContentController {
  constructor(private content: ContentService) {}

  /** Downloaded once, then cached on the device for offline play. */
  @UseGuards(JwtAuthGuard)
  @Get('bundle')
  bundle() {
    return this.content.bundle();
  }

  @UseGuards(PupilGuard)
  @Get('progress')
  progress(@CurrentUser() user: JwtUser) {
    return this.content.progress(user.id);
  }
}
