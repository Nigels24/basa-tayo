import { Body, Controller, Get, HttpCode, Ip, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChangePasswordDto, PupilLoginDto, RegisterTeacherDto, TeacherLoginDto, UpdateProfileDto } from './dto';
import { CurrentUser, TeacherGuard } from './guards';
import { JwtUser } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('teacher/login')
  teacher(@Body() dto: TeacherLoginDto, @Ip() ip: string) {
    return this.auth.loginTeacher(dto.username, dto.password, ip);
  }

  @Post('pupil/login')
  pupil(@Body() dto: PupilLoginDto) {
    return this.auth.loginPupil(dto.code);
  }

  /** Public: whether the sign-up page is open. Never reveals the code. */
  @Get('registration-status')
  registrationStatus() {
    return { open: this.auth.registrationOpen() };
  }

  @Post('register-teacher')
  register(@Body() dto: RegisterTeacherDto, @Ip() ip: string) {
    return this.auth.registerTeacher(dto, ip);
  }

  @UseGuards(TeacherGuard)
  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.auth.me(user.id);
  }

  @UseGuards(TeacherGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  @UseGuards(TeacherGuard)
  @Post('change-password')
  @HttpCode(200)
  changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }
}
