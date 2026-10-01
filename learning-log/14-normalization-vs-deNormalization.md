# Look at applications.screening_answers. An alternative design is a separate screening_answers table with columns (id, application_id, question_id, answer). Name one thing the normalized table makes possible that JSONB makes hard or impossible, and name one thing the JSONB approach makes possible that the normalized table makes harder.
```table
screening_answers table
  id | application_id | question_id | answer
  1  | app-123        | q1-uuid     | yes
  2  | app-123        | q2-uuid     | 3 years
```
  we need a query here . Example: "find every applicant who answered 'yes' to question 3" 
normalized state here just need a join query that why it is better


# The profile_snapshot column duplicates data from applicants. Describe a scenario where that divergence causes a problem that is not a bug — it is the correct behavior — and a scenario where that same divergence would cause a real bug if it were not handled carefully
The setup

Jamie has a profile:
full_name: "Jamie Rivera"
headline: "Backend engineer, 2 years experience"

Jamie applies to a job. At that moment, this gets copied into profile_snapshot:
profile_snapshot: { headline: "Backend engineer, 2 years experience" }
Now there are two copies of the same info — one in applicants (live, current), one frozen inside profile_snapshot (from the moment of applying).
What "divergence" means
Later, Jamie updates their real profile:
applicants.headline: "Backend engineer, 3 years experience"  ← changed
profile_snapshot.headline: "Backend engineer, 2 years experience"  ← still old
Now the two copies don't match anymore. That mismatch = divergence.
The question is asking for two stories
Story type 1 — this mismatch is actually good/intended, not a bug
The recruiter looking at Jamie's application should see what Jamie's profile said when they applied ("2 years"), not what it says today ("3 years"). If it updated live, the recruiter's evaluation would be based on info Jamie didn't even have when they applied. So here — the old, frozen snapshot being "wrong" (different from current profile) is correct behavior.
Story type 2 — this same kind of mismatch would be a real bug
Now imagine someone builds a different feature — showing whether the applicant's account is active or suspended, but by accident, they read this from the frozen profile_snapshot instead of checking the live applicants/users table. If Jamie gets suspended (banned) after applying, the snapshot still says "active" forever, since it's frozen. A recruiter might keep processing/hiring someone who's actually been banned — because they're looking at stale, frozen data for something that needed to be live/current.


## Quiz

# Q1. A recruiter builds a dashboard that displays applicant data by joining applications → applicants and reading applicants.headline directly, instead of reading profile_snapshot. Under what condition does the dashboard show correct data — and under what condition does it silently show the wrong data? What is the trade-off of the join approach versus reading the snapshot?
Shows correct data when: the applicant hasn't updated their profile since applying. applicants.headline still matches what it was at application time.
Shows wrong data when the applicant updates their profile after applying . the dashboard now shows their current headline, silently overwriting what the recruiter actually saw and evaluated when reviewing that specific application.
The trade-off:

Join approach (applicants.headline) → always shows the latest profile, but loses the historical "what did they look like when they applied" record — which is the whole reason profile_snapshot exists.
Snapshot approach (profile_snapshot) → preserves exactly what was true at application time, but never reflects updates — correct for historical accuracy, wrong if you actually wanted live data.


# Q2. jobs.attributes currently stores { "min_experience": 3 }. The team wants to add jobs.min_experience integer as a real, indexed column. List the six deployment steps from this chapter in the correct order, and name which step is the most dangerous to skip and why.
Deploy code that writes both attributes.min_experience (jsonb) and the new min_experience column (dual-write)
Add the real column via migration (nullable, no constraint yet)
Backfill: UPDATE jobs SET min_experience = (attributes->>'min_experience')::integer
Add constraint (NOT NULL/CHECK/index) now that every row has a value
Deploy code that reads only from min_experience, stops writing the jsonb key
Drop the jsonb key in a later migration, once confirmed nothing reads it



# Q3. A recruiter posts jobs with wildly different structures: an engineering job has tech_stack, seniority, remote_policy; a sales job has territory, commission_plan, quota. If you normalized these into real columns, what would the jobs table look like, and what problem would that schema have that JSONB avoids?
```sql
CREATE TABLE jobs (
  ...
  tech_stack       text,
  seniority        text,
  remote_policy    text,
  territory        text,
  commission_plan  text,
  quota            integer,
  -- more columns for every other job-type-specific field
);
```
it is overnormalize maany attributes nullable forever
