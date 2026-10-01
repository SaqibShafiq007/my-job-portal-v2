# 📘 Chapter 17 — Consistent Errors & Status Codes

> **Core idea:** One shared place to catch every error, one agreed response shape — so no matter which endpoint fails, the frontend always gets the same predictable format.

---

## 🚨 1. The Problem This Chapter Fixes

Without a shared system, every endpoint invents its own error style:

| Endpoint | Response | Problem |
|---|---|---|
| A | `{ "error": "invalid input" }` (400) | Own format |
| B | `{ "message": "Unprocessable Entity" }` (422) | Different format, same problem type |
| C | raw Postgres error text (500) | Leaks table/column names — a security risk |

**Why this is bad:**
- Frontend needs **separate code for every endpoint** just to show an error nicely
- Raw DB errors confuse users *and* leak internal system details
- Every new endpoint added later makes it worse — no shared standard to follow

**The fix:** one error class hierarchy + one error handler + one response shape, used everywhere.

---

## 🏗️ 2. The Error Class Hierarchy — `errors.ts`

### Why not just `res.status(404).json(...)` everywhere?

```ts
// ❌ Repeated in every route
if (!job) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
}
```

**Two problems:**
1. The **service layer** shouldn't know about HTTP at all — its job is business logic, not response formatting.
2. **No single source of truth** — change the response shape later, and you have to hunt down every copy-pasted spot.

### The fix — throw a typed error instead

```ts
// ✅ Service just says what happened — nothing about HTTP
if (!job) throw new NotFoundError('Job not found');
```

```ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(404, 'NOT_FOUND', message); }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') { super(401, 'UNAUTHORIZED', message); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') { super(403, 'FORBIDDEN', message); }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflict') { super(409, 'CONFLICT', message); }
}
```

**Why subclasses instead of one generic `AppError(404, 'NOT_FOUND', ...)`?**
→ `instanceof NotFoundError` reads clearly in tests/middleware, vs. comparing raw numbers (`err.statusCode === 404`) — easy to typo, harder to read.

**Why `ValidationError` (ch16) is *not* part of this family:** it carries a different shape of data (a list of field errors from Zod), and is tightly coupled to Zod — so it lives in `validate.ts`, handled through a *separate* branch in the error handler.

> ✨ **Payoff:** adding a new error type (e.g. `PaymentRequiredError`, 402) means changing **one file** — `errors.ts`. Nothing else needs to change, since the handler reads `statusCode`/`code` generically off *any* `AppError` subclass.

---

## 🧯 3. The Error Handler — `error-handler.ts`

### How Express recognizes an error handler

Express counts function parameters:
- Regular middleware → `(req, res, next)` — 3 params
- **Error handler** → `(err, req, res, next)` — **4 params**

> ⚠️ Keep all 4 params even if `next` is unused, or Express stops treating it as an error handler — errors pass through silently.
> ⚠️ Must be registered **after** every route — Express only looks *forward* through the middleware chain to find a handler.

### The agreed response shape

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

Validation errors add a `details` array (multi-field errors, ch16's fix):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "path": "title", "message": "Required" }]
  }
}
```

### The four branches, in order

| # | Catches | Status | Why |
|---|---|---|---|
| 1 | `ValidationError` | 422 | Well-formed JSON, but failed schema rules |
| 2 | `AppError` (any subclass) | its own `statusCode` | Reads built-in `statusCode`/`code` — no manual mapping needed |
| 3 | malformed JSON (`SyntaxError`) | 400 | Body parser itself throws before validation even runs |
| 4 | anything else (unexpected) | 500 | Fallback — logs full error privately, sends generic message publicly |

### 🔒 The "500 leak risk" — why hide real errors from the client

Two audiences, two needs:
- **You (developer)** need the *full* error to fix bugs → logged with `console.error`
- **The client** must never see it → raw DB/library errors can leak table names, column names, connection info (a real security risk)

```ts
const message =
  config.NODE_ENV === 'development' && err instanceof Error
    ? err.message                          // helpful for local debugging
    : 'An unexpected error occurred';      // safe, generic in production
```

### Why `err instanceof Error` before touching `.message`
`err` is typed `unknown` because *anything* can be thrown in JS (`throw 'oops'`, `throw 42` are legal). The `instanceof Error` check confirms it's safe to access `.message` — this is called **type narrowing**.

### Why `_next` (underscore) stays even though it's unused
Required for Express's 4-param detection rule — removing it breaks recognition. The underscore just tells linters "unused on purpose, don't warn me."

---

## 🔌 4. Wiring It Up — `app.ts`

```ts
// ...all routes registered above...
app.use(errorHandler);   // must be LAST
return app;
```

> **The one rule that matters:** `errorHandler` must come **after every route**. Anything registered after it will never have its errors caught.

---

## 🔄 5. The Full Flow — One Worked Example

**Request:** `GET /test/not-found`

```
1. Route handler runs:
   app.get('/test/not-found', (_req, _res, next) => {
     next(new NotFoundError('Job not found'))
   })

2. `new NotFoundError('Job not found')` builds an object:
   { statusCode: 404, code: 'NOT_FOUND', message: 'Job not found', name: 'NotFoundError' }
   → this happens via errors.ts (NotFoundError → calls super() → AppError → calls super() → built-in Error)

3. next(errorObject) — hands the finished object to Express,
   telling it: "skip normal flow, find the error handler"

4. Express scans for a 4-param function → finds app.use(errorHandler)

5. Inside errorHandler:
   - err instanceof ValidationError?  ❌
   - err instanceof AppError?         ✅ (NotFoundError extends AppError)
     → res.status(err.statusCode).json({ error: { code: err.code, message: err.message } })

6. Client receives:
   HTTP 404
   { "error": { "code": "NOT_FOUND", "message": "Job not found" } }
```

**Key insight:** `errors.ts` never calls `next()` — it only *builds* the error object. `app.ts` is what *hands* that finished object to `next()`. Two separate jobs, just written on one line.

---

## ✅ Checklist

- [ ] `src/shared/errors.ts` — `AppError` base + `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`
- [ ] `src/shared/error-handler.ts` — 4 branches (`ValidationError` → `AppError` → `SyntaxError` → fallback 500)
- [ ] `errorHandler` wired into `app.ts` as the **last** `app.use()` call
- [ ] `npx tsc --noEmit` → zero errors
- [ ] Manually tested all 3 branches via temporary routes (`/test/not-found`, `/test/validation`, `/test/unhandled`) — then removed them once verified

---

## 🎓 One-Line Summary

> *Services throw typed errors and know nothing about HTTP. One error handler, registered last, reads each error's built-in properties and turns it into the same safe, consistent response — logging the real details privately, and never leaking internals to the client.*
