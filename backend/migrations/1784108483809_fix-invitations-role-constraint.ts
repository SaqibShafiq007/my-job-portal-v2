import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE invitations DROP CONSTRAINT invitations_role_check;
  `);
  pgm.sql(`
    ALTER TABLE invitations ADD CONSTRAINT invitations_role_check
    CHECK (role IN ('hr_manager', 'recruiter', 'hiring_manager'));
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE invitations DROP CONSTRAINT invitations_role_check;
  `);
  pgm.sql(`
    ALTER TABLE invitations ADD CONSTRAINT invitations_role_check
    CHECK (role IN ('recruiter', 'admin'));
  `);
}