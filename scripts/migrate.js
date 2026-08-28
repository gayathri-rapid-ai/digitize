const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(fs.readFileSync(path.join(__dirname, '../migrations/001_initial.sql'), 'utf8'));
    console.log('Applied 001_initial.sql');
  } finally {
    await client.end();
  }
}

migrate().catch((error) => { console.error(error); process.exitCode = 1; });
