
## Add the jobs table to your learning log (learning-log/09-model-job-postings.md): the full DDL, the column-vs-JSONB reasoning for each field, and the shape of one example screening_questions entry.
  
```sql
CREATE TABLE jobs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
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


jobs.company_id REFERENCES companies(id) ON DELETE RESTRICT


```
column:which is to be sort/filter/unique
jsonB: which can be extended,flexible,part of job;s detail


 ## Column vs JSONB reasoning — one line each:

company_id → real column -- filtered on every query to scope jobs to a company
title → real column — displayed in listings, sorted, searched
description → real column — every job has one, standard field
status → real column — every public board query filters on this
deadline → real column — compared in WHERE clause (deadline > today)
attributes → JSONB — role-specific data, only displayed on job detail page, never filtered across all jobs
screening_questions → JSONB — per job, structured array, never queried across all jobs


3. One example screening_questions entry — what shape does it look like?
This is what the question is asking. Since it's always an array of question objects, one example looks like this:
json[
  {
    "id": "q1",
    "question": "How many years of experience do you have with React?",
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



##  status is a real column. attributes is JSONB. Apply the column-vs-JSONB rule to justify both decisions in one paragraph.
Attribute is related to job it may be engineering,sales,design etc and these job can also be extended ccroding to role so this is JSONB
while status is queried so this is a real column







## A product manager asks you to add a "Remote only" filter to the job board. The remote_policy field currently lives in attributes JSONB. What change does that filter require — schema-level, query-level, and migration? Walk through each step.



## Explain why the screening_questions question id field must remain stable after an applicant submits their answers. What breaks if a recruiter edits the question text and the id changes?
it should be stable bcz when we alter this, q2 may comes in place of q1 so people ans them according to old rules so it may create disturbance, that's why we need to make this stable.