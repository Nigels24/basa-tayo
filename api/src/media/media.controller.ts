import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { SignatureDto } from './dto';
import { TeacherGuard } from '../auth/guards';

@UseGuards(TeacherGuard)
@Controller('media')
export class MediaController {
  constructor(private media: MediaService) {}

  @Post('signature')
  @HttpCode(200)
  signature(@Body() dto: SignatureDto) {
    return this.media.signature(dto.kind);
  }
}
