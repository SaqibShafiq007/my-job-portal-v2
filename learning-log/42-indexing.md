## LOG

# The leftmost prefix rule means (status, created_at DESC, id DESC) does not help a query that filters only on created_at without a status filter. Describe a plausible query the job portal might need in the future that would require a separate index on created_at alone or a different composite order. What would that query look like, and what index would you create?
a section where admin want to see the newly job (draft may be).in this caase we need only created at
The new index needed
```sql
CREATE INDEX idx_jobs_created_id
  ON jobs (created_at DESC, id DESC);
```
# CREATE INDEX CONCURRENTLY builds an index without holding a write lock, but it takes longer and cannot run inside a transaction. Plain CREATE INDEX is fast but locks the table for writes during the build. Describe the operational risk of running plain CREATE INDEX on a live production jobs table with 500,000 rows, and explain under what circumstances you might still choose it over CONCURRENTLY.
it is not good in this case but it is gd when we knw that in this specific time like untill 2 am there may not any request occurs.and if table has few rows like thoud=sand but not lacs


## Quiz


# Q1. A developer adds the index (created_at DESC, status, id DESC) instead of (status, created_at DESC, id DESC). The public board query filters WHERE status = 'open' ORDER BY created_at DESC, id DESC. Explain whether PostgreSQL can use the new index for this query as efficiently as the original, and why column order changes the answer
it becpomes slow
Poora index scan karega (created_at order mein), phir har row pe check karega ke status = 'open' hai ya nahi — matlab woh saari rows padhega jo open nahi hain bhi, sirf unhe filter karke discard karega. Yeh Seq Scan jaisa hi slow ho sakta hai, bas thora behtar (kyunke already sorted milta hai).
Ya phir Postgres is index ko istemal hi na kare, aur wapas Seq Scan pe chala jaye


# Q2. After adding idx_jobs_status_created, a developer runs EXPLAIN ANALYZE on a development database with 15 rows in the jobs table and sees a Seq Scan. They conclude the index is not working and try to debug it. Explain why this conclusion may be incorrect and what they should do to properly verify that the index is correct.
postgress automatically switch to index when num of rows increased.
to veirfy index is correcrt we need to add more rows.



# Q3. The EXPLAIN ANALYZE output shows actual time=0.030..0.147 rows=20 loops=1 for the index scan node, but rows=617 in the estimate. Explain what the discrepancy between rows=617 (estimate) and rows=20 (actual) means, why it occurs here specifically, and when a large gap between estimated and actual rows would be a sign of a real problem requiring ANALYZE.

Kab yeh farak asli masla hota hai (ANALYZE chalana zaroori)

Agar LIMIT na ho, aur estimate aur actual mein bara farak ho — jaise Postgres bole "10 rows milenge" lekin asal mein 10,000 milen — tab yeh real masla hai. Yeh matlab Postgres ke paas table ke baare mein purani/ghalat statistics hain (jaise bohot saari nayi rows recently insert hui hon, lekin Postgres ko abhi tak pata nahi).


























