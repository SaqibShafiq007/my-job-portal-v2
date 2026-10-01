# 📘 Chapter 22 — Refresh Tokens

> **Core idea:** Access tokens are fast but can't be cancelled early. Refresh tokens fix that — long-lived, stored (as a hash) in the database, and fully revocable. This chapter builds the second half of the two-token system.

---

## 🕵️ 1. Rethink Impact — Why a Second Token At All?

- Access token: 15 min, stateless, **irrevocable** once signed. If stolen, attacker has up to 15 min — no way to cut them off early without adding the DB lookup JWTs were meant to avoid.
- **The compromise:** access token stays stateless (fast, hot path — every request). Refresh token is long-lived (7 days) but **stored as a hash in the database** (slow path — only hit once per 15 min, at `/auth/refresh`) → so it *can* be revoked by just deleting the row.

### Why SHA-256 for the refresh token, not bcrypt (like passwords)
| | Password | Refresh token |
|---|---|---|
| Who created it | Human (guessable/low-entropy) | Server, `crypto.randomBytes(32)` (256-bit random) |
| Attack that matters | Dictionary/brute-force guessing | None — 2²⁵⁶ possibilities, guessing is infeasible regardless of hash speed |
| Right hash | **bcrypt** (slow, defeats guessing) | **SHA-256** (fast, guessing was never the risk) |

Bcrypt's slowness only helps when an attacker can meaningfully *narrow down guesses* (like real human passwords). A raw random 256-bit token has no dictionary to try — SHA-256 being fast costs nothing here, and bcrypt would just waste 250ms per refresh for zero benefit.

---

## 🗄️ 2. The Migration — `refresh_tokens` Table

```ts
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE refresh_tokens (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT        NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  pgm.sql(`CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);`);
  pgm.sql(`CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);`);
}
```

### Column decisions
- **`user_id ... ON DELETE CASCADE`** — deleting a user auto-deletes all their tokens. No orphaned rows, no extra app-level cleanup needed.
- **`token_hash TEXT NOT NULL UNIQUE`** — `UNIQUE` protects against double-insert bugs. `TEXT` (not `CHAR(64)`) avoids wasted padding space.
- **`expires_at TIMESTAMPTZ`** — expiry is checked **in SQL**, not JavaScript (`WHERE expires_at > NOW()`). An expired row simply isn't returned — indistinguishable from "doesn't exist" from the app's point of view. Avoids a whole class of bugs (see Q2 below).
- **`created_at`** — audit trail, for debugging weird session counts later.
- **No `revoked_at` / `is_active` / soft-delete** — revocation = a real, hard `DELETE`. Simpler schema, simpler queries. Trade-off: no history of *when/why* a session ended, which this project doesn't need.

### The 3 indexes
| Index | Used by | Purpose |
|---|---|---|
| `token_hash` (implicit via `UNIQUE`) | Every refresh request | The hot path — fast lookup by hash |
| `idx_refresh_tokens_user_id` | `deleteAllRefreshTokensForUser`, and `ON DELETE CASCADE` | Fast "delete all sessions for this user" |
| `idx_refresh_tokens_expires_at` | A **future** cleanup job (not built yet) | Cheap to add now; expensive to backfill later on a huge table |

---

## ⚙️ 3. Config Addition

```ts
REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
```
`z.coerce.number()` — `.env` values are always strings; this converts `"7"` → the real number `7` automatically.

---

## 🗄️ 4. New Repo Functions (`auth.repo.ts`)

```ts
createRefreshToken(userId, tokenHash, expiresAt)      // INSERT — returns void, caller has everything already
findRefreshTokenByHash(hash)                          // SELECT ... WHERE token_hash = $1 AND expires_at > NOW()
deleteRefreshTokenByHash(hash)                        // DELETE by hash — used by logout & rotation
deleteAllRefreshTokensForUser(userId)                 // DELETE all — building block for future "logout everywhere"
findUserById(id)                                      // re-fetch user for role/status check during refresh
```

