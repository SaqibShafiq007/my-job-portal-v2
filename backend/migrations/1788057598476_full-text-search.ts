import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Step 1: Add the tsvector column
    ALTER TABLE jobs ADD COLUMN search_vector tsvector;

    -- Step 2: Populate existing rows
    UPDATE jobs
    SET search_vector = to_tsvector(
      'pg_catalog.english',
      coalesce(title, '') || ' ' || coalesce(description, '')
    );

    -- Step 3: GIN index for fast full-text lookup
    CREATE INDEX idx_jobs_search ON jobs USING gin(search_vector);

    -- Step 4: Trigger to keep search_vector current on every INSERT or UPDATE
    CREATE TRIGGER jobs_search_vector_update
      BEFORE INSERT OR UPDATE ON jobs
      FOR EACH ROW
      EXECUTE FUNCTION tsvector_update_trigger(
        search_vector,
        'pg_catalog.english',
        title,
        description
      );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TRIGGER IF EXISTS jobs_search_vector_update ON jobs;
    DROP INDEX IF EXISTS idx_jobs_search;
    ALTER TABLE jobs DROP COLUMN IF EXISTS search_vector;
  `);
}