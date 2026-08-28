import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../authenticated-user.interface';
import { TENANT_SCOPED_KEY } from '../decorators/tenant-scoped.decorator';

type TenantRequest = {
  user?: AuthenticatedUser;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isTenantScoped = this.reflector.getAllAndOverride<boolean>(TENANT_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isTenantScoped) return true;

    const request = context.switchToHttp().getRequest<TenantRequest & { params: Record<string, unknown> }>();
    if (typeof request.params?.bid === 'string' && !request.params.tenantId) request.params.tenantId = request.params.bid;
    const requestedTenantId = this.getRequestedTenantId(request);
    if (!request.user || !requestedTenantId || request.user.bid !== requestedTenantId) {
      throw new ForbiddenException('Cross-business access is not allowed');
    }
    return true;
  }

  private getRequestedTenantId(request: TenantRequest): string | undefined {
    const fromHeader = request.headers?.['x-tenant-id'];
    const value = request.params?.tenantId ?? request.query?.tenantId ?? request.body?.tenantId ?? fromHeader;
    return Array.isArray(value) ? value[0] : typeof value === 'string' ? value : undefined;
  }
}
