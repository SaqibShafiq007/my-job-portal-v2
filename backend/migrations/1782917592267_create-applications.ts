import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE applications (
      id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id            uuid        NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
      applicant_id      uuid        NOT NULL REFERENCES applicants(id) ON DELETE RESTRICT,
      stage             text        NOT NULL DEFAULT 'applied'
                                      CHECK (stage IN (
                                        'applied', 'screening', 'interview',
                                        'final_interview', 'offer',
                                        'hired', 'rejected'
                                      )),
      screening_answers jsonb       NOT NULL DEFAULT '{}',
      profile_snapshot  jsonb       NOT NULL DEFAULT '{}',
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now(),
      UNIQUE (job_id, applicant_id)
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE applications;`);
}