- **`findRefreshTokenByHash` doesn't JOIN `users`** — keeps concerns separate; if the service needs user data, it calls `findUserById` separately.
- **`deleteRefreshTokenByHash` deletes by hash, not `id`** — the caller only ever has the raw token (→ hash), never the row's internal `id`.

---

## ⚙️ 5. Service Layer (`auth.service.ts`)

### `issueTokenPair` — the shared "token factory"
```ts
async function issueTokenPair(userId, role) {
  const rawRefreshToken = crypto.randomBytes(32).toString('hex');           // 256-bit random → 64 hex chars
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24*60*60*1000);

  await createRefreshToken(userId, tokenHash, expiresAt);   // only the HASH is stored
  const accessToken = signAccessToken({ sub: userId, role });

  return { accessToken, refreshToken: rawRefreshToken };    // RAW token returned to caller, never stored
}
```

**Why this exists as one shared function:** without it, `login` and `refresh` would each duplicate the exact same generate/hash/store logic. If you ever changed the hashing algorithm or expiry math, you'd have to update **two** places — easy to update one and forget the other, causing tokens that silently stop matching. One function = one place to maintain, both callers automatically stay in sync.

### Updated `login`
Everything before token issuance is unchanged from Ch 20/21 (email check, status check, password check, dummy-hash timing trick). Only the ending changes:
```ts
const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role);
return { id: user.id, email: user.email, role: user.role, accessToken, refreshToken };
```

### `refresh(rawToken)`
```ts
export async function refresh(rawToken: string) {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const tokenRow = await findRefreshTokenByHash(hash);
  if (!tokenRow) throw new UnauthorizedError('Invalid or expired refresh token');

  const user = await findUserById(tokenRow.user_id);
  if (!user || user.status !== 'active') throw new UnauthorizedError('Invalid or expired refresh token');

  await deleteRefreshTokenByHash(hash);   // rotate: kill the old one FIRST
  return issueTokenPair(user.id, user.role);
}
```

**Why re-fetch the user instead of trusting old data?** Role/status can change *after* the token was issued (e.g. promoted to admin, or suspended). Re-reading guarantees every new token reflects the **current** real state — not stale info from whenever they first logged in.

**Why delete-first, not insert-first (important ordering decision):**
| Order | If it fails partway | Consequence |
|---|---|---|
| **Delete → Insert** (used here) | Insert fails | User has 0 tokens → must log in again. *Annoying but safe.* |
| Insert → Delete | Delete fails/lost | Both old AND new token valid briefly → a stolen old token could still work. *A real security gap.* |

> 🎓 **General lesson for any multi-step operation you can't make perfectly atomic:** ask "if step 2 fails right after step 1 succeeds, what's the worst outcome?" — then order the steps so failure leads to the **safer**, less risky state, even if it's less convenient.

### `logout(rawToken)`
```ts
export async function logout(rawToken: string): Promise<void> {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await deleteRefreshTokenByHash(hash);   // no error even if already gone
}
```
**Idempotent delete pattern:** deleting something that's already gone still counts as success. Makes logout safe to retry (e.g. after a flaky network) without any special client-side error handling.

**Doesn't check the token belongs to the caller's access-token identity — is that a problem? No.** Merely *possessing* a valid raw refresh token already proves full authorization — anyone who has it could instead use it to impersonate the user via `/refresh`, which is far more damaging than logging them out. There's no extra risk to add a check against.

---

## 🔌 6. New Routes

```ts
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = validateBody(refreshSchema, req.body);
    const tokens = await refresh(refreshToken);
    res.status(200).json(tokens);
  } catch (err) { next(err); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = validateBody(logoutSchema, req.body);
    await logout(refreshToken);
    res.status(204).send();
  } catch (err) { next(err); }
});
```

Schemas are deliberately minimal:
```ts
refreshToken: z.string().min(1)   // not .min(64) or a regex
```
No security benefit to stricter format checks here — a malformed OR wrong token both fail the same way at the database lookup. `.min(1)` just rejects empty strings before wasting a hash/DB call.

