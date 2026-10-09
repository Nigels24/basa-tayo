import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { AttemptLimiter } from './rate-limit';
import { ChangePasswordDto, RegisterTeacherDto, UpdateProfileDto } from './dto';

const WINDOW = 15 * 60000;
const TOO_MANY_LOGINS = 'Masyadong maraming maling pag-log in. Maghintay ng 15 minuto bago subukan muli.';
const TOO_MANY_REGISTERS = 'Masyadong maraming maling pagsubok. Maghintay ng 15 minuto bago subukan muli.';
const USERNAME_TAKEN = 'Gamit na ang username na ito';

/** Same cost as the seeded teacher account. */
export const hashPassword = (password: string) => bcrypt.hash(password, 10);

/** Usernames are stored in lowercase; this also finds older mixed-case ones. */
export function findTeacherByUsername(prisma: PrismaService, username: string) {
  return prisma.user.findFirst({ where: { role: 'TEACHER', username: { equals: username.trim(), mode: 'insensitive' } } });
}

/** Constant-time comparison; hashing first keeps the lengths equal. */
function sameSecret(a: string, b: string) {
  const digest = (s: string) => createHash('sha256').update(s, 'utf8').digest();
  return timingSafeEqual(digest(a), digest(b));
}

function teacherProfile(user: User) {
  return { id: user.id, name: user.name, username: user.username, school: user.school, section: user.section };
}

@Injectable()
export class AuthService {
  // Failed attempts only: a class signing up on one school Wi-Fi is not blocked by its own successes.
  private loginByUser = new AttemptLimiter(10, WINDOW);
  private loginByIp = new AttemptLimiter(30, WINDOW);
  private registerByIp = new AttemptLimiter(10, WINDOW);
  // Backstop against guessing the code from many IPs (or a spoofed X-Forwarded-For).
  private registerAll = new AttemptLimiter(100, WINDOW);
  private passwordByUser = new AttemptLimiter(10, WINDOW);

  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  /** Teachers sign in with a username and password (hashed with bcrypt). */
  async loginTeacher(username: string, password: string, ip: string) {
    const userKey = username.trim().toLowerCase();
    this.loginByIp.check(ip, TOO_MANY_LOGINS);
    this.loginByUser.check(userKey, TOO_MANY_LOGINS);

    const user = await findTeacherByUsername(this.prisma, username);
    const ok = !!user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !ok) {
      this.loginByIp.fail(ip);
      this.loginByUser.fail(userKey);
      throw new UnauthorizedException('Mali ang username o password');
    }
    if (!user.active) throw new UnauthorizedException('Hindi aktibo ang account na ito. Makipag-ugnayan sa mga researcher.');

    this.loginByUser.reset(userKey);
    return this.session(user);
  }

  /** Sign-up is open only while TEACHER_REGISTRATION_CODE is set. */
  registrationOpen() {
    return !!this.registrationCode();
  }

  /** A teacher creates her own account with the code the researchers gave at orientation. */
  async registerTeacher(dto: RegisterTeacherDto, ip: string) {
    const code = this.registrationCode();
    if (!code) throw new ForbiddenException('Sarado ang registration');
    this.registerByIp.check(ip, TOO_MANY_REGISTERS);
    this.registerAll.check('all', TOO_MANY_REGISTERS);

    if (!sameSecret(dto.registrationCode.trim(), code)) {
      this.registerByIp.fail(ip);
      this.registerAll.fail('all');
      throw new ForbiddenException('Mali ang registration code');
    }

    if (await findTeacherByUsername(this.prisma, dto.username)) throw new ConflictException(USERNAME_TAKEN);
    try {
      const user = await this.prisma.user.create({
        data: {
          role: 'TEACHER',
          name: dto.fullName,
          school: dto.school,
          section: dto.section || null,
          username: dto.username,
          passwordHash: await hashPassword(dto.password),
          active: true,
        },
      });
      return this.session(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(USERNAME_TAKEN);
      throw e;
    }
  }

  async me(teacherId: number) {
    return teacherProfile(await this.teacher(teacherId));
  }

  async updateProfile(teacherId: number, dto: UpdateProfileDto) {
    await this.teacher(teacherId);
    const user = await this.prisma.user.update({
      where: { id: teacherId },
      data: { name: dto.fullName, school: dto.school, section: dto.section || null },
    });
    return teacherProfile(user);
  }

  /** 400 (not 401) for a wrong current password, so the web app does not log her out. */
  async changePassword(teacherId: number, dto: ChangePasswordDto) {
    const key = String(teacherId);
    this.passwordByUser.check(key, TOO_MANY_LOGINS);
    const user = await this.teacher(teacherId);
    if (!user.passwordHash || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      this.passwordByUser.fail(key);
      throw new BadRequestException('Mali ang kasalukuyang password');
    }
    if (dto.currentPassword === dto.newPassword) throw new BadRequestException('Ang bagong password ay dapat iba sa kasalukuyan');

    await this.prisma.user.update({ where: { id: teacherId }, data: { passwordHash: await hashPassword(dto.newPassword) } });
    this.passwordByUser.reset(key);
    return { ok: true };
  }

  /** Pupils sign in with the short code their teacher issued — no email, no password. */
  async loginPupil(code: string) {
    const pupil = await this.prisma.user.findUnique({
      where: { loginCode: code },
      include: { teacher: { select: { id: true, name: true } } },
    });
    if (!pupil || pupil.role !== 'PUPIL' || !pupil.active) {
      throw new UnauthorizedException('Mali ang code. Subukan muli.');
    }

    return {
      token: await this.sign(pupil.id, 'PUPIL'),
      pupil: {
        id: pupil.id,
        name: pupil.name,
        section: pupil.section,
        teacher: pupil.teacher?.name ?? null,
      },
    };
  }

  private registrationCode() {
    return (process.env.TEACHER_REGISTRATION_CODE ?? '').trim();
  }

  private async teacher(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== 'TEACHER') throw new NotFoundException('Hindi mahanap ang account');
    return user;
  }

  /** Login and sign-up return the same payload, so the web app signs her in either way. */
  private async session(user: User) {
    return { token: await this.sign(user.id, 'TEACHER'), teacher: teacherProfile(user) };
  }

  private sign(sub: number, role: 'TEACHER' | 'PUPIL') {
    return this.jwt.signAsync({ sub, role });
  }
}
