import 'dotenv/config';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { config } from '../src/shared/config';

const client = new Client({ connectionString: config.DATABASE_URL });

async function seed() {
  await client.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      TRUNCATE applications, jobs, recruiters, applicants, admins, companies, users
      RESTART IDENTITY CASCADE
    `);

    const hash = await bcrypt.hash('password123', 10);

    // ── Users ─────────────────────────────────────────────────
    // Seed users are set to 'active' to bypass the email-verification
    // flow that real signups go through — covered in Chapter 19.
    const { rows: [adminUser] } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ('admin@portal.dev', $1, 'admin', 'active') RETURNING id`,
      [hash],
    );

    const { rows: [aliceUser] } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ('alice@brightbuild.dev', $1, 'recruiter', 'active') RETURNING id`,
      [hash],
    );

    const { rows: [carlosUser] } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ('carlos@novaspark.dev', $1, 'recruiter', 'active') RETURNING id`,
      [hash],
    );

    const { rows: [jamieUser] } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ('jamie@example.dev', $1, 'applicant', 'active') RETURNING id`,
      [hash],
    );

    const { rows: [patUser] } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ('pat@example.dev', $1, 'applicant', 'active') RETURNING id`,
      [hash],
    );

    const { rows: [morganUser] } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ('morgan@example.dev', $1, 'applicant', 'active') RETURNING id`,
      [hash],
    );

    // ── Admin ──────────────────────────────────────────────────
    await client.query(
      `INSERT INTO admins (user_id) VALUES ($1)`,
      [adminUser.id],
    );

    // ── Companies ──────────────────────────────────────────────
    const { rows: [brightbuild] } = await client.query<{ id: string }>(`
      INSERT INTO companies (name, slug, website, verified)
      VALUES ('BrightBuild', 'brightbuild', 'https://brightbuild.dev', true)
      RETURNING id
    `);

    const { rows: [novaspark] } = await client.query<{ id: string }>(`
      INSERT INTO companies (name, slug, website, verified)
      VALUES ('NovaSpark', 'novaspark', 'https://novaspark.dev', true)
      RETURNING id
    `);

    // ── Recruiters ─────────────────────────────────────────────
    await client.query(
      `INSERT INTO recruiters (user_id, company_id, company_role)
       VALUES ($1, $2, 'owner')`,
      [aliceUser.id, brightbuild.id],
    );

    await client.query(
      `INSERT INTO recruiters (user_id, company_id, company_role)
       VALUES ($1, $2, 'owner')`,
      [carlosUser.id, novaspark.id],
    );

    // ── Applicants ─────────────────────────────────────────────
    const { rows: [jamie] } = await client.query<{ id: string }>(
      `INSERT INTO applicants (user_id, full_name, headline, location)
       VALUES ($1, 'Jamie Rivera', 'Backend engineer, 4 years experience', 'Remote')
       RETURNING id`,
      [jamieUser.id],
    );

    const { rows: [pat] } = await client.query<{ id: string }>(
      `INSERT INTO applicants (user_id, full_name, headline, location)
       VALUES ($1, 'Pat Chen', 'Full-stack developer', 'New York')
       RETURNING id`,
      [patUser.id],
    );

    const { rows: [morgan] } = await client.query<{ id: string }>(
      `INSERT INTO applicants (user_id, full_name, headline)
       VALUES ($1, 'Morgan Ellis', 'UI/UX designer, product thinker')
       RETURNING id`,
      [morganUser.id],
    );

    // ── Jobs ───────────────────────────────────────────────────
    const { rows: [backendJob] } = await client.query<{ id: string }>(
      `INSERT INTO jobs (company_id, title, description, status)
       VALUES ($1, 'Backend Engineer', 'Build and maintain the core API and data layer.', 'open')
       RETURNING id`,
      [brightbuild.id],
    );

    await client.query(
      `INSERT INTO jobs (company_id, title, description, status)
       VALUES ($1, 'Product Designer', 'Lead design for the web platform.', 'open')`,
      [brightbuild.id],
    );

    const { rows: [uiJob] } = await client.query<{ id: string }>(
      `INSERT INTO jobs (company_id, title, description, status)
       VALUES ($1, 'UI Designer', 'Shape the visual identity of client-facing products.', 'open')
       RETURNING id`,
      [novaspark.id],
    );

    await client.query(
      `INSERT INTO jobs (company_id, title, description, status)
       VALUES ($1, 'Senior Frontend Engineer', 'Own the component library and performance budget.', 'draft')`,
      [novaspark.id],
    );

    // ── Applications ───────────────────────────────────────────
    await client.query(
      `INSERT INTO applications (job_id, applicant_id, stage)
       VALUES ($1, $2, 'screening')`,
      [backendJob.id, jamie.id],
    );

    await client.query(
      `INSERT INTO applications (job_id, applicant_id, stage)
       VALUES ($1, $2, 'interview')`,
      [uiJob.id, jamie.id],
    );

    await client.query(
      `INSERT INTO applications (job_id, applicant_id, stage)
       VALUES ($1, $2, 'applied')`,
      [backendJob.id, pat.id],
    );

    await client.query(
      `INSERT INTO applications (job_id, applicant_id, stage)
       VALUES ($1, $2, 'applied')`,
      [uiJob.id, morgan.id],
    );

    await client.query('COMMIT');
    console.log('Seed complete.');

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});