## Log It



# The snapshot captures resumeKey — the S3 key of the most recently uploaded résumé at submission time. If the applicant deletes their résumé from S3 after applying (or if the file is deleted by a lifecycle rule), the resumeKey in the snapshot points to a non-existent object. Describe two strategies for handling "dangling" résumé keys in snapshots. What is the trade-off between each approach in terms of data integrity and complexity?
Strategy 1: idea is that whenever a recruiter wanna vies/download the resume , then chk from s3 that if resume is exist or not. if not then drop a simple msg on ui "Resume no longer available."
Data integrity : best. snapshot always remain in its original state .it frozen permanently,
complexity: almost 0. we just add a check if file exist or not.

Strategy 2 — Proactively track/update snapshot jab resume delete ho

Idea yeh hai ke jab bhi koi resume delete ho (chahe applicant khud kare, ya lifecycle rule automatically kare), tab system active taur pe un tamam snapshots ko dhoondhe jin mein woh resumeKey reference hai, aur unko update kare — mesalan resumeKey: null set kar do ya ek resumeDeleted: true flag add kar do.

data integrity : no longer cause snapshot means resume becomes completely frozen not a single change. 
Complexity: too much.


# The snapshot is built from a separate query to applicants and resumes. Between the snapshot query and the application INSERT, another request could update the applicant's profile (a concurrent PATCH request). Describe what the snapshot would contain in that race condition. Is this a correctness problem? Propose a database-level approach that eliminates the race.


Race condition mein kya hoga:
buildApplicantSnapshot sirf ek simple SELECT chalata hai, koi lock nahi leta. Agar isi darmiyan koi PATCH /profile request commit ho jaye, to snapshot mein purana data save ho jayega — kyunke snapshot pehle hi JS variable mein read ho chuka hoga, INSERT sirf wahi purani value likhega.

Kya yeh correctness problem hai?
Haan. Kyunke:

Kis request ne "pehle" chalna tha, iski koi guarantee nahi
Read aur Insert do alag steps hain, darmiyan mein koi protection nahi
Snapshot ka pura maqsad hi "frozen, exact moment ka data" hona tha — agar timing fuzzy ho to yeh guarantee tootti hai

Database-level solution: SELECT ... FOR UPDATE + Transaction

```sql
BEGIN;

SELECT full_name, headline, location, attributes
FROM applicants WHERE id = $1
FOR UPDATE;

INSERT INTO applications (...) VALUES (...);

COMMIT;
```

FOR UPDATE applicant ki row ko lock kar deta hai — jab tak yeh transaction commit na ho, koi concurrent PATCH usi row ko update nahi kar sakta (wo wait karegi). Is se ordering guaranteed ho jati hai — koi ambiguous "beech wali" state nahi bachti.



## Quiz


# Q1. The snapshot JSONB column is written once at application creation and never updated by profile edits. However, a developer modifies the application to update the snapshot when the applicant withdraws the application (status = 'withdrawn'). What is wrong with this? What invariant does it violate, and what could a recruiter observe that they should not be able to?
 What is wrong with this : snapsjhot means data is frozen, immutable so data cant chng.
 Konsa invariant violate hota hai: snapshot alwas shows that data which he sunbmit during apply.
Recruiter kya cheez dekh sakta hai jo usko nahi dekhni chahiye:
Agar withdraw ke waqt snapshot ko applicant ki current profile se overwrite kiya jaye, to recruiter ko woh data dikh sakta hai jo applicant ne asal mein apply karte waqt submit nahi kiya tha — mesalan applicant ne baad mein apna headline, bio, ya resume change kar diya ho, aur woh naya data ab purani application ke snapshot mein aa jaye. Yeh audit trail ko corrupt kar deta hai — ab yeh pata nahi chal sakta ke applicant ne asal mein apply karte waqt kya profile dikhaya tha.



# Q2. The snapshot shape is { headline, bio, skills, resumeKey }. A new field location is added to the applicants table and included in all future snapshots. Old application rows have snapshots without location. Describe how both the API response code and any downstream analytics queries should handle missing fields in old snapshots. What is the alternative to graceful handling, and why is it worse?
API response code kaise handle kare:
Missing location field ko optional/nullable treat karo — jaise snapshot.location ?? null ya frontend pe location: snapshot.location || "Not specified". Purani applications ke response mein bas yeh field khali/null dikhega, error nahi aayega.

Analytics queries kaise handle karein:
JSONB queries mein ->>'location' use karne se agar field exist nahi karti to automatically NULL return hota hai (Postgres error nahi deta) — is liye aggregations mein COALESCE(snapshot->>'location', 'unknown') jaisa istemal karo, taake purani rows NULL/unknown bucket mein chali jayein, crash na ho.

Alternative (graceful handling na karna) — kya hoga aur kyun bura hai:
Alternative yeh hoga ke purani saari application rows ko backfill/migrate kiya jaye — yani ek script chalao jo har purani row ke snapshot mein location: null (ya kuch guess kiya hua data) forcefully insert kare.

Yeh bura hai kyunke:

Yeh immutability invariant tor deta hai (jaisa Q1 mein discuss kiya) — purane snapshots ko modify karna matlab audit trail corrupt karna
Agar guess kiya hua data insert karo (jaise applicant ki current location), to yeh jhoota record ban jata hai — recruiter ko lagega ke applicant ne yeh data apply ke waqt diya tha, jabke usne nahi diya
Simple null-check se kaam chal sakta hai, is liye backfill karna unnecessary risk aur complexity dono add karta hai



# Q3. A recruiter reads an application submitted 6 months ago and sees the snapshot headline "Senior Go Engineer". The applicant's current profile says "Junior React Developer". The recruiter contacts the applicant for a Go role based on the snapshot. Argue both for and against the snapshot approach in this scenario. Is there a design that gives the recruiter both the snapshot (what they saw when they evaluated the applicant) and the current profile?















































