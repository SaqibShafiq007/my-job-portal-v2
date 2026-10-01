import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE interviews (
      id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id uuid        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      scheduled_at   timestamptz NOT NULL,
      meeting_link   text        NOT NULL,
      notes          text,
      feedback       text,
      outcome        text        NOT NULL DEFAULT 'pending'
                                   CHECK (outcome IN ('pending', 'moved_forward', 'rejected')),
      created_at     timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE interviews;`);
}