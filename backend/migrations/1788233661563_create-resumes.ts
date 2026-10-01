import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE resumes (
      id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      applicant_id uuid        NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
      filename     text        NOT NULL,
      s3_key       text        NOT NULL,
      uploaded_at  timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE resumes;`);
}