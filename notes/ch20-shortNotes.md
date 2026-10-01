# 📘 Chapter 20 — Register & Login

> **Core idea:** Build a working register/login API — validated input, hashed passwords, timing-safe login — using the layered schema → repo → service → route architecture.

---

## 🧩 1. What This Chapter Builds

5 files inside `src/modules/auth/`:
- `auth.schema.ts` — Zod rules for register/login
- `auth.repo.ts` — raw SQL (find user, create user)
- `auth.service.ts` — business logic (conflict checks, password checks)
- `auth.routes.ts` — the actual HTTP endpoints
- One line in `app.ts` — mounts the auth router

> **Note:** login only returns `{ id, email, role }` for now — no token yet. Chapter 21 adds the access token; Chapter 22 adds the refresh token.

---

## 🕵️ 2. Rethink Impact — Should "Email Already Taken" Be Revealed?

**The scenario:** signup with a used email → server replies `409: "An account with that email already exists."`

**The obvious worry:** this enables **account enumeration** — an attacker probing emails to learn who's registered.

**But context matters:**
- A job portal is a **public, findable** platform (like LinkedIn) — recruiters *want* to be found via their company email; applicants *want* to be discoverable.
- Compare to a banking/healthcare/dating app, where "does this person have an account here" is itself sensitive — very different threat model.
- Fully hiding this info costs real UX: confused users who forgot they signed up get no helpful guidance → more support tickets.

### Three options considered
| Option | Response | Leaks info? | Used here? |
|---|---|---|---|
| A — Short conflict | `"Email already taken"` | Mild (email is occupied) | ✅ **Yes** |
| B — Fully explicit | `"An account with that email already exists."` | Same leak, friendlier wording | ❌ |
| C — Silent success | `200 OK`, quietly emails the real account holder instead | None | ❌ (needs working email pipeline) |

> 🎓 **The real lesson:** not "always hide everything" or "always be maximally open" — the point is to **decide deliberately**, based on your actual platform's threat model (ch18), not blindly follow a generic rule.

---

## 📋 3. `auth.schema.ts`

```ts
export const registerSchema = z.object({
  email:    z.string().email('Must be a valid email address').transform(v => v.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be 72 characters or fewer'),
  role:     z.enum(['recruiter', 'applicant'], { message: 'Invalid role' }),
});

export const loginSchema = z.object({
  email:    z.string().email('Must be a valid email address').transform(v => v.toLowerCase()),
  password: z.string().min(1, 'Password is required').max(1000, 'Password too long'),
});
```
> ⚠️ **Zod v4 note:** use `{ message: '...' }`, not the old `{ errorMap: ... }` — that's a v3-only API.

### Key decisions

- **`'admin'` excluded from register's role enum** — admin accounts are only ever seeded directly (ch13), never self-registered. If `'admin'` were allowed here, anyone could instantly grant themselves full platform control with one API call. A future "invite an admin" flow would need a **separate**, admin-only-callable endpoint.
- **Custom role error message** (`'Invalid role'`) — Zod's default message would leak the full list of valid roles (`"Expected 'recruiter' | 'applicant', got 'admin'"`), accidentally confirming `'admin'` is a real role. Custom message hides this.
- **No `.default()` on role** — forces the field to always be explicit; omitting it is a validation error, not a silent guess.
- **`.email()` is deliberately loose** — checks *shape* only, not deliverability. Real deliverability (does the mailbox exist) is confirmed later via an actual confirmation email (Ch 23) — that's an async step, not something a synchronous validator can do.
- **`.transform(v => v.toLowerCase())`** — `USER@EXAMPLE.COM` and `user@example.com` are the same mailbox; without this, they could become two different "accounts" — a bug.
- **`max(72)` on register password** — prevents ever creating a password long enough to hit bcrypt's silent 72-byte truncation (Ch 19).
- **NO `max(72)` on login password** — deliberately different! If an old/migrated user has a password >72 chars, `bcrypt.compare()` will *itself* truncate their input to match how their original hash was made — so login still works correctly. Adding `max(72)` to login would incorrectly reject a *correct* password for such users, purely at the validation layer, before it even reaches bcrypt.
- **`max(1000)` on login password (not for security, for resource protection)** — without any cap, a client could send a massive string; even though bcrypt would truncate it internally, the server still wastes memory/CPU *receiving and parsing* it first. A generous cap blocks abuse without affecting real users.

