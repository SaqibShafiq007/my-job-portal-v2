# The isolation rule says company_id must come from the database, not from the request. But what about a platform feature that genuinely needs the recruiter to specify a company — for example, a "switch company" feature where a user can belong to multiple companies? How would you extend the model to support this without violating the isolation rule?
The isolation rule still should not trust the companyId sent by the client.

If a recruiter can belong to multiple companies, the server should first verify that the requested company actually belongs to that recruiter.

For example:

authMiddleware verifies the JWT and gets req.user.userId.

The recruiter sends:

companyId = 123

The server checks the database:
```sql
SELECT *
FROM recruiter_companies
WHERE user_id = req.user.userId
AND company_id = 123;
```
If a matching row exists, the recruiter is allowed to switch to that company, and the server uses that verified companyId for subsequent queries.
If no matching row exists, the request is rejected (e.g., 403 Forbidden).

So, the client may suggest a company, but the server never trusts it directly. It always verifies that the authenticated recruiter is actually associated with that company before using it. This extends the model while still maintaining tenant isolation.




# An admin accidentally writes a route that includes WHERE company_id = $1 scoped to the admin's own company_id. The route is in admin.routes.ts and passes requireRole('admin'). What is wrong with this route, and why does the bug make the admin's cross-company access no longer function correctly?
in this way the admin only sees data from their own company instead of data from every company.





## Quiz

# Q1. A recruiter calls GET /api/jobs/550e8400-e29b-41d4-a716-446655440000. The route handler queries SELECT * FROM jobs WHERE id = $1 using the UUID from the URL. The recruiter has a valid token with role: 'recruiter'. The job belongs to a different company. List every check that passes and every check that fails. Then explain what single addition to the query would enforce isolation.
Authentication (authMiddleware) and  Authorization (requireRole('recruiter')) passes because the user's role is recruiter.

However, the route queries:

SELECT * FROM jobs
WHERE id = $1;

This query only checks the job ID. It does not verify that the job belongs to the recruiter's company.

So Tenant isolation fails, because the recruiter can access a job belonging to another company if they know its UUID (an IDOR vulnerability).

To enforce isolation, the query should also filter by the recruiter's verified companyId:
```sql
SELECT *
FROM jobs
WHERE id = $1
AND company_id = $2;
```

# Q2. Two recruiters, Alice and Bob, work at different companies. Both have valid JWT tokens. Alice's token resolves (via the recruiters table) to company_id = 'A'. Bob's token resolves to company_id = 'B'. Bob calls POST /api/jobs and includes "company_id": "A" in the request body. The handler uses req.body.company_id to set the job's company. Describe the exact outcome and the isolation rule that was violated. How should the handler determine the job's company_id instead?
company id must come from db not from rqu.body ror url
i
nstead, the handler should:
Read req.user.userId from the verified JWT.
Look up Bob's companyId in the recruiters table.
Use that companyId when creating the job, ignoring any company_id sent by the client. This ensures the job is always created under Bob's own company.

# The admin exception allows admin routes to query across company boundaries without a WHERE company_id clause. A junior developer argues that since admins are trusted users, it is fine to also let admins pass any company_id they want as a URL parameter and have company-scoped routes use that parameter instead of the recruiter row. What is wrong with this argument? What could go wrong if a non-admin recruiter's role were ever incorrectly set to admin in the database?





