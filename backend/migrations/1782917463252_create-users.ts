import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE users (
      id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      email         text        NOT NULL UNIQUE,
      password_hash text        NOT NULL,
      role          text        NOT NULL CHECK (role IN ('admin', 'recruiter', 'applicant')),
      status        text        NOT NULL DEFAULT 'unverified'
                                  CHECK (status IN ('unverified', 'active', 'suspended')),
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE users;`);
}