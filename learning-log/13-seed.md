# The TRUNCATE statement uses CASCADE. Rewrite it as a series of individual DELETE FROM statements (no CASCADE). In what order must those statements run, and why?
```sql
DELETE FROM applications;
DELETE FROM jobs;
DELETE FROM recruiters;
DELETE FROM applicants;
DELETE FROM admins;
DELETE FROM companies;
DELETE FROM users;
```

# Why does the script hash passwords at all? The seed users are fake — would storing the literal string 'password123' in password_hash break anything?
it's not about protecting fake data (nobody cares if password123 leaks for test users) . it's about making sure your seed data works correctly with the real login code, exactly like production data would.


## Quiz

# Q1. The TRUNCATE, all inserts, and the COMMIT all happen inside a single transaction. During the 200ms that bcrypt.hash() takes, the TRUNCATE has already run and the database is empty. Can another database connection (say, an API request) read the empty table during this window? Why or why not?
No  another connection cannot see the empty table during that window.
coz everything is wrapped in BEGIN ... COMMIT. Until COMMIT runs, none of the changes (including the TRUNCATE) are visible to other connections 

# Q2. The script seeds all passwords to the same bcrypt hash. In production, every user has a unique bcrypt hash even if they choose identical passwords. What bcrypt feature makes this possible, and what attack does sharing one hash across accounts enable?
bcrypt always uses a random value even if 2 persoon have a same passworid,their hashed value always be different

# 3. You add a fourth applicant user and a corresponding applicants row to the seed script, but you place the applicants insert after the applications inserts. What happens at runtime, and which constraint causes it?
the script fails/throws an error at the applications insert, and the whole transaction rolls back
Which constraint: the foreign key constraint on applications.applicant_id REFERENCES applicants(id)

