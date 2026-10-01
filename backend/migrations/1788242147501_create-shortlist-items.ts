import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE shortlist_items (
      id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      applicant_id uuid        NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
      job_id       uuid        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      created_at   timestamptz NOT NULL DEFAULT now(),
      UNIQUE(applicant_id, job_id) 
    );
  `);
}
//UNIQUE(applicant_id, job_id)  : this constraint means the database itself guarantees an applicant can never shortlist the same job twice

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE shortlist_items;`);
}