import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PupilDto } from './dto';

const CODE_TAKEN = 'Gamit na ang code na ito';

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
    if (dto.loginCode) await this.assertCodeFree(dto.loginCode);
    const loginCode = dto.loginCode ?? (await this.freeCode());
    return this.saving(() =>
      this.prisma.user.create({ data: { role: 'PUPIL', name: dto.name, section: dto.section, loginCode, teacherId } }),
    );
  }

  async update(teacherId: number, id: number, dto: Partial<PupilDto> & { active?: boolean }) {
    const pupil = await this.prisma.user.findFirst({ where: { id, teacherId, role: 'PUPIL' } });
    if (!pupil) throw new NotFoundException('Pupil not found in your class');
    if (dto.loginCode && dto.loginCode !== pupil.loginCode) await this.assertCodeFree(dto.loginCode, id);

    return this.saving(() =>
      this.prisma.user.update({
        where: { id },
        data: { name: dto.name, section: dto.section, loginCode: dto.loginCode, active: dto.active },
      }),
    );
  }

  /** Codes are unique across every teacher's class; the message never says whose pupil has it. */
  private async assertCodeFree(code: string, exceptId?: number) {
    const taken = await this.prisma.user.findUnique({ where: { loginCode: code }, select: { id: true } });
    if (taken && taken.id !== exceptId) throw new ConflictException(CODE_TAKEN);
  }

  /** Two teachers saving the same code at once: the unique index decides, with the same message. */
  private async saving<T>(write: () => Promise<T>) {
    try {
      return await write();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(CODE_TAKEN);
      throw e;
    }
  }

  /** A 4-digit code no pupil of any teacher is using (the check is global, not per class). */
  async freeCode(): Promise<string> {
    for (let i = 0; i < 50; i++) {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const taken = await this.prisma.user.findUnique({ where: { loginCode: code } });
      if (!taken) return code;
    }
    throw new Error('Could not generate a free pupil code');
  }
}
