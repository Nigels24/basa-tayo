import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PupilDto } from './dto';

@Injectable()
export class PupilsService {
  constructor(private prisma: PrismaService) {}

  /** A teacher only ever sees the pupils of her own class. */
  async list(teacherId: number) {
    const pupils = await this.prisma.user.findMany({
      where: { role: 'PUPIL', teacherId },
      include: { _count: { select: { sessions: true } }, scores: { select: { stars: true } } },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    return pupils.map((p) => ({
      id: p.id,
      name: p.name,
      loginCode: p.loginCode,
      section: p.section,
      active: p.active,
      sessions: p._count.sessions,
      stars: p.scores.reduce((a, s) => a + s.stars, 0),
    }));
  }

  async create(teacherId: number, dto: PupilDto) {
    return this.prisma.user.create({
      data: {
        role: 'PUPIL',
        name: dto.name,
        section: dto.section,
        loginCode: dto.loginCode ?? (await this.freeCode()),
        teacherId,
      },
    });
  }

  async update(teacherId: number, id: number, dto: Partial<PupilDto> & { active?: boolean }) {
    const pupil = await this.prisma.user.findFirst({ where: { id, teacherId, role: 'PUPIL' } });
    if (!pupil) throw new NotFoundException('Pupil not found in your class');

    return this.prisma.user.update({
      where: { id },
      data: { name: dto.name, section: dto.section, loginCode: dto.loginCode, active: dto.active },
    });
  }

  /** A 4-digit code nobody else is using. */
  async freeCode(): Promise<string> {
    for (let i = 0; i < 50; i++) {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const taken = await this.prisma.user.findUnique({ where: { loginCode: code } });
      if (!taken) return code;
    }
    throw new Error('Could not generate a free pupil code');
  }
}
