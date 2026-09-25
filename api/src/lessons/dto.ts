import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LessonDto {
  @IsString() @IsNotEmpty() competencyCode: string; // see COMPETENCIES in common/game-config.ts
  @IsString() @IsNotEmpty() title: string;
  @IsString() target: string;
  @IsString() body: string;
  @IsOptional() @IsString() say?: string;
  @IsOptional() @IsString() audioUrl?: string;
  @IsOptional() @IsInt() exampleWordId?: number;
  @IsIn(['TITIK', 'LARAWAN', 'BUUIN']) gameType: string;
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']) level: string;
}
