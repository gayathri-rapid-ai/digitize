import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';

export type Entity = Record<string, unknown> & { id: string; createdAt: string; updatedAt: string };
export type Resource = 'store-settings' | 'products' | 'collections' | 'inventory' | 'customers' | 'orders' | 'discounts';
type DatabaseEntity = { id: string; data: Record<string, unknown>; createdAt: Date; updatedAt: Date };

const tableByResource: Record<Resource, string> = {
  'store-settings': 'store_settings', products: 'products', collections: 'collections',
  inventory: 'inventory_items', customers: 'customers', orders: 'orders', discounts: 'discounts',
};

/** Hand-written PostgreSQL repository for all tenant-owned admin resources. */
@Injectable()
export class AdminStoreService {
  constructor(private readonly database: DatabaseService) {}

  async list(tenantId: string, resource: Resource): Promise<Entity[]> {
    const rows = await this.database.query<DatabaseEntity>(
      `SELECT id, data, created_at AS "createdAt", updated_at AS "updatedAt" FROM ${this.table(resource)} WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId],
    );
    return rows.map(this.entity);
  }

  async get(tenantId: string, resource: Resource, id: string): Promise<Entity> {
    const [row] = await this.database.query<DatabaseEntity>(
      `SELECT id, data, created_at AS "createdAt", updated_at AS "updatedAt" FROM ${this.table(resource)} WHERE tenant_id = $1 AND id = $2`, [tenantId, id],
    );
    if (!row) throw new NotFoundException(`${resource} ${id} was not found`);
    return this.entity(row);
  }

  async create(tenantId: string, resource: Resource, data: Record<string, unknown>): Promise<Entity> {
    const id = randomUUID();
    const [row] = await this.database.query<DatabaseEntity>(
      `INSERT INTO ${this.table(resource)} (id, tenant_id, data) VALUES ($1, $2, $3::jsonb)
       RETURNING id, data, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, tenantId, JSON.stringify(data)],
    );
    return this.entity(row);
  }

  async update(tenantId: string, resource: Resource, id: string, data: Record<string, unknown>): Promise<Entity> {
    const [row] = await this.database.query<DatabaseEntity>(
      `UPDATE ${this.table(resource)} SET data = data || $3::jsonb, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2 RETURNING id, data, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [tenantId, id, JSON.stringify(data)],
    );
    if (!row) throw new NotFoundException(`${resource} ${id} was not found`);
    return this.entity(row);
  }

  async remove(tenantId: string, resource: Resource, id: string): Promise<void> {
    const rows = await this.database.query<{ id: string }>(
      `DELETE FROM ${this.table(resource)} WHERE tenant_id = $1 AND id = $2 RETURNING id`, [tenantId, id],
    );
    if (!rows.length) throw new NotFoundException(`${resource} ${id} was not found`);
  }

  private table(resource: Resource): string { return tableByResource[resource]; }
  private entity = (row: DatabaseEntity): Entity => ({ ...row.data, id: row.id, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
}
