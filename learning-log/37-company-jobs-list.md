##


# The cursor is silently ignored if it is malformed. A strict alternative would return 422. Describe a real-world scenario where a client might send a malformed cursor (not through malice, but through normal client behavior), and evaluate whether the silent recovery or the error response is more appropriate for that case.

A user is browsing the jobs dashboard, clicks "next page," and gets a valid nextCursor. Then they leave the tab open overnight. The frontend caches that cursor in browser state. Meanwhile, the backend gets redeployed, or the cursor's encoding format changes slightly during some update (e.g., you added a new field to the cursor payload later).
The next morning, the user clicks "next page" again — their browser still has the old cursor format cached, but it no longer matches what the current backend expects. It's not malicious, not even really "broken" — it's just stale, from a slightly older version of the app.
Silent recovery (current approach) makes more sense here.coz  a malformed cursor in this scenario isn't really "the client did something wrong" , it's just an outdated bookmark.



# The composite index (company_id, created_at DESC, id DESC) is recommended to support this query. A colleague suggests a separate index on (created_at DESC, id DESC) without company_id, arguing the database will combine it with an existing index on company_id. Explain why the composite index is preferred over separate single-column indexes for this specific query pattern.
composite index is better co postgress jumps straight into that company row, no need to find or merge anything





## QUIZ



# Q1. The cursor encodes created_at and id to handle ties (two jobs with the same timestamp). In this system, can two jobs ever share the exact same created_at timestamp? Identify the circumstances under which a timestamp tie is possible and explain why including id in the cursor is necessary to guarantee stable pagination even if ties are rare.
yes,
1) if two recruiters (or a script/bot) post jobs within the same microsecond window
2) Bulk inserts in one transaction — like your seed script, which creates multiple jobs back-to-back inside a single BEGIN...COMMIT block. Depending on how NOW() is evaluated (it can return the same value for the whole transaction in Postgres, since NOW() is frozen at transaction start), all jobs created in that one seed run could get the identical timestamp.
id is imp here coz it avoids duplication as id is primary key here 

# Q2. The service fetches limit + 1 rows and checks rows.length > limit to detect a next page. A developer proposes an alternative: run a SELECT COUNT(*) FROM jobs WHERE company_id = $1 query first, then fetch the page. Compare these two approaches on correctness (race conditions), performance (number of queries, index usage), and the information they provide to the caller.

limit+1 has not race condition bcz it just tell that is there any next job ? it just give it in a single snapshot but in casre of COUNT(*) race condtion might occur coz Between the COUNT(*) query and the actual page-fetch query, another recruiter could insert or delete a job.Example: COUNT says "50 jobs," but by the time the page query runs, a new job was added — now the count is stale, and hasNextPage.

# Q3. The job list returns id, title, status, and createdAt only — no salary, description, or other fields. A product manager asks for salary_min and salary_max to be added to the list view. A backend developer argues this will make the response payload 40% larger and suggests the client should call the single-job detail endpoint instead. Evaluate both positions. What engineering and product factors determine which approach is better?

it depends























































