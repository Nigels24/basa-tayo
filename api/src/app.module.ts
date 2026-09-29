import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { WordsModule } from './words/words.module';
import { LessonsModule } from './lessons/lessons.module';
import { PupilsModule } from './pupils/pupils.module';
import { SessionsModule } from './sessions/sessions.module';
import { ReportsModule } from './reports/reports.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ContentModule,
    WordsModule,
    LessonsModule,
    PupilsModule,
    SessionsModule,
    ReportsModule,
    MediaModule,
  ],
})
export class AppModule {}
