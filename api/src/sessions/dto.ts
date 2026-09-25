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

export class SyncSessionsDto {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => SyncSessionDto)
  sessions: SyncSessionDto[];
}
