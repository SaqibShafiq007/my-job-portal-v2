normalize:
change exactly in one place and everything works perfectly not more than 2,
denormalize: ooppsoite of this,to read faster

dont over normalized and undernormalize thing

# 📘 Chapter 14 — Normalization vs Denormalization

> **Core idea:** Every fact should live in exactly one place — unless you have a *deliberate, documented* reason to break that rule.

---

## 🧩 1. Normalization (the simple version)

Put every fact in **exactly one place**. Change it once → every join sees the update immediately.

> 🔑 **Rule of thumb:** If updating a fact means changing it in 2+ places, it's not normalized.

| ✅ You gain | ⚠️ You pay |
|---|---|
| No update anomalies | Need `JOIN`s to pull related data |
| Smaller, focused tables | More query complexity at scale |
| Constraints apply cleanly at the source | — |

---

## 🔀 2. Denormalization

Deliberately storing the same fact in **2+ places, on purpose**, to make reads faster.

- **Trade-off:** write-time simplicity + consistency ➜ *for* ➜ read-time speed
- **Risk:** if one copy updates and the other doesn't → silent wrong data, invisible until a query returns the wrong answer
- **Golden rule:** only denormalize *deliberately*, with a documented reason — never by accident

---

## ⚖️ 3. The Two Wrong Extremes

### 🔴 Over-normalized
Every possible attribute gets its own column:
```sql
tech_stack_primary, tech_stack_secondary, tech_stack_tertiary, ...40 more nullable columns
```
**Problems:**
- Breaks 1NF — a list faked as 3 numbered columns (repeating group)
- Most columns sit `NULL` for any given row
- New job type = new schema migration

### 🔴 Under-normalized
Everything dumped into one blob:
```sql
CREATE TABLE jobs (id uuid PRIMARY KEY, data jsonb);
```
**Problems:**
- No constraints possible — `title` could be missing, nothing enforces it
- `company_id` buried in JSON → **no real FK possible**, since Postgres FKs need a typed column

> 🎯 **Takeaway:** The right design isn't "the middle" between these — it's a **per-column decision**.

---

## 🧠 4. The Column-vs-JSONB Rule

> **Filter, sort, gate, or enforce it → real column.**
> **Just displayed, varies by type, read as a whole unit → JSONB.**

| Term | Meaning |
|---|---|
| **Filter** | `WHERE column = value` |
| **Sort** | `ORDER BY column` |
| **Gate** | `CHECK`, FK reference, `NOT NULL` |
| **Enforce** | DB guarantees it's always present/valid |

**Quick test:** Does the database ever need to *look inside* the value?
→ No → JSONB is fine.
→ Yes → needs to be a real column.

---

## 🗂️ 5. Applied to the Real Schema

| Field | Type | Why |
|---|---|---|
| `jobs.attributes` | JSONB | Shape varies wildly per job type; not filtered on *yet*. If "filter by seniority" ships → `seniority` graduates to its own column. |
| `jobs.screening_questions` | JSONB | Always created, read, and used together as one unit — never queried per-question. |
| `applicants.attributes` | JSONB | Same reasoning; skill-filtering possible later via GIN index — that's an *optimization* decision, not a *schema* one. |
| `applications.screening_answers` | JSONB | Read together with questions, never queried per-answer across applications. |
| `applications.profile_snapshot` | JSONB | 🎯 **Intentional denormalization** — see below. |

### 📸 The `profile_snapshot` case (special — read carefully)
Captures the applicant's profile **at the moment they applied**, so recruiters see what was true *then* — even if the applicant edits their profile later.

- `applicants.full_name` and `profile_snapshot.full_name` **diverging is accepted by design**.
- ✅ **Correct behavior:** recruiter sees the profile as it was *when they evaluated the application* — not a live-updating one.
- ❌ **Real bug scenario:** some *other* feature (e.g. "is this applicant still active?") mistakenly reads from the frozen snapshot instead of the live `users`/`applicants` table — showing stale status for something that needed to be live.

> **Lesson:** snapshot data is correct for *"what was true back then"* — wrong for *"what's true right now."* Mixing the two up is where real bugs come from.

---

## 🔄 6. The Migration Path — JSONB Key → Real Column

**Promote a JSONB key to a real column only when it needs:**
- Filtering / sorting / aggregating, **or**
- `NOT NULL` / `CHECK` enforcement, **or**
- To be an FK target

### The 6 safe deployment steps (in order)

| # | Step |
|---|---|
| 1️⃣ | **Dual-write** — deploy code that writes to *both* the JSONB key and the new column |
| 2️⃣ | Add the real column via migration (nullable, no constraint yet) |
| 3️⃣ | **Backfill** old rows: `UPDATE jobs SET seniority = attributes->>'seniority'` |
| 4️⃣ | Add constraint (`NOT NULL` / `CHECK` / index) — now that every row has a value |
| 5️⃣ | Deploy code that reads *only* from the real column, stops writing the JSONB key |
| 6️⃣ | **Drop the JSONB key** in a *later, separate* migration — once confirmed nothing reads it |

> ⚠️ **Most dangerous step to skip: Step 1 (dual-write).**
> Skip it, and old rows only have data in JSONB while new code expects the real column — those rows silently show as `NULL`/missing instead of erroring. Silent bad data is worse than a crash, because nobody notices until it's too late.

---

## 🎓 One-Line Summary

> *Normalize by default. Denormalize on purpose, with a reason written down. Choose column vs JSONB per-field, based on whether the database ever needs to look inside the value — and when a JSONB field starts needing structure, migrate it safely: write both, backfill, constrain, switch, then clean up.*
