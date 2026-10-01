# Chapter 22 — Auth Middleware

## What it does
A security guard function that checks every incoming request for a valid JWT token
before allowing access to protected routes. If token is missing, fake, or expired — 
request is rejected immediately. If valid — user identity is attached to the request
and the route handler runs.

---

## Problem it solves
Right now anyone can hit any route without being logged in.
Auth middleware protects certain routes so only logged-in users can access them.

---

## Why `req.user` doesn't exist by default
Express's Request object has `req.body`, `req.headers`, `req.params`, `req.query`
but NO `req.user` — Express is not an auth framework, it doesn't know what your
user looks like. You have to add it yourself.

### What each built-in property does:
- `req.body` — data sent inside the request (email, password from login form)
- `req.headers` — extra info sent with request (token, content-type)
- `req.params` — values from URL path e.g. `/jobs/abc-123` → `req.params.id = "abc-123"`
- `req.query` — values after `?` in URL e.g. `/jobs?status=open` → `req.query.status = "open"`

---

## Fix — `src/types/express.d.ts`
Create folder `src/types/` and file `express.d.ts` inside it:

```typescript
declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      role:   'admin' | 'recruiter' | 'applicant';
    };
  }
}
```

### Two important things:

**1. Capital `Express` not lowercase `express`**

`express` (lowercase) = the package you import in your code

`Express` (capital E) = a special extension slot the library left open on purpose
so you can add your own properties to Request. TypeScript merges your addition
with the original automatically. Lowercase won't work — TypeScript won't find
the right merging point.

**2. `user?` is optional**

Not every route needs auth. Public routes like `GET /jobs` don't have `req.user`.
Protected routes like `POST /jobs` do. The `?` tells TypeScript "this might not
always exist." On protected routes you use `req.user!` (with `!`) to tell
TypeScript "I know it's here, trust me" because authMiddleware already ran and
either attached it or threw an error stopping the request.

---

## The middleware — `src/shared/auth-middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './token.js';
import { UnauthorizedError } from './errors.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.slice(7);

  if (!token) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}
```

### What each part does:

`authHeader.startsWith('Bearer ')` — token must arrive in exact format:
`Bearer eyJhbGci...` (the word Bearer + space + token). Standard format called
RFC 6750. If it doesn't match → reject immediately.

`authHeader.slice(7)` — removes first 7 characters (`Bearer ` including space)
to get just the raw token string.

`if (!token)` — handles edge case where someone sent exactly `"Bearer "` with
nothing after it. Passed first check but token is empty.

`verifyAccessToken(token)` — checks if token is genuine and not expired.
If it fails → throws error → caught → passed to error handler.

`req.user = { userId: payload.sub, role: payload.role }` — attaches verified
user identity to the request so route handlers can read it. Called `userId`
not `sub` — cleaner name for your app code.

`return next(...)` on early exits — `return` is important. Without it code would
keep running into the try block even after rejecting. `return` stops execution there.

---

## How to use on a protected route

```typescript
router.get('/profile', authMiddleware, async (req, res, next) => {
  const { userId, role } = req.user!;
  res.json({ userId, role });
});
```

`authMiddleware` listed before handler — Express runs them in order.
If middleware calls `next(error)` → handler never runs.
If middleware calls `next()` with no error → handler runs, `req.user` is guaranteed there.
`!` after `req.user` tells TypeScript "I know this is defined here, trust me."

---

## JWT vs Session auth

### Session based (old way):
Every request → look up session in Redis/database → find user → continue.
One database query per request. Slower at high traffic.

### JWT based (what we use):
Every request → verify token signature (just math, no database) → continue.
No database query. Much faster.

### The tradeoff:
Sessions can be deleted instantly — logout works immediately.
JWT tokens can't be deleted — they expire on their own after 15 minutes.
So if you suspend a user, they still have 15 minutes of valid access.
Chapter 22 solves this with refresh tokens.

---

## Two token pattern (coming in Chapter 22)
- Access token — short lived (15 min), fast, no database check, can't be revoked instantly
- Refresh token — stored in database, can be deleted instantly, used to get new access tokens
- Speed comes from access token, control comes from refresh token