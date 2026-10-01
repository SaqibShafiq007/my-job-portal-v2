import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE refresh_tokens (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT        NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
  `);

  pgm.sql(`
    CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE refresh_tokens;`);
}