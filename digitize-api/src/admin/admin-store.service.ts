import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
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
@Injectable({ scope: Scope.REQUEST })
export class AdminStoreService {
  constructor(private readonly database: DatabaseService, @Inject(REQUEST) private readonly request: { params: { storeId?: string } }) {}

  async list(tenantId: string, resource: Resource): Promise<Entity[]> {
    const rows = await this.database.query<DatabaseEntity>(
      `SELECT id, data, created_at AS "createdAt", updated_at AS "updatedAt" FROM ${this.table(resource)} WHERE tenant_id = $1 AND store_id = $2 ORDER BY created_at DESC`, [tenantId, this.storeId()],
    );
    return rows.map(this.entity);
  }

  async get(tenantId: string, resource: Resource, id: string): Promise<Entity> {
    const [row] = await this.database.query<DatabaseEntity>(
      `SELECT id, data, created_at AS "createdAt", updated_at AS "updatedAt" FROM ${this.table(resource)} WHERE tenant_id = $1 AND store_id = $2 AND id = $3`, [tenantId, this.storeId(), id],
    );
    if (!row) throw new NotFoundException(`${resource} ${id} was not found`);
    return this.entity(row);
  }

  async create(tenantId: string, resource: Resource, data: Record<string, unknown>): Promise<Entity> {
    const id = randomUUID();
    const [row] = await this.database.query<DatabaseEntity>(
      `INSERT INTO ${this.table(resource)} (id, tenant_id, store_id, data) VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, data, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, tenantId, this.storeId(), JSON.stringify(data)],
    );
    return this.entity(row);
  }

  async update(tenantId: string, resource: Resource, id: string, data: Record<string, unknown>): Promise<Entity> {
    const [row] = await this.database.query<DatabaseEntity>(
      `UPDATE ${this.table(resource)} SET data = data || $4::jsonb, updated_at = NOW()
       WHERE tenant_id = $1 AND store_id = $2 AND id = $3 RETURNING id, data, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [tenantId, this.storeId(), id, JSON.stringify(data)],
    );
    if (!row) throw new NotFoundException(`${resource} ${id} was not found`);
    return this.entity(row);
  }

  async remove(tenantId: string, resource: Resource, id: string): Promise<void> {
    const rows = await this.database.query<{ id: string }>(
      `DELETE FROM ${this.table(resource)} WHERE tenant_id = $1 AND store_id = $2 AND id = $3 RETURNING id`, [tenantId, this.storeId(), id],
    );
    if (!rows.length) throw new NotFoundException(`${resource} ${id} was not found`);
  }

  private table(resource: Resource): string { return tableByResource[resource]; }
  private storeId(): string { if (!this.request.params.storeId) throw new Error('Store scope is missing'); return this.request.params.storeId; }
  private entity = (row: DatabaseEntity): Entity => ({ ...row.data, id: row.id, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
}
