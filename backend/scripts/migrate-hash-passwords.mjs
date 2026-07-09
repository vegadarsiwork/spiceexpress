#!/usr/bin/env node
// Migrate existing plaintext passwords to bcrypt hashes.
// Run AFTER the SQL migration (migrate-password-column.sql).
//
// Usage: node scripts/migrate-hash-passwords.mjs
// Requires: MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD env vars (or .env file)

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getPool, closePool, getSqlConfig } from '../lib/sqlServer.js';
import sql from 'mssql';

async function main() {
  const config = getSqlConfig();
  console.log(`Connecting to ${config.database}...`);
  const pool = await getPool();

  const result = await pool.request().query(
    `SELECT USERID, USERNAME, PASSWORD FROM dbo.USER_MANAGEMENT WHERE PASSWORD IS NOT NULL AND PASSWORD <> ''`,
  );

  let migrated = 0;
  let skipped = 0;

  for (const row of result.recordset) {
    const pwd = String(row.PASSWORD);
    if (pwd.startsWith('$2')) {
      skipped++;
      continue;
    }
    const hash = await bcrypt.hash(pwd, 12);
    await pool
      .request()
      .input('id', sql.Int, row.USERID)
      .input('hash', sql.NVarChar(255), hash)
      .query('UPDATE dbo.USER_MANAGEMENT SET PASSWORD = @hash WHERE USERID = @id');
    migrated++;
    console.log(`  Migrated user ${row.USERID} (${row.USERNAME})`);
  }

  console.log(`Done. Migrated: ${migrated}, Already hashed: ${skipped}`);
  await closePool();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
