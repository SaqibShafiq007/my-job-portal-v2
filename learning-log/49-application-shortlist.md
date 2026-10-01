# The shortlist limit is enforced with a COUNT query before INSERT. This check is not atomic — two concurrent requests from the same applicant could both pass the count check and both insert, briefly exceeding the limit of 100. Describe the full sequence of events that produces this race condition. Then propose a PostgreSQL-level solution that makes the limit truly atomic, without adding a COUNT query.
yes, race condition occurs
1)  we can use trigger that only 1 check and item can insert at one time not 2.
2) we can use lock

# The shortlist query returns jobs that are now closed. Consider two designs: (A) filter out closed jobs at query time so the shortlist only shows open jobs, or (B) return all jobs with their current status. Compare these on: user experience when a previously shortlisted job closes, data integrity (does the shortlist accurately represent the applicant's intent?), and the complexity of the query.
User Experience:
B option is preferable for user ecxperience coz a user can see that this job is closed now

Data Integrity: — "shortlist applicant ki niyat ko sahi represent karti hai kya?"

Shortlist ka poora maqsad: yeh ek record hai applicant ne kya interest dikhaya tha — chahe woh job ab open ho ya nahi, yeh fact nahi badalta ke unhone kisi waqt us job mein interest dikhaya tha.

Design A (filter karna): yeh applicant ki asal niyat/history ko chhupata hai — matlab shortlist ab "current open jobs jo maine pasand ki" ban jati hai, na ke "saari jobs jo maine kabhi pasand ki." Yeh data ko silently modify kar raha hai (from user's perspective), chahe database mein actual row abhi bhi maujood ho.

Design B (sab dikhana): yeh sach ko poora reflect karta hai — shortlist table mein jo bhi row hai, woh dikhti hai, sath mein uska sahi, cu


Query Complexity: B is simple



## QUIZ

# Q1. The UNIQUE(applicant_id, job_id) constraint prevents duplicate shortlist entries at the database level. The service layer also checks for duplicates by catching error code 23505. If you removed the UNIQUE constraint and relied only on an application-layer SELECT ... WHERE applicant_id = $1 AND job_id = $2 check before inserting, what failure mode exists under concurrent load? Show the exact sequence of operations that produces a duplicate row.
race condition occurs
SELECT check sirf application code ke andar chalta hai — Postgres ko koi guarantee nahi deta ke is check aur insert ke darmiyan koi doosri request na aaye. Yeh purely timing pe depend karta hai — normal, low-traffic situation mein shayad kabhi na ho, lekin concurrent requests (bare traffic, ya double-click jaisi cheezein) mein yeh genuinely ho sakta hai.
is liy unique constraints zrrori ha idhr

# Q2. The DELETE endpoint is DELETE /api/applicants/shortlist/:jobId — it identifies the item by jobId, not by the shortlist item's own UUID. A REST purist argues the endpoint should be DELETE /api/applicants/shortlist/:itemId (where itemId is the shortlist row's UUID) for better adherence to REST principles. Compare the two designs on: security (IDOR risk), client ergonomics, and REST semantics. Which would you choose and why?
jobId is simple and easy and prevemts more chels


# Q3. The list query uses ORDER BY si.created_at DESC. An applicant with 100 shortlisted items and no index on shortlist_items(applicant_id, created_at) causes a full table scan of their rows. Propose an index that would make this query efficient. Write the exact CREATE INDEX statement and explain why the column order in the index matters.














































