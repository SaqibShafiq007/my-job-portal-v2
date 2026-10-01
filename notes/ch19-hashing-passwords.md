# 📘 Chapter 19 — Hashing Passwords

> **Core idea:** Never store what a user typed. Store a slow, irreversible transformation of it — slow enough to make mass-cracking impractical, fast enough that one real login doesn't feel broken.

---

## 🕵️ 1. Rethink Impact — Same Breach, 3 Different Hash Choices

Your database gets dumped (doesn't matter how). Attacker has 10,000 password hashes + a 100-million-entry common-password dictionary + a GPU cluster.

| Algorithm | Speed on GPU | Time to crack 100M dictionary |
|---|---|---|
| **MD5** | ~50–100 billion hashes/sec | **< 1 second** |
| **SHA-256** | ~10–20 billion hashes/sec | **< 1 minute** |
| **bcrypt (cost 12)** | ~20,000 hashes/sec | **~83 hours** *per target* |

> 🎯 **The point:** MD5/SHA-256 are built to be **fast** — great for checksums, terrible for passwords. Once your database leaks, the attacker cracks entirely offline, at whatever speed their hardware allows. Fast hash = you handed them billions of guesses/sec for free.

Bcrypt doesn't make weak passwords ("123456") safe — those still get cracked. But it makes attacking **many accounts at once so slow** that most become impractical targets, and strong/random passwords stay effectively safe.

---

## 🐌 2. Why Bcrypt Specifically Resists GPUs

Bcrypt's core process (Blowfish's key setup) is **sequential** — step 2 needs step 1's result, step 3 needs step 2's, and so on. No skipping ahead, no doing steps in parallel.

GPUs are amazing at doing **many independent things at once** — but bad at "one strict step-by-step chain." That's exactly bcrypt's design, which is *why* GPUs crush MD5/SHA-256 but barely help against bcrypt (tens of thousands/sec instead of billions/sec).

### Why not argon2 (an even newer algorithm)?
`argon2id` is legitimate and well-regarded today. This course uses **`bcryptjs`** instead for a practical reason:
- Real `bcrypt`/`argon2` need **native compiled bindings** tied to your exact Node/OS version → frequent Docker/CI build failures
- `bcryptjs` is **pure JavaScript** → installs everywhere, zero build headaches
- Trade-off: slightly slower than native — **which is actually fine here**, since "slower password hashing" isn't a downside

---

## ⚖️ 3. The One Rule: Bcrypt Is Only for *Guessable* Secrets

| Secret type | Who created it | Guessable? | Correct hash |
|---|---|---|---|
| **Password** | Human typed it | ✅ Yes (low-entropy) | **bcrypt** (slow, on purpose) |
| **Refresh token** | Server randomly generated it | ❌ No (high-entropy, 256-bit random) | **SHA-256** (fast is fine) |

> **Simple test:** *Did a human pick this, or did the computer randomly generate it?*
> Human-picked → assume guessable → slow hash (bcrypt).
> Computer-generated → nothing to guess → fast hash (SHA-256) — using bcrypt here just adds 250ms of pointless delay to every token refresh, for zero extra security.

Same logic applies to API keys, session tokens, nonces — anything the *system* generates, not the user.

---

## 🛠️ 4. Building `src/shared/password.ts`

### Install
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```
> ⚠️ Never install plain `bcrypt` (no "js") — needs native bindings, breaks in Docker/CI. `bcryptjs` is functionally identical from the outside (same API, same hash format).

### The file
```ts
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

### Key details

- **`BCRYPT_ROUNDS` as a named constant** — searchable, one-line change updates every call. Not a magic number buried inside `bcrypt.hash(plaintext, 12)`.
- **`Promise<string>`** — this function is `async`; you must `await` it to get the actual hash string back.
- **No manual salt** — `bcrypt.hash()` generates a random salt internally and embeds it inside the returned hash string. Never call `genSalt` separately.
- **`bcrypt.compare()`** — extracts the salt from the *stored* hash, recomputes using the same salt + the new plaintext, and compares. Returns `true`/`false`.
- **Named exports only, no default export** — forces consistent import naming (`import { hashPassword, verifyPassword } from ...`), easier to search the whole codebase for usages.

### Why cost = 12?
| Cost | Time per hash | Verdict |
|---|---|---|
| 10 | ~60ms | Too cheap under attack |
| **12** | ~250ms | ✅ Sweet spot — real cost to attackers, invisible to users |
| 14 | ~1 sec+ | Too slow for normal web login UX |

Each `+1` cost **doubles** the work (it's an exponent: cost 12 = 2¹² = 4,096 iterations; cost 16 = 2¹⁶ = 65,536 — that's **16x** more work, not 4x, since 4 steps of doubling = 2×2×2×2).

