import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE resumes ADD COLUMN word_count INTEGER;`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE resumes DROP COLUMN word_count;`);
}