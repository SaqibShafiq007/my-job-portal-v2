import 'dotenv/config';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { config } from '../src/shared/config';

// Usage (PowerShell):
//   $env:ADMIN_EMAIL = "you@example.com"
//   $env:ADMIN_PASSWORD = "a-strong-password"
//   npm run create-admin
//
// Safe to run more than once. It never deletes data and never changes the
// password or role of an existing account.

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!email || !email.includes('@')) {
    throw new Error('Set ADMIN_EMAIL to a valid email address.');
  }
  if (password.length < 8) {
    throw new Error('Set ADMIN_PASSWORD (at least 8 characters).');
  }

  const client = new Client({ connectionString: config.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    const { rows: existing } = await client.query<{ id: string; role: string }>(
      `SELECT id, role FROM users WHERE email = $1`,
      [email],
    );

    if (existing.length > 0) {
      const user = existing[0];
      if (user.role !== 'admin') {
        throw new Error(
          `${email} already exists as a ${user.role}. Use a different email; this script will not change an existing account's role.`,
        );
      }
      await client.query(
        `INSERT INTO admins (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [user.id],
      );
      await client.query('COMMIT');
      console.log(`Admin ${email} already exists. Nothing changed (password untouched).`);
      return;
    }

    const hash = await bcrypt.hash(password, 10);

    const { rows: [adminUser] } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, 'admin', 'active') RETURNING id`,
      [email, hash],
    );

    await client.query(`INSERT INTO admins (user_id) VALUES ($1)`, [adminUser.id]);

    await client.query('COMMIT');
    console.log(`Admin created: ${email}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});