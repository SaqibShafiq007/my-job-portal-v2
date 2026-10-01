import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE recruiters ADD CONSTRAINT recruiters_user_company_unique
    UNIQUE (user_id, company_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE recruiters DROP CONSTRAINT recruiters_user_company_unique;
  `);
}