# migration
You can't literally hand your friend your running database. So instead, you give them the instructions to build the exact same database themselves that's what migration files are.


 Database Migrations
What migrations are (the why)

Problem: Writing CREATE TABLE by hand works once, but breaks fast — a second dev can't reproduce your schema, changes can't safely reach staging/prod, and nobody knows which schema version an environment is running.
Solution: Migrations = versioned SQL files committed to git, run in order, tracked so none run twice.
Each migration = one schema change, with:

up → apply the change
down → undo it (mainly useful in dev to fix mistakes; rare/deliberate in prod)



How the tool tracks state

node-pg-migrate keeps a pgmigrations table in your DB.
On up, it checks that table, skips anything already recorded, runs the rest.
Why timestamp filenames, not 001/002: sequential numbers collide when two devs create migrations at the same time (both write 008_...). Timestamps always sort correctly with zero manual renaming.

Setup

Installed as devDependency — why: it's a build tool, never needed in the running app.
Needs tsx to execute .ts files (migrate-create doesn't, since it only writes a file).
Scripts:

migrate → apply all pending
migrate:down → roll back most recent (add a number for more)
migrate:create -- <name> → scaffold a new timestamped file


Config-free — reads DATABASE_URL straight from .env.

Writing the migrations

Dependency order matters: a table must exist before another table can FK-reference it.

Order used: users → companies → recruiters → applicants → admins → jobs → applications
Why: Postgres errors if you try to create a FK pointing to a table that doesn't exist yet.


Used timestamptz (not timestamp) → why: stores UTC offset, so reads are unambiguous no matter the server's time zone.
Used jsonb columns (attributes, screening_questions, etc.) → why: flexible/semi-structured data without needing new columns for every small addition.
ON DELETE CASCADE vs ON DELETE RESTRICT:

CASCADE → deleting the parent auto-deletes children (e.g. delete a user → their recruiter/applicant/admin row goes too).
RESTRICT → blocks deletion if children still reference it (e.g. can't delete a company while recruiters/jobs still point to it).
Why this matters for rollback: migrate:down undoes migrations in reverse creation order, which is exactly the order needed so no table is dropped while something still references it.



The bug I hit (important lesson)

Ran migrate once with empty up() stubs before pasting real code.
Result: migrations got marked "done" in pgmigrations even though no tables were created — because no error occurred, just nothing happened.
Symptom: \dt showed only pgmigrations, no real tables.
Fix: DELETE FROM pgmigrations; to clear the false records, then re-run npm run migrate for real.
Lesson: always paste real code into a migration file before the first run — "success" doesn't mean "did something," it means "no error."

Verified end state

8 tables in psql: users, companies, recruiters, applicants, admins, jobs, applications, pgmigrations.