---

## 🗄️ 4. `auth.repo.ts` — Only File That Touches SQL

```ts
export interface UserRow {
  id: string; email: string; password_hash: string;
  role: 'admin' | 'recruiter' | 'applicant';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(
    'SELECT id, email, password_hash, role, status FROM users WHERE email = $1',
    [email],
  );
  return rows[0] ?? null;
}

export async function createUser(email, passwordHash, role) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, role, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING id, email, role`,
    [email, passwordHash, role],
  );
  return rows[0];
}
```

- **`UserRow` interface** — without it, `pg` types rows as `any[]`; passing it as `query<UserRow>()` gives real type-checking. Includes `password_hash` on purpose — the *service* needs it for `verifyPassword`; it's the service's job to strip it, not the repo's.
- **Named columns, not `SELECT *`** — if a sensitive column gets added to `users` later, `SELECT *` would silently start returning it too. Explicit columns mean nothing new leaks in without a deliberate code change.
- **`status: 'active'` hardcoded** — self-registered users are usable immediately, with **no email verification yet**. This is an intentional, temporary gap — Chapter 23 changes this to `'pending'` + a real activation flow. Don't treat this as production-ready before Ch 23.
- **`RETURNING id, email, role`** — `password_hash` is never returned from this query at all, so there's nothing to accidentally leak outward.

---

## ⚙️ 5. `auth.service.ts` — The Business Logic

```ts
const DUMMY_HASH = '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zLklGLsR9XFKQZ5kQlbri';

export async function register(input: RegisterInput) {
  const existing = await findUserByEmail(input.email);
  if (existing) throw new ConflictError('Email already taken');

  const passwordHash = await hashPassword(input.password);
  return createUser(input.email, passwordHash, input.role);
}

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  if (!user) {
    await verifyPassword(input.password, DUMMY_HASH); // pay the same time cost
    throw new UnauthorizedError('Invalid credentials');
  }

  if (user.status !== 'active') throw new UnauthorizedError('Account suspended');

  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  return { id: user.id, email: user.email, role: user.role };
}
```

### 🔒 The `DUMMY_HASH` trick — solving a timing side-channel

**The problem:** `bcrypt.compare()` takes ~250ms. If "email not found" returns instantly (skips bcrypt) but "email found, wrong password" takes 250ms (runs bcrypt) — an attacker can **measure response time** to figure out which emails are registered, even though the error text is identical either way.

**The fix:** always call `verifyPassword`, even when no user exists — just against a fixed, meaningless pre-computed hash. Both code paths now take the same ~250ms, so timing reveals nothing.

- Must be a **real, valid bcrypt hash** (not garbage text) — `bcrypt.compare()` needs to parse out a salt/cost factor from it to actually run its normal comparison process.
- Lives in the **service**, not the repo — deciding *when* to fake-check a password is a business rule, not a data-access concern.

### Why 3-4 `if` checks are fine here (and don't contradict ch15/16's rule)

Two *different* kinds of checks exist:
- **Format/shape checks** ("is email a valid format?", "is password ≥ 8 chars?") → validation's job (schema/route layer) — **never** the service's job.
- **Business/state checks** ("does this email already exist in the DB?", "is this account active?", "does this password actually match the stored hash?") → these need **real data** from the database, which only the service layer has access to after fetching it. This was always meant to live here.

> **Analogy:** validation is the bouncer checking "is this a real-looking ID?" The service is the bartender checking "okay, but according to our system, are you actually allowed in tonight?"

### Why the service throws named errors, never HTTP codes

`register` throws `ConflictError`; `login` throws `UnauthorizedError` — neither touches `res` or knows about status codes. The **error handler** (Ch 17) is the *only* place that maps `ConflictError → 409`, `UnauthorizedError → 401`. This keeps the service reusable from anywhere (CLI script, test, queue worker) without dragging Express along as a dependency.

---

## 🔌 6. `auth.routes.ts` + Wiring

```ts
router.post('/register', async (req, res, next) => {
  try {
    const body = validateBody(registerSchema, req.body);
    const user = await register(body);
    res.status(201).json(user);
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = validateBody(loginSchema, req.body);
    const user = await login(body);
    res.status(200).json(user);
  } catch (err) { next(err); }
});
```

```ts
// app.ts
app.use('/auth', authRouter);   // before errorHandler
app.use(errorHandler);          // must stay last
```

- **`try/catch` + `next(err)` required** — Express 4 doesn't auto-catch errors thrown inside `async` handlers; without this, a thrown error becomes an unhandled rejection instead of reaching the error handler.
- **`authRouter` must be registered *before* `errorHandler`** — Express only looks *forward* through the chain to find an error handler.

### Why `201` for register, `200` for login
| Code | Means | Used for |
|---|---|---|
| **201 Created** | A new resource now exists that didn't before | Register — a new `users` row is created |
| **200 OK** | Request succeeded, nothing new created | Login — just checks an existing identity |

Some clients behave differently based on status (e.g. expecting a `Location` header on `201`) — using the semantically correct code keeps the API predictable to anything that understands standard HTTP.

### Response shapes
```json
// Register — 201
{ "id": "...", "email": "morgan@example.dev", "role": "applicant" }

