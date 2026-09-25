import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class PupilDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() @Length(4, 8) loginCode?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
