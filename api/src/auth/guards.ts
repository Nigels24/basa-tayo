import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtUser } from './jwt.strategy';
import { PrismaService } from '../prisma.service';

/** Any signed-in user (teacher or pupil) */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Only active accounts with the TEACHER role reach content management and
 * reporting; a deactivated teacher's existing token stops working at once.
 */
@Injectable()
export class TeacherGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;
    const user: JwtUser = context.switchToHttp().getRequest().user;
    if (user?.role !== 'TEACHER') return false;
    const teacher = await this.prisma.user.findUnique({ where: { id: user.id }, select: { role: true, active: true } });
    if (!teacher || teacher.role !== 'TEACHER' || !teacher.active) throw new UnauthorizedException();
    return true;
  }
}

/** Only pupils — gameplay and sync endpoints */
@Injectable()
export class PupilGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;
    const user: JwtUser = context.switchToHttp().getRequest().user;
    return user?.role === 'PUPIL';
  }
}

/** Handy shortcut: @CurrentUser() user: JwtUser */
export const CurrentUser = createParamDecorator((_data, ctx: ExecutionContext): JwtUser => {
  return ctx.switchToHttp().getRequest().user;
});
