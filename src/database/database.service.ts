import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL ?? this.localConnectionString();
    if (!connectionString) throw new Error('DATABASE_URL must be set to use PostgreSQL');
    this.pool = new Pool({ connectionString });
  }

  async query<T extends QueryResultRow>(sql: string, values: unknown[] = []): Promise<T[]> {
    try {
      const result = await this.pool.query<T>(sql, values);
      return result.rows;
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'ECONNREFUSED') {
        throw new ServiceUnavailableException('PostgreSQL is unavailable. Run `npm run db:up` before starting the local API.');
      }
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> { await this.pool.end(); }

  private localConnectionString(): string | undefined {
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) return undefined;
    const user = encodeURIComponent(process.env.POSTGRES_USER ?? 'digitize');
    const database = encodeURIComponent(process.env.POSTGRES_DB ?? 'digitize');
    const host = process.env.POSTGRES_HOST ?? 'localhost';
    const port = process.env.POSTGRES_PORT ?? '5432';
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }
}
