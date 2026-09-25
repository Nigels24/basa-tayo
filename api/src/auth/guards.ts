import { CanActivate, ExecutionContext, Injectable, createParamDecorator } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtUser } from './jwt.strategy';

/** Any signed-in user (teacher or pupil) */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/** Only accounts with the TEACHER role reach content management and reporting */
@Injectable()
export class TeacherGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;
    const user: JwtUser = context.switchToHttp().getRequest().user;
    return user?.role === 'TEACHER';
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