- **User impact:** pays the cost **once** per login (250ms → barely noticeable)
- **Attacker impact:** pays the same multiplier **per guess, across billions of guesses** — same 16x jump turns 83 hours into ~55 days

> 🔑 **Why old users don't break when you raise the cost factor:** the cost is embedded *inside* the stored hash itself (`$2b$12$...`). `verifyPassword` reads whatever cost the *stored hash* says, not your current constant — so cost-12 and cost-13 hashes can coexist forever, no migration needed.

---

## ⚠️ 5. The 72-Byte Truncation Limit (the subtle gotcha)

Bcrypt has a hard rule: anything past the **first 72 bytes** of input is **silently ignored** — no error, no warning, just quietly cut off.

### The real risk
Two different passwords that share the same first 72 characters are treated as **identical** by bcrypt — the differing tail never gets seen at all.

> **Order of operations matters here:** truncation happens **first** (cuts input to 72 bytes) → *then* salt gets mixed in during hashing. So salt doesn't protect against this — it's applied *after* the truncation already made both inputs identical.

**Concrete case:** Recruiter A and B set the same first-72-characters password with different endings. `verifyPassword(B's_password, A's_hash)` → pulls A's salt, truncates B's password to the same 72 chars, hashes, **matches** → returns `true`. Anything past character 72 provides **zero** security value.

### Two fixes — this course uses Option 1
| Option | How | Used here? |
|---|---|---|
| **1. Validate max length in Zod** | `z.string().max(72)` on the password field (Chapter 20) | ✅ Yes — simple, sufficient |
| 2. Pre-hash with SHA-256 first | Hash → base64 (44 chars) → feed *that* to bcrypt, allows unlimited length | ❌ Not used — added complexity, no real benefit here |

> Caveat: `.max(72)` counts *characters*, not bytes — fine for ASCII passwords, but emoji/non-Latin scripts could still exceed 72 *bytes* while under 72 *characters*. Acceptable trade-off for this project.

---

## 🔌 6. How These Functions Get Used (preview of Chapter 20)

**Register:**
```ts
const hash = await hashPassword(body.password);
await db.query(
  'INSERT INTO users (email, password_hash, role, status) VALUES ($1, $2, $3, $4)',
  [body.email, hash, body.role, 'active'],
);
```

**Login:**
```ts
const valid = await verifyPassword(body.password, user.password_hash);
if (!valid) throw new UnauthorizedError('Invalid credentials');
```

### 🔒 Two security details worth remembering

1. **Generic error message** — always `"Invalid credentials"`, never "wrong password" or "no account found." Distinguishing them would let an attacker figure out which emails are actually registered (**account enumeration**).

2. **Timing side-channel** — if the email doesn't exist, the server can reply instantly (skips `bcrypt.compare` entirely). If the email exists but password is wrong, it takes ~250ms (`bcrypt.compare` runs). An attacker could measure *response time* to tell these apart, even with identical error text. **Fix (Ch 20):** run `verifyPassword` against a dummy hash even when no user is found, so both paths take the same time regardless.

---

## 🧵 7. Does bcrypt Need a Worker Thread?

**Short answer: not necessary at normal scale.**

- `await` only pauses *your function* — it does **not** offload work to another thread automatically
- Bcrypt is **CPU-bound** (heavy computation), not I/O-bound (waiting on network/disk) — so it genuinely occupies Node's single main thread for ~250ms
- This *does* technically block other requests during that window — but for typical traffic (not thousands of registrations/sec), this is negligible
- Worker threads only become worth the added complexity at real scale, where blocking measurably delays other users

---

## ✅ Checklist

- [ ] `src/shared/password.ts` exists — `hashPassword`, `verifyPassword` as **named exports**, no default export
- [ ] `BCRYPT_ROUNDS` defined as a named constant at the top
- [ ] `bcryptjs` in `dependencies`, `@types/bcryptjs` in `devDependencies` — both in `node_modules`
- [ ] `npx tsc --noEmit` → zero errors (confirm the file is inside `tsconfig.json`'s `include` paths)
- [ ] **Hash format smoke test:**
  ```ts
  const hash = await hashPassword('test123');
  console.log(hash);
  // Must start with $2b$12$
  ```
- [ ] **Verify returns correct boolean both ways:**
  ```ts
  await verifyPassword('test123', hash); // true
  await verifyPassword('wrong', hash);   // false
  ```
- [ ] **Timing check:** hash call takes **> 50ms** (typically 150–400ms; under 10ms means the cost factor isn't being applied)

---

## 🎓 One-Line Summary

> *Passwords are guessable, so hash them slowly on purpose (bcrypt) — one real login barely notices, but billions of attacker guesses become impractical. Refresh tokens are unguessable, so hash them fast (SHA-256) instead — slowness there buys nothing. Never let a password exceed 72 characters, or bcrypt silently ignores everything past it.*
