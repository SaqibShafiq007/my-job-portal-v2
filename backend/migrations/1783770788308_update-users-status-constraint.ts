import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE users DROP CONSTRAINT users_status_check;
  `);
  pgm.sql(`
    ALTER TABLE users ADD CONSTRAINT users_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text]));
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE users DROP CONSTRAINT users_status_check;
  `);
  pgm.sql(`
    ALTER TABLE users ADD CONSTRAINT users_status_check
    CHECK (status = ANY (ARRAY['unverified'::text, 'active'::text, 'suspended'::text]));
  `);
}