// Login — 200 (this chapter)
{ "id": "...", "email": "alice@brightbuild.dev", "role": "recruiter" }
```
Chapter 21 adds `accessToken`; Chapter 22 adds `refreshToken`. **Fields grow — the shape never changes.**

---

## 🐛 7. How `password_hash` Leaks Happen in Real Codebases (the mistake to avoid)

Even though the rule ("never return `password_hash`") is simple, it gets violated in practice through two common mistakes:

**Mistake 1 — lazy `SELECT *` / `RETURNING *`**
```sql
INSERT INTO users (...) VALUES (...) RETURNING *   -- ❌ grabs password_hash too
```
If that full row gets passed straight to `res.json(...)`, the hash silently leaks into the HTTP response — no error, no warning, nothing in your logs. Only way to notice: someone actually inspects the raw response.

**Mistake 2 — reusing a variable that still has the full row**
```ts
const user = await findUserByEmail(email); // has password_hash (needed for verifyPassword)
// ...later, elsewhere in the code...
res.json(user); // ❌ oops — sent the WHOLE row
```

### The fix
1. **Always use explicit column lists** (`SELECT id, email, role`) for anything that flows outward — never `SELECT *`/`RETURNING *`.
2. **Let TypeScript catch it** — if a repo function's return type is explicitly `{ id, email, role }` (no `password_hash`), the compiler itself will reject code that tries to sneak the hash into a response expecting only those 3 fields.

---

## 🔮 8. What a "Forgot Password" Flow Would Need (not built yet, but good to understand)

1. **Request endpoint** — user submits just their email (`POST /auth/forgot-password`)
2. **Generate a random, one-time token** — same idea as a refresh token: long, random, unguessable
3. **Store only a hash of it**, tied to the user, with a short expiry (e.g. 15–30 min)
4. **Email the token/link** to the user — proves identity via inbox access, without needing the old password
5. **Reset endpoint** — validates the token (exists? not expired? not already used?), then hashes and saves the new password
6. **Invalidate the token after use** — one-time use only, same "rotation" idea as refresh tokens
7. **Don't reveal whether the email exists** — generic response either way, same enumeration concern as registration

---

## ✅ Checklist

- [ ] `auth.schema.ts` — `registerSchema`, `loginSchema`, inferred types exported
- [ ] `auth.repo.ts` — `findUserByEmail`, `createUser`, explicit column lists only
- [ ] `auth.service.ts` — `register`, `login`, `DUMMY_HASH` timing-safety trick
- [ ] `auth.routes.ts` — `POST /register` (201), `POST /login` (200)
- [ ] `authRouter` mounted in `app.ts` **before** `errorHandler`
- [ ] `npx tsc --noEmit` → zero errors
- [ ] Manually tested: register with new email → 201; register with existing email → 409 `"Email already taken"`; login with seeded user → 200; login with wrong password → 401 `"Invalid credentials"`
- [ ] Confirmed `password_hash` never appears in any response body

---

## 🎓 One-Line Summary

> *Validation checks shape (schema layer); the service checks real business state (does this exist? is it active? does the password match?) using real data from the database. Errors are thrown as named classes, never HTTP codes, so the service stays reusable anywhere. Timing-safe dummy checks and careful column selection prevent two subtle but serious leaks: knowing who's registered, and exposing password hashes.*
