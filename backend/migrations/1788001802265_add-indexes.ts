import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Public board: filters oSn status, orders by created_at DESC, id DESC
    CREATE INDEX idx_jobs_status_created
      ON jobs (status, created_at DESC, id DESC);

    -- Company-scoped job queries (recruiter dashboard): filter by company_id
    CREATE INDEX idx_jobs_company_id
      ON jobs (company_id);

    -- Public board JOIN: filter companies by verified
    CREATE INDEX idx_companies_verified
      ON companies (verified);

    -- Recruiter lookup: find which company a user belongs to
    CREATE INDEX idx_recruiters_user_id
      ON recruiters (user_id);

    -- Company member list: find all recruiters in a company
    CREATE INDEX idx_recruiters_company_id
      ON recruiters (company_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_jobs_status_created;
    DROP INDEX IF EXISTS idx_jobs_company_id;
    DROP INDEX IF EXISTS idx_companies_verified;
    DROP INDEX IF EXISTS idx_recruiters_user_id;
    DROP INDEX IF EXISTS idx_recruiters_company_id;
  `);
}