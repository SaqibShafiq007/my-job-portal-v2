import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE companies (
      id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      name       text        NOT NULL,
      slug       text        NOT NULL UNIQUE,
      website    text,
      verified   boolean     NOT NULL DEFAULT false,
      suspended  boolean     NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE companies;`);
}