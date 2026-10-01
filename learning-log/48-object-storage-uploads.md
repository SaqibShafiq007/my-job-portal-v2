
# The presigned URL flow means the API server never sees the file bytes. A security engineer asks: "How do you prevent an applicant from uploading a malicious executable disguised as a PDF?" Describe two concrete countermeasures — one that can be implemented without routing file bytes through the API server, and one that requires inspecting bytes. What is the cost of each?

when we are generating presigned url we have already add a restriction pf content type : 'application/pdf' sp .exe never upload .
Cost: ot is just a filteroning, 

2: Every file has a signature like pdf has %pdf, .exe start with MZ.it is confirm that only pdf will upload
Cost : Delay,Extra infrastructure like lambda function


# The confirm step (POST /api/applicants/profile/resume) trusts the client to report the correct filename. A malicious client could send filename: "../../etc/passwd". Why does this particular filename not cause a path traversal vulnerability in the current implementation? Under what circumstances would it become a problem?

Sawal, simple mein

Client POST /api/applicants/profile/resume ko { key, filename } bhejta hai. Sawal poochta hai: agar koi malicious client filename: "../../etc/passwd" bheje (path traversal attack ki koshish — jaise koi server ki secret files tak pahunchne ki koshish kare), kya yeh masla banega?

Yeh masla kyun nahi banta abhi

Dekho createResume function mein filename ka use kahan hota hai:

```ts
export async function createResume(applicantId: string, filename: string, s3Key: string) {
  const result = await db.query(
    `INSERT INTO resumes (applicant_id, filename, s3_key)
     VALUES ($1, $2, $3)
     RETURNING id, applicant_id, filename, s3_key, uploaded_at`,
    [applicantId, filename, s3Key],
  );
  return result.rows[0];
}
```

filename sirf ek database column mein text ke taur pe save ho raha hai — INSERT INTO resumes (..., filename, ...). Yeh kabhi bhi actual file system path ke taur pe use nahi hota, na hi kisi command ko chalane mein use hota, na kisi file ko is naam se open/read karne mein use hota hai.

Real file location hamesha key (jaise resumes/{applicantId}/{uuid}.pdf) se decide hoti hai — jo server khud banata hai (uuidv4() use karke), client ke input pe based nahi hai. filename sirf ek display label hai — jaise "user ne is file ko originally kya naam diya tha, taake baad mein download karte waqt woh naam dikha sakein."

Isliye filename: "../../etc/passwd" bheje jane ka koi asar nahi — yeh sirf ek harmless string ban ke database mein baith jayega, kabhi bhi kisi actual file path ke taur pe interpret nahi hoga.

Kab yeh genuinely masla ban sakta hai

1. Agar kabhi filename ko file system operations mein use kiya jaye — jaise agar koi future feature ho jo filename ko lekar seedha disk pe file save/read kare (jaise fs.writeFile(filename, ...)), tab ../../etc/passwd genuinely khatarnak ban jayega — server ki apni files ko overwrite/read karne ki koshish ho sakti hai.

2. Agar filename ko HTML mein directly render kiya jaye (bina escape kiye) — chahe path traversal na ho, agar filename mein XSS payload ho (jaise <script>...</script>), aur frontend usse seedha dikhaye bina sanitize kiye, woh XSS vulnerability ban sakta hai — yeh alag masla hai (path traversal nahi), lekin isi tarah ka "trust client input blindly" wala issue.

3. Agar filename download hone waqt Content-Disposition header mein use ho — jaise Content-Disposition: attachment; filename="../../etc/passwd" — kuch purane/buggy browsers ya download managers is se confuse ho sakte hain, chahe modern browsers usually safe hote hain aisi cheezon se.



## Quiz

# Q1. The presigned URL has a 300-second expiry. A developer proposes caching the presigned URL so that if the same applicant requests an upload URL twice within 5 minutes, the API returns the cached URL rather than generating a new one. Identify the security and correctness problems with caching presigned upload URLs. Under what conditions (if any) is it safe to reuse a presigned URL?

we have added
```ts
const key = `resumes/${profile.id}/${uuidv4()}.pdf`;
```
heere every time we will get a unique id

2. Race condition — do alag uploads ek hi file ko overwrite kar sakte hain
Socho applicant do alag browser tabs mein resume upload karne ki koshish kare (accidentally, ya double-click ki wajah se). Agar dono ko same cached URL mile:

Tab A: PUT bytes (resume version 1)
Tab B: PUT bytes (resume version 2) → Tab A ki file ko OVERWRITE kar deta hai, same key hone ki wajah se

Yeh data loss ka khatra hai — user ko pata bhi nahi chalega ke unki pehli upload dusri ne overwrite kar di.


# . forcePathStyle: true is set in the S3 client. Explain what virtual-hosted style and path style are, when each is used, and what would break if forcePathStyle were removed while running against MinIO locally. Would removing it break production AWS usage?
















# Q3. The current implementation creates one résumé row per upload, allowing multiple résumés per applicant. Some job portals allow only one active résumé at a time. Describe the schema and API changes needed to enforce a "one active résumé" constraint. Should enforcement happen at the application layer, the database layer, or both?

3 — "Ek waqt mein sirf ek active resume" constraint
Schema changes

Ek naya column add karo resumes table mein:

```sql
ALTER TABLE resumes ADD COLUMN is_active boolean NOT NULL DEFAULT true;
```

Aur ek partial unique index lagao, taake database khud guarantee kare ke ek applicant ke paas sirf ek is_active = true resume ho sake:

```sql
CREATE UNIQUE INDEX idx_one_active_resume_per_applicant
  ON resumes (applicant_id)
  WHERE is_active = true;
```
Yeh index sirf un rows ko count karta hai jahan is_active = true ho — agar koi dusri active resume insert karne ki koshish kare, database khud error de dega.

API changes

confirmResumeUpload function mein, naya resume insert karne se pehle, purani active resume ko false kar do:

```ts
export async function confirmResumeUpload(userId: string, body: { key: string; filename: string }) {
  const profile = await repo.findApplicantByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found');
  if (!body.key.startsWith(`resumes/${profile.id}/`)) {
    throw new ForbiddenError('Key does not belong to this applicant');
  }

  // Purani active resume ko deactivate karo
  await repo.deactivateAllResumes(profile.id);

  // Naya resume active bana ke insert karo
  return repo.createResume(profile.id, body.filename, body.key, true);
}
```
Enforcement kahan honi chahiye — application layer, database layer, ya dono?

Dono honi chahiye — yeh classic pattern hai jo humne pehle bhi dekha (jaise UNIQUE constraint user_id pe applicants table mein):

Application layer (deactivateAllResumes phir createResume) — normal flow ke liye zimmedar, taake user ko sahi, expected behavior mile (purani resume automatically inactive ho jaye, jaisa feature design karta hai).
Database layer (partial unique index) — aakhri safety net hai, race conditions ke khilaf. Socho agar do requests ek saath aayen (jaise do tabs se upload confirm ho raha ho) — application layer ka check race condition mein fail ho sakta hai (dono ne purani resume dekhi "inactive" karne se pehle). Database ka unique index guarantee karta hai ke chahe application logic mein koi race ho jaye, database kabhi bhi do active resumes save nahi karega — woh dusri insert ko reject kar dega.





