### Key design decisions
- **`POST`, not `GET`, for `/refresh`** — `GET` requests shouldn't carry a body (some proxies strip it), and `GET` is sometimes cached by default — but refresh must *always* actually reach the server and rotate the token, never serve a cached reply.
- **`/refresh` response = only `{ accessToken, refreshToken }`** — no `id`/`email`/`role` repeated; client already has that from login.
- **`/logout` returns `204`, not `200`** — "success, nothing to return" is exactly what `204` means; `200` would imply a body worth reading.
- **Neither route uses `authMiddleware`** — they authenticate via the refresh token in the body, a completely different mechanism. Requiring a valid *access* token here would be self-defeating: you need `/refresh` specifically *because* your access token already expired, and you should be able to `/logout` even with an expired access token too.

---

## 🧪 7. Manual Smoke Test — The Full Session Flow

| Step | Action | Expected |
|---|---|---|
| 1 | Login | 200, `{ id, email, role, accessToken, refreshToken }` (64-char hex) |
| 2 | Check DB | 1 row in `refresh_tokens`, raw token value never appears (only hash) |
| 3 | Call `/refresh` with the token | 200, brand new `accessToken` + `refreshToken` (different from originals) |
| 4 | Call `/refresh` again with the OLD token | 401 `"Invalid or expired refresh token"` — proves rotation worked |
| 5 | Call `/logout` with the NEW token | 204 |
| 6 | Check DB | 0 rows remaining for this session |
| 7 | Call `/logout` again with the same (deleted) token | 204 again — proves idempotency |

### PowerShell pattern used throughout
```powershell
# Short/hardcoded JSON → inline directly
curl.exe -s -X POST <url> -H "Content-Type: application/json" -d '{"email":"...","password":"..."}'

# JSON built from a variable → avoid quoting bugs via a temp file
$body = @{ refreshToken = $refreshToken } | ConvertTo-Json -Compress
$body | Out-File -FilePath temp_body.json -Encoding utf8 -NoNewline
curl.exe -s -X POST <url> -H "Content-Type: application/json" -d "@temp_body.json" | ConvertFrom-Json

# When you only care about the status code, not the body
curl.exe -s -o NUL -w "%{http_code}" -X POST <url> ...
```

---

## 🎓 Quiz Highlights (things worth remembering)

**"Sign out everywhere" deletes refresh tokens — why do other devices keep working for up to 15 more minutes?**
Because `authMiddleware` never queries the database — it only checks the JWT's signature + `exp`. Deleting `refresh_tokens` rows only blocks *future* refresh attempts; it has zero effect on an access token that's already been issued and is still within its own expiry window.

**Why check `expires_at > NOW()` in SQL instead of JS after fetching?**
1. **Clock skew** — SQL uses the DB server's clock; JS would use the app server's clock. Two different clocks can disagree.
2. **Fewer code paths** — SQL version only ever returns "valid row" or "null" (2 outcomes). JS version adds a third state ("found but expired") that every caller must remember to check separately.
3. **Misleading function contract** — a future developer calling `findRefreshTokenByHash` would assume "if I got a row back, it's valid" — true with the SQL check, false (and dangerous) with the JS check if they forget to also verify expiry themselves.

---

## ✅ Checklist

- [ ] Migration creates `refresh_tokens` with all 3 indexes
- [ ] `REFRESH_TOKEN_EXPIRES_IN_DAYS` added to config + `.env`
- [ ] 5 new repo functions added, using explicit column lists (no `SELECT *` leaking sensitive data)
- [ ] `issueTokenPair`, updated `login`, `refresh`, `logout` added to service
- [ ] `POST /auth/refresh` and `POST /auth/logout` routes added, mounted before `errorHandler`
- [ ] `npx tsc --noEmit` → zero errors
- [ ] Full 7-step manual smoke test passes

---

## 🎓 One-Line Summary

> *Access tokens stay fast and stateless for every request; refresh tokens are the revocable, database-backed mechanism that lets you actually kill a session. Store only the hash, rotate on every use (delete-first for safety), and let SQL — not JavaScript — decide what counts as "still valid."*
