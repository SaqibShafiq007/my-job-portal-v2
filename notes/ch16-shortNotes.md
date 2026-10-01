# 📘 Chapter 16 — Request Validation

> **Core idea:** Turn the Chapter 15 concept ("validate at the boundary") into real, working code — using Zod.

---

## 🧠 1. Why Zod

A Zod schema is **both** the runtime validator *and* the TypeScript type — written once, never drifts apart.

```ts
const schema = z.object({ title: z.string().min(1) });
type Input = z.infer<typeof schema>; // { title: string }
```

| Without Zod | With Zod |
|---|---|
| Type + validation logic written twice | Written once, type auto-derived |
| Can silently drift out of sync | Always guaranteed in sync |

**Why Zod over alternatives (Joi, Yup, class-validator):** plain object schemas, strong TS integration, reports **all** errors at once — not just the first.

```bash
npm install zod@^3.22
```
*(`^3.22` required — `z.string().date()` needs at least that version)*

---

## 🛠️ 2. The Validation Utility — `src/shared/validate.ts`

```ts
import { z, ZodSchema, ZodError } from 'zod';

export class ValidationError extends Error {
  constructor(public readonly zodError: ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error);
  return result.data;
}

export function validateQuery<T>(schema: ZodSchema<T>, data: unknown): T { /* same shape */ }
export function validateParam<T>(schema: ZodSchema<T>, data: unknown): T { /* same shape */ }

export const uuidParam = z.string().uuid({ message: 'Invalid ID format' });
```

### 🔑 Key concepts

- **`ValidationError`** — a custom error class. Wraps Zod's raw `ZodError` inside it, so the rest of the app (and Chapter 17's error handler) only needs to know about *this* type — Zod stays hidden as an implementation detail of this one file. This is called a **clean dependency boundary**.
- **`parse` vs `safeParse`** — `parse()` throws Zod's own error directly. `safeParse()` never throws — returns `{ success, data, error }` instead, letting *you* decide what to throw (your own `ValidationError`).
- **Why 3 near-identical functions** (`validateBody`/`validateQuery`/`validateParam`) — same logic, different names purely for **readability** at the call site: `validateParam(uuidParam, req.params.jobId)` instantly tells the reader *what* is being validated.
- **`uuidParam`** — one shared, reusable UUID rule, so every module validates IDs the exact same way with the exact same error message.

---

## 📋 3. Writing Schemas — `src/modules/jobs/jobs.schema.ts`

```ts
const screeningQuestionInputSchema = z.object({
  text:     z.string().min(1, 'Question text is required').max(500),
  type:     z.enum(['text', 'boolean', 'url']),
  required: z.boolean().default(true),
});

const jobFieldsSchema = z.object({
  title:               z.string().min(1, 'Title is required').max(200),
  description:         z.string().min(1, 'Description is required').max(100_000),
  status:              z.enum(['draft', 'open']),
  deadline:            z.string().date('Deadline must be YYYY-MM-DD').optional(),
  attributes:          z.object({}).catchall(z.unknown()),
  screening_questions: z.array(screeningQuestionInputSchema),
});

export const createJobSchema = jobFieldsSchema.extend({
  status:              z.enum(['draft', 'open']).default('draft'),
  attributes:          z.object({}).catchall(z.unknown()).default({}),
  screening_questions: z.array(screeningQuestionInputSchema).default([]),
});

export const updateJobSchema = jobFieldsSchema.partial();

export const listJobsQuerySchema = z.object({
  status: z.enum(['draft', 'open', 'closed']).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ListJobsQuery  = z.infer<typeof listJobsQuerySchema>;
```

### 🔍 Notable design choices

| Choice | Why |
|---|---|
| No `id` on `screeningQuestionInputSchema` | Server generates the UUID; recruiter only supplies content |
| `type: z.enum(['text','boolean','url'])` | Matches the 3 question types from Ch.9 |
| `z.string().date()` | Validates `YYYY-MM-DD` without converting to a `Date` object — Postgres accepts the string directly |
| `z.object({}).catchall(z.unknown())` over `z.record()` | `z.record()` silently accepts arrays (arrays are objects with numeric keys in JS); `z.object({})` correctly rejects them |
| `z.coerce.number()` on query params | URL query strings are always text (`?page=2` → `"2"`) — `coerce` converts to a real number before validating |

