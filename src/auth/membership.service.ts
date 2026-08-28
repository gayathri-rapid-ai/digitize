import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Role } from './roles.enum';

export interface TenantMembership {
  userId: string;
  tenantId: string;
  role: Role;
  active: boolean;
}

/** Resolves memberships on every request, so revocations and role changes apply immediately. */
@Injectable()
export class MembershipService {
  constructor(private readonly database: DatabaseService) {}

  async findActive(userId: string, tenantId: string): Promise<TenantMembership | undefined> {
    const [membership] = await this.database.query<TenantMembership>(
      `SELECT user_id AS "userId", tenant_id AS "tenantId", role, active
       FROM tenant_memberships WHERE user_id = $1 AND tenant_id = $2 AND active = TRUE`,
      [userId, tenantId],
    );
    return membership;
  }

  async findByTenant(tenantId: string): Promise<TenantMembership[]> {
    return this.database.query<TenantMembership>(
      `SELECT user_id AS "userId", tenant_id AS "tenantId", role, active
       FROM tenant_memberships WHERE tenant_id = $1 ORDER BY user_id`,
      [tenantId],
    );
  }

  // Used by the OWNER-only staff-management endpoint.
  async upsert(membership: TenantMembership): Promise<void> {
    await this.database.query(
      `INSERT INTO tenant_memberships (user_id, tenant_id, role, active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role, active = EXCLUDED.active`,
      [membership.userId, membership.tenantId, membership.role, membership.active],
    );
  }
}
