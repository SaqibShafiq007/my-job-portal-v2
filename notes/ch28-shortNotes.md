# Chapter 28 — Scoping Queries to the Recruiter's Company (Short Notes)

## The Big Idea

When a recruiter asks "show me my company," the server must decide **which** company on its own — never by trusting the URL or request body.

The company is found using this chain:

```
Token (JWT) → userId → recruiters table → company_id → companies table → company info
```

The user can never just type a different company ID and see someone else's data.

## Why This Matters (IDOR Prevention)

If the server trusted a URL like `/api/companies/42`, anyone could change `42` to `43` and see another company's private data. This is called **IDOR** (Insecure Direct Object Reference).

The fix: always look up the company through the database, using the logged-in user's own ID — never from anything the user can type.

## The Three Files

### 1. `companies.repo.ts` (talks to the database)

- `getRecruiterCompany(userId)` → "Which company does this user belong to?" (looks in `recruiters` table)
- `getCompanyById(companyId)` → "Give me this company's details." (looks in `companies` table)

If no matching row is found, these functions return `null` instead of crashing.

### 2. `companies.service.ts` (business logic)

`getMyCompany(userId)`:
1. Call `getRecruiterCompany(userId)`.
2. If nothing found → throw **404** ("No company associated with this account").
3. Otherwise, call `getCompanyById(companyId)` using the ID just found.
4. If that also fails → throw **404** ("Company not found" — a data problem).
5. Otherwise, return the company.

### 3. `companies.routes.ts` (the actual endpoint)

```
GET /api/companies/me
```

- `/me` is just a route name meaning **"the currently logged-in user's own data."**
- Steps:
  1. Take `req.user.userId` (already verified by `authMiddleware` — cannot be faked).
  2. Call `getMyCompany(userId)`.
  3. Send the result back as JSON.

## What NOT to Do

Never build something like:

```
GET /api/companies/:companyId
```

...where the company ID comes straight from the URL. `requireRole('recruiter')` only checks that you're *a* recruiter — not *which* company you belong to. Skipping the `recruiters` table lookup means any recruiter could view any company's data.

## Why `getRecruiterCompany` Can Return `null`

A valid recruiter token does **not** guarantee a row exists in the `recruiters` table. This can happen if:
- The recruiter's row was deleted after the token was issued.
- The account was created but never fully linked to a company.

`null` here means "not currently associated with any company" — handled gracefully with a 404, not a crash.

## Testing Checklist (What Each Check Proves)

| Check | What It Proves |
|---|---|
| `npx tsc --noEmit` passes | Code has no type errors before running it |
| Recruiter fetches own company → `200` | The main feature actually works |
| Returned `id` matches the database | The company came from the real DB lookup, not something fakeable |
| Applicant token → `403` | Authorization works: valid login, wrong role, blocked |
| No token → `401` | Authentication works: total stranger, blocked |
| Recruiter with no company row → `404` | Edge case handled: valid token + role, but incomplete account data |

## Key Points to Remember

- The company returned is decided by **who you are** (your token), never by **what you ask for** (the URL).
- Two-step lookup: `userId → recruiters table → company_id`, then `company_id → companies table → company info`.
- Never scope a query using a value taken directly from `req.params` or `req.body`.
- `null` results from repo functions are handled explicitly — they become clear 404 errors, not crashes.
- Always match your code to your **actual** database schema — not just what a tutorial assumes it looks like.
