### Chapter 8 — Account Models Short Notes

## Why not one big users table
Putting everyone in one table means most columns are NULL for most rows — recruiter rows have empty applicant columns, applicant rows have empty recruiter columns. Called a sparse table — messy and gets worse over time.

## Why not separate tables per role with no shared table
Email uniqueness breaks — same email could register as recruiter AND applicant. Login has to search three tables every time. Add new role = update login code again.

## Why not store company data on recruiter row
Second recruiter joins same company = copy company name onto their row = duplicated data. Company rebrands = update every recruiter row one by one. Admin suspends company = no company row to suspend, have to find every recruiter individually.

## The right approach — 5 tables
users — login info only for everyone. email, password, role, status. One row per account.
companies — its own real entity. name, slug (URL friendly name like acme-corp), website, verified, suspended.
recruiters — links user to company. has user_id (FK) because recruiter is a user and needs to login. has company_id (FK) because recruiter belongs to a company. also has company_role (owner/hr_manager/recruiter/hiring_manager).
applicants — links user to their profile. has user_id (FK) because applicant is a user and needs to login. has full_name (real column, not JSONB because it's displayed and sorted everywhere). attributes in JSONB for skills, portfolio links etc.
admins — minimal. just user_id (FK) and created_at. admin is a user so user_id is FK.

## Rules database enforces

Email unique across all accounts
One profile per user (UNIQUE on user_id in each profile table)
Every recruiter must have a company (NOT NULL on company_id)
Every applicant must have a name (NOT NULL on full_name)
Role must be recruiter/applicant/admin only
Status must be active/unverified/suspended only
Company slug must be unique


## Relationships

One user → at most one profile (recruiter OR applicant OR admin, never two)
Many recruiters → one company
One company → many jobs (Chapter 9)
One job → many applications (Chapter 10)
One applicant → many applications (Chapter 10)
