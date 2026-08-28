const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
  const connectionString = process.env.DATABASE_URL || localConnectionString();
  if (!connectionString) throw new Error('DATABASE_URL or POSTGRES_PASSWORD is required');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const migrationDirectory = path.join(__dirname, '../migrations');
    const migrations = fs.readdirSync(migrationDirectory).filter((file) => file.endsWith('.sql')).sort();
    const renamedSchema = await client.query("SELECT to_regclass('public.businesses') AS name");
    if (renamedSchema.rows[0].name) {
      await client.query(fs.readFileSync(path.join(migrationDirectory, '004_business_naming.sql'), 'utf8'));
      for (const migration of migrations.filter((file) => file <= '004_business_naming.sql')) {
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [migration]);
      }
      console.log('Recovered the partial business rename and marked the existing schema as applied');
      return;
    }
    for (const migration of migrations) {
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [migration]);
      if (applied.rowCount) continue;
      await client.query(fs.readFileSync(path.join(migrationDirectory, migration), 'utf8'));
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [migration]);
      console.log(`Applied ${migration}`);
    }
  } finally {
    await client.end();
  }
}

function localConnectionString() {
  if (!process.env.POSTGRES_PASSWORD) return undefined;
  const user = encodeURIComponent(process.env.POSTGRES_USER || 'digitize');
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD);
  const database = encodeURIComponent(process.env.POSTGRES_DB || 'digitize');
  return `postgresql://${user}:${password}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${database}`;
}

migrate().catch((error) => { console.error(error); process.exitCode = 1; });
