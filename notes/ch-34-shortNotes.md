# 📩 Chapter 34 — Accepting an Invitation

> **Short notes, plain language, real questions answered.**

---

## 🎯 Why This Chapter Exists

Chapter 33 let an owner **send** an invite. But clicking the link did nothing —

```
Cannot GET /auth/accept-invitation
```

...because that route didn't exist yet. **This chapter builds the missing piece:**

```
POST /auth/accept-invitation
```

---

## 🧭 What It Does — In Plain Words

When someone clicks their invite link and submits their token, the server has to figure out four things, in order:

1. ✅ Is this token real and not expired?
2. ✅ Does the email match who was actually invited?
3. ✅ Is this a brand-new person, or someone who already has an account?
4. ✅ Add them to the company, delete the used invite, and log them in immediately.

---

## 🔀 The Two Cases

| | **Case A — New Person** | **Case B — Existing Person** |
|---|---|---|
| **Account status** | No account yet | Already has an account |
| **What they send** | Email + password | Email only (password ignored) |
| **What happens** | Fresh account created, already `active` — no OTP needed | Existing account is linked to the new company |
| **Why no OTP?** | The invite email itself already proves they own that address | N/A — they already verified when they first registered |

**Either way →** they're logged in immediately with:
```json
{ "accessToken": "...", "refreshToken": "..." }
```

---

## 🛡️ Key Design Decisions — and Why

### 🔓 No login required for this route
Makes sense — the person isn't logged in yet! **The token itself, from the email, is their proof of identity.**

### ✉️ Email must match the invite's email
Without this check, someone who got hold of a link meant for a different email could swap in their own email and hijack a company membership that was never theirs.

### 🤐 Same error message for every failure
```
"Invalid or expired invitation token."
```
Whether the token is fake, expired, or the email doesn't match — **the message never changes.** This is deliberate:
- Different messages would leak info an attacker could use to narrow down guesses.
- A confused *real* user only loses a little — they just ask for a new invite.

### 🔒 Unique constraint on `(user_id, company_id)`
Protects against a rare crash scenario: if the server crashes *between* "add them to the company" and "delete the invite," the same link could be clicked again.
- **Without the constraint:** could create duplicate membership rows.
- **With it:** a second attempt safely fails with `409 Conflict` instead of corrupting data.

---

## ❓ My Question: Why Does Hashing the Token Matter?

The raw token (sent in the email) gets **hashed** before it's stored or compared.

> Hashing only works **one direction** — you can turn the raw token into a hash, but you can never turn the hash back into the raw token.

This means even if someone stole the entire database, they'd only see useless scrambled hashes — never the real, usable secret.

**"What if we just had the client send the hash directly instead?"**
Then the email would have to contain the hash itself. But that would make the hash *itself* the real secret — defeating the whole purpose. Stealing the database would then be enough to break in, since the "safe stored value" and the "real secret" would become the exact same thing.

---

## ❓ My Question: Can an Attacker "Steal" an Account This Way?

**Scenario:** an attacker somehow gets a real invite link meant for `bob@company.com` and uses it to create an account.

**What they actually get:**
- ✅ Control of a fake account *labeled* with Bob's email
- ❌ **Zero access** to Bob's real email inbox

> Any future password-reset or notification email still goes to Bob's **actual mailbox** — which the attacker never had access to.

**Analogy:** logging into a fake account doesn't reroute anyone's real mail — it's like writing "Bob's House" on a mailbox in your own backyard. Real mail addressed to Bob still goes to Bob's actual house.

**And realistically:** to even get the link, the attacker would need access to either:
- Bob's real inbox *(in which case, they already control his email — no trick needed)*, or
- Your company's private server logs *(a much bigger, separate security problem)*

So this attack isn't practically possible under normal conditions. ✅

---

## ✅ Testing Checklist — What We Verified

| Check | Result |
|---|---|
| TypeScript compiles clean | ✅ |
| Owner sends invitation | ✅ |
| New user accepts invite (Case A) → `200` with tokens | ✅ |
| Invitation row deleted after acceptance | ✅ |
| Recruiter row created with correct role + company | ✅ |
| Unique constraint on `(user_id, company_id)` confirmed in database | ✅ |

---

## 🧠 Key Points to Remember

- 🔀 One endpoint, two cases — new user vs existing user, decided by checking if the email already has an account.
- 🎫 The invite token **proves identity** — no login needed for this route.
- ✉️ Email must match the invite exactly, or it's rejected.
- 🤐 Every failure gives the **same generic error message** — protects against information leakage.
- 🔒 A unique constraint on `(user_id, company_id)` prevents duplicate memberships if something crashes mid-request.
- 🔐 Hashing the token only works **one-way** — that's the whole point. Never let the "safe stored value" become the same thing as the "real secret."