### ⚠️ `createJobSchema` vs `updateJobSchema` — the critical difference

- **`createJobSchema`** → fills in defaults for missing fields (`status → 'draft'`, `screening_questions → []`). Makes sense for a *brand-new* record.
- **`updateJobSchema`** (`.partial()`) → every field optional, **no defaults applied**. A `PATCH` omitting `status` leaves it `undefined` → service knows *not* to touch the stored value.

> 🚨 **The danger of getting this wrong:** if `createJobSchema.partial()` were used for updates instead, an empty `{}` body would parse into `{ status: 'draft', attributes: {}, screening_questions: [] }` — **silently wiping existing data** on every partial update. This is exactly why two separate schemas exist.

---

## 🔌 4. Wiring Validation Into Routes

```ts
router.post('/', async (req, res, next) => {
  try {
    const body = validateBody(createJobSchema, req.body);
    // body is fully typed & validated — service trusts it completely
  } catch (err) {
    next(err);
  }
});
```

- **Why `try/catch` + `next(err)` is required:** Express 4 does **not** auto-catch errors thrown inside `async` route handlers. Without this pattern, a thrown `ValidationError` would be silently lost instead of reaching the error handler.
- Same pattern applies to `validateQuery` (query strings) and `validateParam` (URL path segments like `:jobId`).
- All three throw the **same** `ValidationError` type → Chapter 17's error handler needs only **one** check: `if (err instanceof ValidationError)` — regardless of whether the bad input came from body, query, or param.

---

## 🎯 5. Solving the "Two Round-Trips" Problem (from Rethink Impact)

Zod validates the **entire object** and collects **every** failure at once — not just the first:

```json
{
  "errors": [
    { "path": ["title"], "message": "Title is required" },
    { "path": ["screening_questions", 0, "text"], "message": "Question text is required" }
  ]
}
```

- `path` → exact location of the problem (even nested, like question index `0`'s `text` field)
- `message` → your custom, human-friendly text

➡️ Recruiter fixes **everything in one pass** instead of resubmitting multiple times.

> Chapter 16's job: **throw** the error. Chapter 17's job: **format** it into this shape for the client.

---

## ✅ Checklist

- [ ] `src/shared/validate.ts` exists — exports `ValidationError`, `validateBody`, `validateQuery`, `validateParam`, `uuidParam`
- [ ] `src/modules/jobs/jobs.schema.ts` exists — exports `createJobSchema`, `updateJobSchema`, `listJobsQuerySchema`, and their inferred types
- [ ] TypeScript compiles cleanly:
  - Confirm both files are inside `tsconfig.json`'s `include` paths
  - Run `npx tsc --noEmit` → zero errors
- [ ] **Manual smoke test** — confirms multi-error reporting works:
  ```ts
  import { createJobSchema } from './src/modules/jobs/jobs.schema';

  const result = createJobSchema.safeParse({
    title: '',
    screening_questions: [{ text: '', type: 'text' }],
  });
  console.log(JSON.stringify(result.error?.errors, null, 2));
  // Should show 2 errors: ["title"] and ["screening_questions", 0, "text"]
  ```
- [ ] `updateJobSchema.safeParse({})` → returns `{ success: true, data: {} }` (empty body valid, **no defaults filled in**)
- [ ] `validateParam(uuidParam, 'not-a-uuid')` → throws `ValidationError`
- [ ] `validateParam(uuidParam, '550e8400-e29b-41d4-a716-446655440000')` → returns the UUID string

---

## 🎓 One-Line Summary

> *Zod schemas are your single source of truth for both validation and types. `validate.ts` wraps Zod so the rest of the app never touches it directly. Route handlers validate first, trust completely after — and every failure, from any field, comes back at once.*
