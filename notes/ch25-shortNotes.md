# Chapter 25 — Authentication vs Authorization (Short Notes)

## Authentication

- Answers: **"Who are you?"**
- Done by `authMiddleware`.
- Checks:
  - Authorization header
  - JWT signature
  - Token expiry
  - Token tampering
- If valid:

```js
req.user = { userId, role }
```

- If invalid:
  - Throws **401 Unauthorized**
  - Request stops.

## Authorization

- Answers: **"Are you allowed to do this?"**
- Done by `requireRole(...)`.
- Reads:

```js
req.user.role
```

- If role matches → request continues.
- If role doesn't match → **403 Forbidden**.

## Order of Middleware

```
Request
   ↓
authMiddleware
   ↓
requireRole(...)
   ↓
Handler
```

Authentication must happen first because the server must know **who** the user is before checking **permissions**.

## 401 vs 403

### 401 Unauthorized

**Meaning:**
- Server doesn't know who you are.

**Causes:**
- Missing token
- Expired token
- Fake/tampered token

**Client should:**
- Redirect to login
- Refresh token or ask user to authenticate again

### 403 Forbidden

**Meaning:**
- Server knows who you are
- But you don't have permission

**Client should:**
- Show "You do not have permission."
- Do NOT redirect to login

### Responsibility

- `authMiddleware` → 401
- `requireRole` → 403

## Example

Applicant token:

```js
{
  userId: 15,
  role: "applicant"
}
```

Route:

```js
authMiddleware
requireRole("admin")
```

**Flow:**
- Token valid ✅
- Role = applicant ❌ admin
- Response = **403 Forbidden**

## RBAC (Role-Based Access Control)

Permissions are assigned to **roles**, not individual users.

**Roles:**
- **Admin** → Manage platform, users, moderation
- **Recruiter** → Create/manage jobs, review applications
- **Applicant** → Browse jobs, apply, manage profile

**Examples:**

```js
requireRole("admin")
```
Only admin.

```js
requireRole("recruiter", "admin")
```
Recruiter or admin.

### Advantages of RBAC

- Easy to manage permissions.
- Changing a role's permissions affects all users with that role.
- No need to update each user individually.

### Limitation of RBAC

RBAC answers:
> "Does this role have permission?"

It does **not** answer:
> "Does this user own this resource?"

## Ownership Check

Needed to verify the authenticated user owns the resource.

**Example:**

```js
application.userId === req.user.userId
```

or

```sql
WHERE userId = req.user.userId
```

## IDOR (Insecure Direct Object Reference)

Occurs when a user can access another user's resource simply by changing an ID (e.g., `/jobs/42` → `/jobs/43`) because ownership isn't checked.

**Prevent by:**
- Performing ownership checks.
- Filtering data using `req.user.userId`.

## JWT Limitation

JWT only contains information from when it was issued.

If a user is suspended after receiving a valid token:
- `authMiddleware` still passes.
- `requireRole()` still passes.
- User may still access routes until the token expires.

**Solutions:**
- Check user status in the database.
- Use short-lived access tokens.
- Support token revocation/blacklisting.

## Types of Routes

### Public Route

No middleware.

```
Request → Handler
```

### Any Authenticated User

```
Request → authMiddleware → Handler
```

### Specific Roles Only

```
Request → authMiddleware → requireRole(...) → Handler
```

## Key Points to Remember

- Authentication = Who are you?
- Authorization = Are you allowed?
- 401 = Not authenticated
- 403 = Authenticated but not authorized
- Authentication always comes before authorization.
- RBAC checks roles, not ownership.
- Ownership checks are required to prevent IDOR.
- JWTs do not automatically reflect changes (e.g., suspended users) after they are issued.
