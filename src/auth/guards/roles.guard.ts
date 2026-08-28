import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../authenticated-user.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../roles.enum';

const roleRank: Record<Role, number> = {
  [Role.STAFF]: 1,
  [Role.ADMIN]: 2,
  [Role.OWNER]: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    return Boolean(user && required.some((role) => roleRank[user.role] >= roleRank[role]));
  }
}
