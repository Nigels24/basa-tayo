import { Body, Controller, Post } from '@nestjs/common';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { AuthService } from './auth.service';

class TeacherLoginDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
}

class PupilLoginDto {
  @IsString() @Length(4, 8) code: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('teacher/login')
  teacher(@Body() dto: TeacherLoginDto) {
    return this.auth.loginTeacher(dto.username, dto.password);
  }

  @Post('pupil/login')
  pupil(@Body() dto: PupilLoginDto) {
    return this.auth.loginPupil(dto.code);
  }
}
