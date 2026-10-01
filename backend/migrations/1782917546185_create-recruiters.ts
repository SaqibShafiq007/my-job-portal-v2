import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE recruiters (
      id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      uuid        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      company_id   uuid        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
      company_role text        NOT NULL DEFAULT 'recruiter'
                                 CHECK (company_role IN ('owner', 'hr_manager', 'recruiter', 'hiring_manager')),
      created_at   timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE recruiters;`);
}