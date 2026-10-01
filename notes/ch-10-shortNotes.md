# 📘 Chapter 10 — Applications Table

> **What this chapter builds:** the `applications` table — links an applicant to a specific job they applied to.

---

## 🎯 The Core Decision

> **One row = one applicant + one job** (not one row per company)

**Why?** Different jobs — even at the same company — have different screening questions. If applications were grouped by *company* instead of by *job*, you couldn't tell which answers belong to which job, and recruiters could accidentally see data meant for a different role.

---

## ❌ Three Wrong Designs (and why they were rejected)

### 1. Application per company
Using `company_id` instead of `job_id`.

- Breaks when one applicant applies to multiple jobs at the same company — there's no way to separate their different sets of answers.
- Leaks data across jobs within the same company.

### 2. Separate `screening_answers` table
One row per answer, linked back to the application.

| Problem | Why it matters |
|---|---|
| Always read together | Answers are always needed *all at once* → forces an unnecessary JOIN every single time |
| No real table to link to | Questions live in JSONB inside `jobs`, not their own table → `question_id` foreign key would be fake, nothing stops invalid IDs |
| Loses data type | Forcing every answer to `text` turns `true` into `"true"` |
| Never queried alone | You never search/filter by individual answers → splitting buys nothing |

### 3. Storing question text with the answer
Self-contained but fragile — if a recruiter fixes a typo in the question later, old answers still show the *old* text, going out of sync with the live job posting.

**✅ The fix:** store only the question's **UUID**; fetch the live question text at display time.

---

## 🏗️ Final Table Design

```sql
CREATE TABLE applications (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            uuid        NOT NULL REFERENCES jobs(id),
  applicant_id      uuid        NOT NULL REFERENCES applicants(id),
  stage             text        NOT NULL DEFAULT 'applied'
                                  CHECK (stage IN (
                                    'applied', 'screening', 'interview',
                                    'final_interview', 'offer',
                                    'hired', 'rejected'
                                  )),
  screening_answers jsonb       NOT NULL DEFAULT '{}',
  profile_snapshot  jsonb       NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_id)
);
```

### Column Meanings

**`id`**
Auto-generated unique ID (UUID).

**`job_id`**
Which job this application is for. Real foreign key — `jobs` is a real table. Access control flows from here: `application → job → company`, so a recruiter only sees applications for their own company's jobs.

**`applicant_id`**
Which applicant applied. References the `applicants` table (not `users`) — consistent with where profile data actually lives.

**`UNIQUE (job_id, applicant_id)`**
Stops one applicant from having two applications for the same job. Protects against double-clicks/network retries creating duplicates — enforced by the *database itself*, not just app code.

**`stage`**
Current step in the hiring pipeline. A plain `text` column — **not JSONB** — because:
- Recruiters filter/search by it constantly ("show me everyone in interview stage")
- Stage changes are permission-gated by recruiter role
- The `CHECK` constraint only allows the 7 listed values, rejecting typos

> **Pipeline:** `applied → screening → interview → final_interview → offer → hired`
> `rejected` — terminal state, reachable from **any** active stage
> `hired` — only reachable from `offer`

**`screening_answers`**
JSONB object. Key = question's UUID (from `jobs.screening_questions`), value = the applicant's answer — keeping its real type (boolean stays boolean, not `"true"`).

**`profile_snapshot`**
JSONB frozen copy of the applicant's profile *at the moment of submission*. If the applicant edits their profile later, this snapshot doesn't change — it's what the recruiter actually evaluated. Left empty for now; details come in Chapter 51.

**`updated_at`**
Refreshed whenever the row changes (e.g. stage advances) — powers "last activity" displays.

---

## 🔗 The Join Query: Matching Answers to Questions

```sql
SELECT q.value->>'text'                       AS question,
       a.screening_answers->(q.value->>'id')  AS answer
FROM jobs j,
     jsonb_array_elements(j.screening_questions) AS q,
     applications a
WHERE a.id = $1
  AND j.id = a.job_id;
```

| Piece | What it does |
|---|---|
| `jsonb_array_elements(...)` | Unpacks the job's question list (a JSON array) into individual rows, one per question |
| `->>` | Gets a JSON field as plain **text** (used for the question's `text`) |
| `->` | Gets a JSON field as raw **JSONB**, preserving its original type (used for the answer, so `true` stays a boolean) |
| Matching logic | Each question's `id` is used as the lookup key inside `screening_answers` — same UUID on both ends |
| `$1` | Placeholder for the specific application ID, filled in safely by the app code (avoids SQL injection) |

---

## 🧠 Key Takeaways

- 🔑 Foreign keys only protect you when there's a **real table** on the other end to check against.
- 📦 JSONB is great for "store + display together" data; use **real columns** when you need to filter/search/sort often.
- 🆔 Store **stable IDs**, not copies of data that might change later (like question text).
- 🛡️ Database-level constraints (`UNIQUE`, `CHECK`) protect data integrity even if app code has bugs.
