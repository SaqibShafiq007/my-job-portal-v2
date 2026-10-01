## Log It







# The service rejects the entire request if any job in jobIds is closed or not found. An alternative is to skip closed/missing jobs (like it skips already-applied jobs) and only fail if ALL jobs are invalid. Compare these two designs on: user experience when a job closes between the applicant viewing it and submitting, consistency of the response shape, and the risk of silent data loss (applicant thinks they applied to a closed job but no row was created).

# User Experience:
if a user applied to 3 jobs and during that time 1 job is closed then in this way his request is fail and gets 404 error and he confused and apply again, it is a bad user experience. An alternative design is to skip the job that is closed and appplied to other jobs.

# Response Shape ki consistency:

Current design: do alag response types possible hain:

Sab jobs valid → { created: [...], skipped: [...] } (duplicates skip)
Koi job closed/missing → error response (404), bilkul alag shape

Yeh inconsistent hai — client ko do alag response formats handle karne padte hain, depending on kya masla hua.

Alternative design: hamesha same shape:

json
{ "created": [...], "skipped": [...] }

Chahe kuch jobs duplicate hon, kuch closed hon, kuch dono — sab skipped mein chale jate hain, response shape hamesha consistent rehta hai. Client code simpler ho jata hai, kyunke sirf ek response format handle karna hai.

# Silent Data Loss ka risk:
It is a major cause here becauese he gets error with no reason.Alternative design: user can see properly skipped array.



# The answers for each job are stored in applications.answers (JSONB). A recruiter's screening question asks "Do you have a valid driver's license?" with a boolean answer. The applicant submits {"answer": true}. Six months later, the recruiter changes the question to "Do you have 3+ years of driving experience?" The stored answer now looks like a "yes" to a completely different question. Describe the data integrity problem and propose a schema that makes stored answers self-describing.
we have to save snapshot of every question at that time so "Do you have a valid driver's license? and "do you have 3+ year exxperience are totally different questions."



## QUIZ

# Q1. The getOpenJobs query uses WHERE id = ANY($1::uuid[]) AND status = 'open'. If the applicant submits jobIds: ["job-A", "job-B", "job-C"] and only job-A is open, the query returns one row. The service then lists ["job-B", "job-C"] as closedOrMissing and returns 404. Explain why the service returns 404 instead of skipping closed jobs the same way it skips already-applied jobs. What would the user experience implications be of each approach?

404 shows bcz it is a client side signal . so it is a gd approach to speratee them..


# Q2. ON CONFLICT (job_id, applicant_id) DO NOTHING is used in the INSERT. The service also checks checkExistingApplications before inserting. If the ON CONFLICT clause handles duplicates, why is the pre-check still needed? In what scenario does removing the pre-check (and relying only on ON CONFLICT) produce a worse developer or user experience?
ON CONFLICT (job_id, applicant_id) only avoid to insert but it does not tell why it does not insert.thats why we use checkExistingApplications.





# Q3. The submission accepts answers as Record<jobId, ScreeningAnswer[]>. If the applicant submits a job ID in answers that is not in jobIds, the extra answers are silently ignored. If the applicant submits a job ID in jobIds with no entry in answers, the answers default to []. Are either of these silent behaviours acceptable? Should validation enforce that answers keys exactly match jobIds? Argue both sides.

Do scenarios, simple mein

Scenario A: applicant jobIds: ["A", "B"] bhejta hai, lekin answers mein {"A": [...], "B": [...], "C": [...]} bhi bhej deta hai — "C" extra hai, jobIds mein nahi tha.
→ Current behavior: "C" ki answers silently ignore ho jati hain, kyunke loop sirf jobIds pe chalta hai.

Scenario B: applicant jobIds: ["A", "B"] bhejta hai, lekin answers mein sirf {"A": [...]} bheja — "B" ke liye kuch nahi bheja.
→ Current behavior: "B" ki answers automatically [] ban jati hain (body.answers[jobId] ?? []).

Argument FOR strict validation (yeh dono cheezein reject honi chahiye)

Scenario A ke liye: agar applicant ne job "C" ke liye answers bheji hain, lekin jobIds mein "C" nahi hai — yeh client-side bug ka signal ho sakta hai. Shayad frontend mein koi galti hui, ya applicant ne UI mein kuch aisa kiya jo unexpected hai. Silently ignore karna is bug ko chhupa deta hai — developer ko kabhi pata nahi chalega ke aisa ho raha hai, kyunke koi error nahi aata.

Scenario B ke liye: agar recruiter ne required screening questions banaye hain (jaise "Do you have a valid license?" jiska jawab dena zaroori hai), aur applicant "B" ke liye koi answer nahi bhejta, [] default hona galat ho sakta hai — matlab application create ho jayegi bina required answers ke, jo recruiter ke liye incomplete/useless data hai.

Isliye: strict validation honi chahiye — answers ki keys exactly jobIds se match karni chahiye, warna 400 Bad Request.

Argument AGAINST strict validation (current lenient behavior theek hai)

Scenario A ke liye: agar koi job (jaise "C") koi screening questions rakhta hi nahi (kuch jobs mein sirf apply karna hota hai, koi extra sawal nahi), to applicant/frontend shayad hamesha {} ya empty array bhejta ho har job ke liye, chahe zaroorat ho ya na ho — yeh normal, harmless pattern ho sakta hai, bug nahi. Strict validation isse galti se reject kar degi, jo frontend developer ke liye frustrating hoga.

Scenario B ke liye: agar kisi job ke koi screening questions hi nahi hain, answers: [] bilkul sahi, expected value hai — kyunke wahan jawab dene layak kuch hai hi nahi. Isko "missing/invalid" treat karna galat hoga.

Isliye: lenient behavior sahi hai jab tak "required questions" ka concept khud implement na ho — jab tak har job apne "required screening questions" ki list track na kare, system ko yeh pata hi nahi ke [] valid hai ya incomplete.

Behtareen approach — dono ke beech mein

Asal masla yeh hai ke abhi system ko yeh pata hi nahi ke kaunse screening questions "required" hain aur kaunse optional. Sahi fix:

Job schema mein screening_questions ki list rakho (jaisa jobs.screening_questions column already tumhare paas hai!) — har question mein required: true/false flag ho sakta hai.
Validation us list ke against ho — agar koi required question ka answer missing ho, 400 do. Agar koi extra answers key ho jo jobIds mein nahi hai, ignore karo silently — kyunke yeh genuinely harmless hai (koi nuksaan nahi), bas ek unnecessary field bheja gaya.











