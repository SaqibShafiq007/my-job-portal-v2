## LOG


# A teammate argues that N+1 is only a problem at scale and that for a new job board with 50 jobs and 10 users, you should "keep it simple" and use the loop. Evaluate this argument. Describe a specific scenario where the N+1 approach causes a real problem before the product reaches significant scale.











# The batch query pattern using WHERE id = ANY($1) passes an array of IDs to PostgreSQL. What happens to query plan caching (prepared statements) when the array size varies between requests — for example, one request passes 3 IDs and another passes 20? How does this affect the performance argument for the batch approach versus N individual queries?















# Q1. A developer builds a company profile page that shows: the company's basic info, its list of open jobs, and for each job, the number of applications received. They write three functions: getCompany(id), getOpenJobs(companyId), and getApplicationCount(jobId). Explain how naively calling these functions produces an N+1 (or worse) pattern. Rewrite the data access as at most 3 queries total
The N+1 problem here

Naive code would do:

```sql
const company = await getCompany(id);              // 1 query
const jobs = await getOpenJobs(company.id);         // 1 query
for (const job of jobs) {
  job.applicationCount = await getApplicationCount(job.id); // 1 query PER job
}
```

For 10 open jobs: 1 + 1 + 10 = 12 queries. This is actually worse than classic N+1 — it's N+2 (the extra +1 is the company lookup on top of the jobs list). Same root problem: a loop firing one query per job just to get a count.

Fixed version — 3 queries total
```sql
// Query 1: company info
const { rows: [company] } = await db.query(
  `SELECT id, name, verified FROM companies WHERE id = $1`,
  [id]
);

// Query 2: open jobs for this company
const { rows: jobs } = await db.query(
  `SELECT id, title, created_at FROM jobs WHERE company_id = $1 AND status = 'open'`,
  [company.id]
);

// Query 3: application counts for ALL jobs at once, grouped
const jobIds = jobs.map((j) => j.id);
const { rows: counts } = jobIds.length
  ? (await db.query(
      `SELECT job_id, COUNT(*) AS count FROM applications WHERE job_id = ANY($1) GROUP BY job_id`,
      [jobIds]
    ))
  : { rows: [] };

// Build a lookup map, merge in JS (no extra queries)
const countMap = new Map(counts.map((c) => [c.job_id, Number(c.count)]));
const jobsWithCounts = jobs.map((j) => ({
  ...j,
  applicationCount: countMap.get(j.id) ?? 0,
}));
```



# Q2. The ANY($1) batch approach makes 2 queries instead of N+1, but it fetches all related records in one query rather than only the ones needed for the current page. For a list of 20 applications, the second query fetches 20 job records. For a list of 100 applications, it fetches 100. Compare this to the JOIN approach on: result set size, index usage, and flexibility when the related data comes from a different database.


Result set size: basically the same — both fetch the same job data either way.

Index usage: same — both hit the same index (jobs.id), no real difference.

Flexibility (the real difference):

JOIN only works if both tables are in the same database. Can't JOIN Postgres against a different service's database.
Batch query works anywhere — even if jobs lived in a separate service/database, since it's just "fetch IDs, fetch related data separately, merge in code."

One-line takeaway: JOIN and batch perform about the same here — the batch approach's real advantage is working across different databases/services, which a JOIN can't do.


# pg_stat_statements tracks query shapes (with parameter placeholders, not values) and call counts. A developer uses it and finds that SELECT ... FROM companies WHERE id = $1 was called 340 times in the last hour, while the job list endpoint was called only 17 times. What does this tell you, and what would you investigate next?
















































