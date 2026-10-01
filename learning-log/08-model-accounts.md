//at the end of 8.5 there is a question

## Question 
sketch all five tables in your learning log (learning-log/08-model-accounts.md). Include: the columns, the FKs, and a one-line explanation of why each FK points the way it does. This is the design you'll implement in Chapter 12 — it should be something you can defend, not something you copied.



## users
id | email | password_hash | role | status | created_at

```sql
recruiters.user_id    REFERENCES users(id)     ON DELETE CASCADE
recruiters.company_id REFERENCES companies(id) ON DELETE RESTRICT
applicants.user_id    REFERENCES users(id)     ON DELETE CASCADE
admins.user_id        REFERENCES users(id)     ON DELETE CASCADE
```

## companies
id | name | slug | website | verified | suspended | created_at

## recruiters
id | user_id(FK) | company_id(FK) | company_role | created_at

recruiter is a user, he needs to login first that's why user_id is FK
recruiter also works in a company, he belongs to a company so company_id is FK

## applicants
id | user_id(FK) | full_name | headline | location | attributes | created_at

applicant is also a user, needs to login that's why user_id is FK

## admins
id | user_id(FK) | created_at

admin is also a user that's why user_id is FK


## Log it


## A teammate proposes a single users table with nullable company_id, full_name, and headline columns — everything in one place. What is the specific schema-level problem? (Think: what does full_name = NULL on a recruiter row mean to the database's ability to enforce correctness?)
 mmany of the col_nmes filled with null.



## A company has eight recruiters. The admin suspends the company. Walk through exactly what needs to happen in the database — which tables, which rows, which columns. Why is a companies table the right place to put the suspended flag?

just suspended=true in company table . no need to do anything

## Why does ON DELETE CASCADE appear on recruiters.user_id but not on recruiters.company_id? What would happen if you added CASCADE to the company FK?
if user id is dlted then recruiter also be deleted bcz a recruiter is a user.deleting a compsny is dangerous and unexpected







### Quiz

## An admin hard-deletes a recruiter's users row. What happens to the recruiter's row in the recruiters table — and which SQL clause governs that behaviour?
that row also deleted because of cascade operation


## A recruiter leaves the company and their users row is suspended. Does the company's companies row change? Does the company's jobs listing change? Why or why not?
no,it does not has a relation with companies row
also company job's title is not replaced bcz job is related to conpany not recruiter.


## wo engineers debate where to store a recruiter's job title within their company (e.g. "Senior Talent Partner"). One says add a `job_title` column to `users`; the other says add it to `recruiters`. Which is correct, and why?
add to recruiter table , bcz user table is related to llogin and applicant is also a user so we have to apart job_title from user.