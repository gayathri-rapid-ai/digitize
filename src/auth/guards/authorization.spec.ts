import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../authenticated-user.interface';
import { Roles } from '../decorators/roles.decorator';
import { TenantScoped } from '../decorators/tenant-scoped.decorator';
import { Role } from '../roles.enum';
import { RolesGuard } from './roles.guard';
import { TenantGuard } from './tenant.guard';

class ProtectedHandlers {
  @Roles(Role.ADMIN)
  adminOnly() {}

  @TenantScoped()
  tenantResource() {}
}

function contextFor(
  handler: Function,
  request: Record<string, unknown>,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ProtectedHandlers,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const tenantAStaff: AuthenticatedUser = { id: 'user-1', tenantId: 'tenant-a', role: Role.STAFF };
const tenantAAdmin: AuthenticatedUser = { id: 'user-2', tenantId: 'tenant-a', role: Role.ADMIN };

describe('authorization guards', () => {
  const reflector = new Reflector();

  describe('RolesGuard', () => {
    const guard = new RolesGuard(reflector);

    it('denies STAFF from an ADMIN endpoint', () => {
      expect(guard.canActivate(contextFor(ProtectedHandlers.prototype.adminOnly, { user: tenantAStaff }))).toBe(false);
    });

    it('allows ADMIN and OWNER to an ADMIN endpoint', () => {
      const owner = { ...tenantAAdmin, role: Role.OWNER };
      expect(guard.canActivate(contextFor(ProtectedHandlers.prototype.adminOnly, { user: tenantAAdmin }))).toBe(true);
      expect(guard.canActivate(contextFor(ProtectedHandlers.prototype.adminOnly, { user: owner }))).toBe(true);
    });
  });

  describe('TenantGuard', () => {
    const guard = new TenantGuard(reflector);

    it('allows a request for the JWT tenant', () => {
      const request = { user: tenantAStaff, params: { tenantId: 'tenant-a' } };
      expect(guard.canActivate(contextFor(ProtectedHandlers.prototype.tenantResource, request))).toBe(true);
    });

    it('rejects a cross-tenant URL even for an authenticated user', () => {
      const request = { user: tenantAStaff, params: { tenantId: 'tenant-b' } };
      expect(() => guard.canActivate(contextFor(ProtectedHandlers.prototype.tenantResource, request))).toThrow(
        'Cross-tenant access is not allowed',
      );
    });

    it('rejects a tenant-scoped request without a tenant id', () => {
      expect(() => guard.canActivate(contextFor(ProtectedHandlers.prototype.tenantResource, { user: tenantAStaff }))).toThrow(
        'Cross-tenant access is not allowed',
      );
    });
  });
});
