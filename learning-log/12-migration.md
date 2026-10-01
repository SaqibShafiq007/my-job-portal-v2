# The down function for create_applications must drop the table before create_jobs can also be dropped. Why — and what does this tell you about the order in which down migrations must run relative to up migrations?
bcz application has column references to jobs so application must also drop first then job.
up order: users → companies → recruiters → applicants → admins → jobs → applications (parents before children)
down order: applications → jobs → admins → applicants → recruiters → companies → users (children before parents)

# our team adds a new column next week: jobs.salary_range jsonb. Write the up and down bodies for that migration (two pgm.sql(...) calls).
```sql
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE jobs ADD COLUMN salary_range jsonb;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE jobs DROP COLUMN salary_range;
  `);
}
```

## QUIZ

# Q1. You run npm run migrate twice in a row without changing any files. What happens on the second run, and why?
2nd  run print "no migration to run" nothing changes
on the 2nd run it seem same filenames already recorded there, so nothing happend

# Q2. A developer creates a migration file with sequential number 008_add_salary_range.ts. A second developer, working on a different branch at the same time, also creates 008_create_interviews.ts. Both branches are merged to main. What problem does this cause, and how does timestamp-based naming avoid it?
Problem: Both files are named 008_..., so when merged, they either collide (git/filesystem conflict, or one silently overwrites naming intent) or — worse — end up ambiguous about which runs first. node-pg-migrate sorts by the number prefix, so two files with the same number don't have a defined, reliable order. Someone has to manually notice the clash and rename one to 009_..., and if that's missed, the migration order is undefined/wrong.
Why timestamps avoid it: each developer's migrate:create generates the prefix from the current time automatically, down to the second (or more). Two people creating migrations at the same moment, on different branches, will almost never get the exact same timestamp — so when merged, the files still sort into a clear, deterministic order with zero manual coordination needed.

# Q3 You want to drop and recreate the users table from scratch. You cannot simply run DROP TABLE users directly against the database that has all seven tables applied. Why not — and in what order would you need to run npm run migrate:down to reach a state where DROP TABLE users would succeed?

every table has a foreign key refrence to user table
order 
npm run migrate:down    → undoes applications
npm run migrate:down    → undoes jobs
npm run migrate:down    → undoes admins
npm run migrate:down    → undoes applicants
npm run migrate:down    → undoes recruiters
npm run migrate:down    → undoes companies
(or in one shot: npm run migrate:down 6)
