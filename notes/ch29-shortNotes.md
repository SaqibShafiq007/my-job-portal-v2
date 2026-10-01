# Chapter 29 — Ownership Checks & IDOR Prevention (Short Notes)

## The Big Idea

Knowing **who** someone is (authentication) and **what role** they have (authorization) is not enough. You also need to check: does this specific thing they're asking for actually **belong** to them?

Example: A recruiter is logged in, and is definitely a recruiter — but is job `#77` actually *their* job, or does it belong to a different company? Nothing about login or role tells you that. You need a separate check.

## What Is IDOR?

**IDOR = Insecure Direct Object Reference.**

It happens when a user can access someone else's data just by changing an ID — in a URL, request body, or query string — because the server never checked "does this ID actually belong to you?"

**Example without a check:**

```
GET /api/jobs/job-xyz
```

If the server just runs:

```sql
SELECT * FROM jobs WHERE id = $1
```

...and returns whatever it finds — without checking who the job belongs to — then any recruiter can view **any company's** job just by guessing/changing the ID in the URL. That's IDOR.

## The Fix: Ownership Checks

After fetching a record, always compare **who it belongs to** against **who is asking** (from the verified token) — never trust an ID from the request as proof of ownership.

**Pattern (same for any resource):**
1. Fetch the resource by its ID (from the URL).
2. Compare its owner field to the value from the JWT (directly, or via a DB lookup seeded by the JWT).
3. If they don't match (or nothing was found) → throw `NotFoundError`.
4. If they match → continue normally.

**For company-scoped resources (e.g. jobs):**
`job.company_id === recruiter.companyId`

**For user-scoped resources (e.g. applicant profiles):**
`applicant.user_id === req.user.userId`

**The golden rule:** the "correct" value to compare against always comes from the **JWT** — never from the URL or request body.

## Why 404, Not 403?

When ownership fails, the server has two choices:

| Status | Meaning | Reveals? |
|---|---|---|
| **403 Forbidden** | "This exists, but you can't have it." | ✅ Confirms the resource exists |
| **404 Not Found** | "I don't know what you're talking about." | ❌ Hides whether it even exists |

**For cross-company/cross-user ownership checks → use 404.**

Why: if we used 403, an attacker could guess random IDs and learn something from the status code alone — "403 = real ID, just not mine" vs "404 = fake ID." That lets them slowly map out real IDs across the whole system. Using 404 for both "doesn't exist" and "exists but isn't yours" gives an attacker **zero information** either way.

**Use 403 instead** only for lower-stakes cases — e.g. a recruiter trying an admin-only action on their *own* company's data, where confirming the resource exists isn't sensitive.

## Nonexistent vs Not-Owned — Same Response

A completely fake job ID and a real job ID belonging to another company must return the **exact same 404 response**. If they looked different, an attacker could tell them apart — which itself is a leak.

## Applies to Any Owned Resource

The exact same pattern works for applicants too — an applicant should never be able to view another applicant's profile by changing an ID. Same steps: fetch → compare owner field to the JWT's `userId` → throw 404 if mismatched.

## Combining the Check + the Action (for writes)

Normally, an update/delete needs two steps:
1. Check ownership (SELECT)
2. Perform the write (UPDATE/DELETE)

That's two trips to the database. You can combine them into **one query** by putting the ownership condition directly in the `WHERE` clause:

```sql
DELETE FROM jobs WHERE id = $1 AND company_id = $2
```

- If the job exists **and** belongs to that company → 1 row is deleted.
- If not (wrong company or doesn't exist) → 0 rows are deleted.

**The affected row count becomes the ownership check itself:**

```ts
if (result.rowCount === 0) {
  throw new NotFoundError('Job not found');
}
```

**Why this is better:**
- Faster — one round-trip instead of two.
- Safer — removes a small timing gap between "checked, it's mine" and "now deleting it," where something could theoretically change in between.

## Key Points to Remember

- Authentication + role checks are not enough — always verify **ownership** of the specific resource.
- IDOR = accessing someone else's data by guessing/changing an ID, because ownership was never checked.
- Ownership checks compare a database field (`company_id`, `user_id`) against a value from the **verified JWT** — never from the URL or body.
- Use **404** (not 403) when hiding existence matters — e.g. cross-company or cross-user data.
- Nonexistent and not-owned resources must return **identical** responses.
- For writes, combine the ownership check and the action into a single query using `WHERE id = $1 AND owner_field = $2`, and use the affected row count as the check.
