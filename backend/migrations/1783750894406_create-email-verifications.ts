import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE email_verifications (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      otp_hash   TEXT        NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX idx_email_verifications_user_id ON email_verifications (user_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE email_verifications;`);
}