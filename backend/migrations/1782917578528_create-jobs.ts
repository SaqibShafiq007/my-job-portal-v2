import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE jobs (
      id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id          uuid        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
      title               text        NOT NULL,
      description         text        NOT NULL,
      status              text        NOT NULL DEFAULT 'draft'
                                        CHECK (status IN ('draft', 'open', 'closed')),
      deadline            date,
      attributes          jsonb       NOT NULL DEFAULT '{}',
      screening_questions jsonb       NOT NULL DEFAULT '[]',
      created_at          timestamptz NOT NULL DEFAULT now(),
      updated_at          timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE jobs;`);
}