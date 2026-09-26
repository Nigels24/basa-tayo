import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SyncAnswerDto {
  @IsOptional() @IsInt() wordId?: number;
  @IsString() prompt: string; // what was asked, e.g. "B — bahay"
  @IsOptional() @IsString() given?: string;
  @IsBoolean() isCorrect: boolean;
}

export class SyncSessionDto {
  @IsString() clientId: string; // uuid generated on the device
  @IsIn(['TITIK', 'LARAWAN', 'BUUIN']) gameType: string;
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']) level: string;
  @IsISO8601() playedAt: string;

  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => SyncAnswerDto)
  answers: SyncAnswerDto[];
}

/**
 * Only the batch itself is validated here. Each session is validated on its
 * own in SessionsService, so one malformed round is rejected alone instead of
 * failing the whole request with a 400.
 */
export class SyncSessionsDto {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(100)
  sessions: unknown[];
}

/** Per-session outcome returned by POST /sessions/sync (always HTTP 200). */
export type SyncOutcome =
  | {
      clientId: string;
      status: 'ok' | 'duplicate';
      sessionId: number;
      stars: number;
      score: number;
      accuracy: number;
      isNewBest: boolean;
      newBadges: { key: string; name: string; description: string }[];
    }
  | { clientId: string; status: 'rejected'; reason: string }
  | { clientId: string; status: 'failed'; reason: string };
