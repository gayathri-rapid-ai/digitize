import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL must be set to use PostgreSQL');
    this.pool = new Pool({ connectionString });
  }

  async query<T extends QueryResultRow>(sql: string, values: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query<T>(sql, values);
    return result.rows;
  }

  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
