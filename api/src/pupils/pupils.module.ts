import { Module } from '@nestjs/common';
import { PupilsService } from './pupils.service';
import { PupilsController } from './pupils.controller';

@Module({
  controllers: [PupilsController],
  providers: [PupilsService],
})
export class PupilsModule {}
