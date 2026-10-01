# The applicants table uses a UNIQUE constraint on user_id rather than making user_id the primary key. Explain why. What would be different if user_id were the primary key of applicants? Consider foreign key references from other tables (resumes, applications, shortlist_items).
it is gd that applicant id is seperate from user id. in future if uh have to login without user id then uh can .. due to applicant id


# A recruiter hits GET /api/applicants/profile and receives a 403. A well-meaning developer suggests removing the requireRole guard and instead returning only the requesting user's own profile. Why is the role guard still necessary even if the query is always scoped to req.user.userId?

it is gd for safety bcz recruiter dont need to use this feature
ole guard sirf "kis ka data dikh raha hai" control nahi karta — yeh define karta hai ke kaunse features kis role ke liye maujood hain.


# QUIZ


# Q1. The PATCH /api/applicants/profile implementation builds the SQL SET clause dynamically based on which fields are present in the request body. An alternative is to always UPDATE all three columns — headline, bio, and skills — using the current values from the database for any fields the client did not send. Compare these two approaches on: number of database round-trips, correctness in concurrent update scenarios (two clients patching different fields simultaneously), and implementation complexity.
it is slow
race condition may occur in approach 2.


# Q2. Skills are stored as a JSONB array of strings. A developer proposes adding a GIN index on the skills column so that queries like WHERE skills @> '["Python"]' are fast. Describe the exact index definition needed, when this index would actually be used by PostgreSQL's query planner, and a case where the index would NOT help.

GIN index @> (containment) queries ke liye perfect hai — "yeh value array mein kahin hai kya" — lekin case-insensitive search, positional access, exclusion queries, ya bohot chhoti tables ke liye yeh madad nahi karta, kyunke woh queries GIN ke basic "yeh value exist karti hai" concept se match hi nahi karte.



# Q3. The POST /api/applicants/profile endpoint returns 409 if a profile already exists. Some APIs use PUT /api/applicants/profile to mean "create or replace." Describe the semantic difference between POST (create), PUT (replace), and PATCH (partial update) as defined by HTTP. Under what circumstances would PUT be the correct verb for the profile endpoint, and what changes to the implementation would that require?




changes to the implementation would that require?

Teen HTTP methods, simple mein
POST = "naya banao." Agar dobara wahi request bhejo, ek aur naya resource ban jata hai (ya, jaisa tumne banaya, agar unique constraint ho to error de deta hai). Not idempotent — matlab baar baar chalane se result badalta hai.

PUT = "poori cheez replace karo (ya agar exist nahi karti, bana do)." Client poora naya object bhejta hai, aur server us URL pe jo bhi hai use poori tarah replace kar deta hai. Idempotent — matlab tum yeh request 1 baar chalao ya 10 baar, result hamesha same hoga (final state same rahegi).

PATCH = "sirf kuch fields update karo (partial update)." Client sirf jo fields badalni hain woh bhejta hai, baaki cheez waisi hi rehti hai. Yehi tumne banaya hai (updateApplicantProfile).

Tumhare current design mein kya hai
Abhi POST /api/applicants/profile:

Pehli baar → profile banata hai (201)
Dobara chalao → 409 Conflict (kyunke POST "create-only" hai tumhare design mein)
Yeh sahi POST semantics hai — POST inherently "create new" ka matlab rakhta hai, aur duplicate creation ko reject karna sahi hai.

PUT kab sahi hota — profile endpoint ke liye
PUT sahi hota agar tum chahte "create-or-replace" behavior — matlab:

PUT /api/applicants/profile
{full_name: "...", headline: "...", location: "...", attributes: {...}}
Agar profile exist nahi karti → naya bana do
Agar profile exist karti hai → poori tarah replace kar do naye data se (jo fields nahi bheji unhe null/empty kar do, PATCH ki tarah "unchanged nahi chhodo")
Real-world use case: agar client (jaise frontend) hamesha poora profile object bhejta ho (kabhi partial nahi), aur tum chahte ho ke agar koi field client ne nahi bheji, woh clear ho jaye (na ke purani value reh jaye) — tab PUT zyada sahi semantics hai PATCH se.

Implementation mein kya badalna padega
Route naam badalna: router.post('/profile', ...) → router.put('/profile', ...)
Duplicate-check logic hataani padegi: ab 409 throw nahi karenge agar profile exist kare — balke agar exist kare to update karo (poori tarah), agar exist na kare to create karo:
```ts
export async function replaceProfile(userId: string, body: {...}) {
  const existing = await repo.findApplicantByUserId(userId);
  if (existing) {
    // Poori tarah replace — saari fields set karo, chahe kuch bheji na gayi ho
    return repo.updateApplicantProfile(existing.id, {
      full_name: body.full_name,
      headline: body.headline ?? null,   // agar nahi bheji, null kar do
      location: body.location ?? null,
      attributes: body.attributes ?? {},
    });
  }
  return repo.createApplicantProfile(userId, body.full_name, body.headline, body.location, body.attributes);
}

```

updateApplicantProfile's dynamic SET clause ka istemal khatam ho jayega — kyunke PUT mein saare fields hamesha bhejni chahiye/set honi chahiye, "partial" wala concept khatam ho jata hai.

























