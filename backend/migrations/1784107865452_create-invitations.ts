import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE invitations (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      email      TEXT        NOT NULL,
      role       TEXT        NOT NULL CHECK (role IN ('recruiter', 'admin')),
      token_hash TEXT        NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX idx_invitations_company_id ON invitations (company_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE invitations;`);
}