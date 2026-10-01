markdown# Chapter 9 — Job Postings Model

## What this chapter is
Design only — no SQL runs yet. Designing the `jobs` table. Actual SQL runs in Chapter 12.

---

## Where jobs sit in the entity map
companies (1) ──── (N) jobs (1) ──── (N) applications (Chapter 10)

Jobs sit between companies (owner) and applications (what it receives).  
A recruiter's jobs are always scoped to their company through `company_id`.

---

## The jobs table

```sql
CREATE TABLE jobs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid        NOT NULL REFERENCES companies(id),
  title               text        NOT NULL,
  description         text        NOT NULL,
  status              text        NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft', 'open', 'closed')),
  deadline            date,
  attributes          jsonb       NOT NULL DEFAULT '{}',
  screening_questions jsonb       NOT NULL DEFAULT '[]',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```
,

---

## Column by column

| Column | Rule | Why |
|--------|------|-----|
| `company_id` | NOT NULL, FK | Every job must belong to a company |
| `title` | NOT NULL | Can't display a job with no title |
| `description` | NOT NULL | Full posting text, standard on every job |
| `status` | DEFAULT 'draft', CHECK | Controls visibility |
| `deadline` | Nullable | Not every job has a cutoff date |
| `attributes` | JSONB, DEFAULT '{}' | Role-specific flexible data |
| `screening_questions` | JSONB, DEFAULT '[]' | Structured array of questions |
| `updated_at` | NOT NULL | Tracks last edit for caching |

### status — three states
draft → open → closed
- `draft` — just created, invisible to applicants
- `open` — published, applicants can see and apply  
- `closed` — role filled or taken down

> Database only checks value is one of three.  
> Transition rules (can closed reopen?) are the app's decision, not the database's.  
> Passing deadline does **NOT** auto-close a job — app code must do that explicitly.

### deadline
- Type is `date` not `timestamptz` — deadlines are calendar dates not precise moments
- Public board filters: `WHERE deadline IS NULL OR deadline > CURRENT_DATE`

### attributes — example shapes
```json
// Engineering job
{ "tech_stack": ["React", "Node"], "seniority": "mid", "remote_policy": "hybrid" }

// Sales job
{ "commission_plan": "10% of ARR", "territory": "EMEA" }

// Design job
{ "tools": ["Figma"], "portfolio_required": true }
```

### screening_questions — example shape
```json
[
  {
    "id": "q1",
    "question": "How many years of React experience do you have?",
    "type": "text",
    "required": true
  },
  {
    "id": "q2",
    "question": "Are you comfortable working remotely?",
    "type": "yes_no",
    "required": true
  }
]
```
Each question has `id`, `question`, `type`, and `required`.  
The `id` lets the app match applicant answers back to the right question.

### updated_at
Used by caching layer (Chapter 44) to know if a cached job listing is stale.  
Must update on every edit — either via a database trigger or always including `updated_at = now()` in every update query.

---

## Column vs JSONB decisions

> **Rule:** Real column if filtered, sorted, searched, or enforced unique.  
> JSONB if only displayed on job detail page, role-specific, never queried across all jobs.

| Field | Decision | Reason |
|-------|----------|--------|
| `company_id` | Real column | Filtered on every query |
| `title` | Real column | Sorted and searched |
| `description` | Real column | Standard on every job |
| `status` | Real column | Filtered on every public board query |
| `deadline` | Real column | Compared in WHERE clause |
| `tech_stack` | JSONB | Engineering only, display only |
| `commission_plan` | JSONB | Sales only, display only |
| `portfolio_required` | JSONB | Design only, display only |
| `screening_questions` | Separate JSONB | Structured array, per job |

### Borderline case — `remote_policy`
Starts as JSONB (display only) but becomes a real column the moment a  
"Remote only" filter is added to the job board.  
This is how JSONB fields **graduate to real columns over time** — re-ask the rule as the product evolves.

### Why two JSONB columns not one
- `attributes` — free-form flexible bag, contents vary per job type
- `screening_questions` — structured array with consistent shape the app depends on

---

## Rules the database enforces

| Rule | How |
|------|-----|
| Every job must have a company | NOT NULL on `company_id` |
| Status must be draft/open/closed | CHECK on `status` |
| attributes and screening_questions must be valid JSON | Column type is `jsonb` |
| Job must have a title | NOT NULL on `title` |

---

## What's saved for later

| What | Chapter |
|------|---------|
| What happens to jobs when company deleted | Chapter 11 |
| Indexes on status, deadline, company_id | Chapter 42 |
| Full text search on title/description | Chapter 43 |
| Caching hot job listings | Chapter 44 |
| Migration files | Chapter 12 |