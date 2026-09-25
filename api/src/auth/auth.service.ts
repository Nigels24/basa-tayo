import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  /** Teachers sign in with a username and password (hashed with bcrypt). */
  async loginTeacher(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || user.role !== 'TEACHER' || !user.passwordHash) {
      throw new UnauthorizedException('Wrong username or password');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Wrong username or password');

    return {
      token: await this.sign(user.id, 'TEACHER'),
      teacher: { id: user.id, name: user.name, username: user.username, school: user.school },
    };
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

  private sign(sub: number, role: 'TEACHER' | 'PUPIL') {
    return this.jwt.signAsync({ sub, role });
  }
}
