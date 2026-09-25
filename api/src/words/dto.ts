import { ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class WordDto {
  @IsString() @IsNotEmpty() word: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) syllables: string[];
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) theme: string;
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']) level: string;
  @IsArray() @ArrayNotEmpty() @IsIn(['TITIK', 'LARAWAN', 'BUUIN'], { each: true }) gameTypes: string[];
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() audioUrl?: string;
}
