# Quiz
# Q1. A recruiter's company_id is stored in the recruiters table as c-111. A different company has id = c-222. The recruiter calls GET /api/companies/me. Trace every SQL query that runs, in order. Show the exact value bound to each query parameter. Confirm that c-222 cannot appear in any query result.

Let's say the recruiter's token belongs to userId = 'u-123' (this recruiter's company_id in the recruiters table is c-111).
Query 1 — inside getRecruiterCompany(userId):
sqlSELECT r.company_id, r.company_role
FROM recruiters r
WHERE r.user_id = $1

Parameter $1 = 'u-123'
Result: { company_id: 'c-111', company_role: 'owner' }

Query 2 — inside getCompanyById(companyId):
sqlSELECT id, name, ...
FROM companies
WHERE id = $1

Parameter $1 = 'c-111' (this came from the result of Query 1, not from the request)
Result: the BrightBuild-style row with id = 'c-111'

Why c-222 can never appear:
Notice the second query's parameter isn't typed by the user, isn't in the URL, isn't in the request body — it's literally the output of the first query. The only way c-222 could ever get plugged into Query 2 is if c-222  were returned by Query 1. But Query 1 is filtered by WHERE user_id = 'u-123', and this recruiter's row only ever has company_id = 'c-111'. There is no code path where the recruiter's own request data (headers, body, URL) ever touches either query's parameters. So c-222 simply never has a way to enter the chain — it's not blocked by a check, it's structurally impossible.







# Q2. A developer proposes adding a company_id column to the JWT payload when the token is issued, so that getRecruiterCompany can be skipped and the company scope can be read directly from req.user.companyId. What is the advantage of this approach? What is the risk, and under what circumstances does the JWT-embedded company_id become stale or incorrect?


The proposed idea: instead of looking up company_id from the database every time, just bake it into the token when it's issued, so req.user.companyId is available instantly — no extra query needed.
The advantage: Speed. You skip a database round-trip (getRecruiterCompany) on every single request. Slightly less code, slightly faster response.
The risk — this is the important part:
A JWT is a signed snapshot, frozen at the moment it was issued. It does not update itself when the database changes. So if anything about the recruiter's company relationship changes after the token was handed out, the token still says the old thing — and the server has no way to know it's outdated without checking the database anyway (which defeats the whole point of skipping the lookup).
Concrete situations where the embedded company_id goes stale/wrong:

The recruiter switches companies (removed from Company A, added to Company B) — their old token still claims Company A.
The recruiter is removed from a company entirely (fired/deactivated) — their token still claims membership.
The company itself is deleted or merged — the token points to a company_id that no longer exists.
An admin corrects a data-entry mistake in the recruiters table — the token doesn't reflect the fix.

Until that token expires (which could be minutes or hours later, depending on how long-lived it is), the user keeps acting under outdated permissions — exactly the same class of problem covered earlier: "JWT Limitation" (a suspended user's token still works until it expires). Baking company_id into the JWT just adds a second thing that can go stale, on top of the role.
Bottom line: doing the DB lookup every time is slightly slower, but it's always correct, right now — reflecting the true current state. Trusting the JWT's embedded value is faster, but can silently be wrong.







 # Q3. The getMyCompany service function receives userId from the route handler. The route handler reads req.user!.userId. The ! non-null assertion is used. Explain why this assertion is safe here even though req.user is declared as optional on Express.Request. What specific guarantee, made by a middleware that runs before this handler, allows the assertion to be correct?
 The setup: Express.Request.user is typed as optional (user?: {...}) — TypeScript's way of saying "this property might not exist; check before using it." Normally, using ! (the non-null assertion) is risky, because you're telling TypeScript "trust me, ignore your own warning" — and if you're wrong, the app crashes at runtime.
Why it's actually safe here — the guarantee:
Look at how the router is set up:
tsrouter.use(authMiddleware, requireRole('recruiter'));

router.get('/me', async (req, res, next) => {
  const company = await getMyCompany(req.user!.userId);
  ...
});
authMiddleware runs first, on every request that reaches this router, before the /me handler ever executes. And here's the key: authMiddleware only calls next() (letting the request continue) after it successfully verifies the token and sets req.user = { userId, role }. If the token is missing or invalid, authMiddleware throws a 401 and stops the request right there — the /me handler never runs at all.
So by the time code execution reaches req.user!.userId inside the handler, we already know — as a guarantee, not a guess — that authMiddleware succeeded and definitely set req.user. There's no possible path where this specific handler runs without req.user being set.
TypeScript itself can't see this guarantee — it doesn't understand "this middleware ran earlier and guaranteed this field exists," because that's a runtime relationship between two separate functions, not something visible in the type system. So TypeScript still treats req.user as possibly-undefined by default. The ! is the developer saying: "I know something true about the order of execution that TypeScript's type-checker can't see — trust me, this is guaranteed by the middleware chain."

