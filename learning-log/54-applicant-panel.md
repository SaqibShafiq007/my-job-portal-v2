# The résumé upload requires three HTTP requests from the browser: get presigned URL, PUT to S3, confirm to API. If the user closes the browser after step 2 (PUT to S3) but before step 3 (confirm), the file exists in S3 but the resumes table has no record of it. From the applicant's perspective, the upload appears to have been interrupted. Describe the user experience implications and two strategies for handling this orphaned file state.

means the file is uploaded to S3 but not db.from frontend side user comes back and see file is not uploaded then he will upload it again and in S3 there are 2 same files . 1 become orphan(first one) and 2nd becomes successfully reached db. it is a storage cost.
to handle this we have 2 strategy:
1. S3 mein saari files list kare "resumes/" prefix ke andar
Database mein check kare — kya har file ka koi matching row hai `resumes` table mein?
Agar koi file X hours purani ho aur database mein koi row na ho — usse delete kar do

2.  Idempotent retry (frontend behavior fix)
Frontend ko smart retry karwao — agar user page reload kare aur unki profile mein resume missing ho, unhe dobara upload karne do, lekin backend ko design karo taake purani (orphaned) file automatically overwrite/ignore ho jaye jab naya successful upload ho.



# The Apply button on /jobs/[id] submits answers: {} — no screening answers. Some jobs have required screening questions stored in jobs.screening_questions. Describe the changes needed to the job detail page to fetch and render screening questions, collect the applicant's answers, and include them in the apply request. What validation (client-side and server-side) is needed?


Abhi tumhara Apply button sirf yeh bhejta hai:

```ts
body: JSON.stringify({ jobIds: [jobId], answers: {} })
```

Koi screening answers collect nahi hote — chahe job mein screening_questions hon.

Job detail page mein changes chahiye
1. Job detail fetch karo (abhi sirf Job {jobId} dikha rahe ho, actual job data nahi)

Pehle, job ki poori detail fetch karo (title, description, aur screening_questions) — Chapter 39 ka getPublicJobById already yeh sab deta hai (remember, screeningQuestions field return hota hai us function se):

```tsx
const job = await apiFetch(`/api/public/jobs/${jobId}`).then(r => r.json());
```

// job.screeningQuestions ab available hai
2. Screening questions render karo — form fields

Har question ke liye ek input field banao (question ke type ke hisaab se — text, boolean, waghera):

```tsx
{job.screeningQuestions.map((q) => (
  <div key={q.questionId}>
    <label>{q.text}</label>
    <input onChange={(e) => updateAnswer(q.questionId, e.target.value)} />
  </div>
))}
```
3. Applicant ke answers collect karo (state mein)
```tsx
const [answers, setAnswers] = useState<Record<string, string>>({});

function updateAnswer(questionId: string, value: string) {
  setAnswers((prev) => ({ ...prev, [questionId]: value }));
}
```
4. Apply request mein include karo
```ts
const formattedAnswers = job.screeningQuestions.map((q) => ({
  questionId: q.questionId,
  answer: answers[q.questionId] ?? '',
}));

body: JSON.stringify({
  jobIds: [jobId],
  answers: { [jobId]: formattedAnswers },
})

```

Validation — client-side
Required questions check karo submit se pehle — agar koi required question ka answer khali ho, submit rokdo, error message dikhao ("Please answer all required questions").
Yeh sirf UX ke liye hai — client-side validation kabhi bhi security ke liye kaafi nahi hoti, kyunke koi bhi browser dev tools se ise bypass kar sakta hai, ya seedha API ko curl se hit kar sakta hai.
Validation — server-side (yeh asli, zaroori hissa hai)

Abhi tumhara backend applyToJobs bilkul kuch check nahi karta answers ke content ke baare mein — sirf body.answers[jobId] ?? [] le leta hai, jo bhi ho, chahe empty ho.

Zaroori server-side checks:

Har required: true question ka answer maujood ho — agar job ke screening_questions mein koi question required hai, aur applicant ne uska answer nahi bheja, 400 Bad Request do.
Answer format sahi ho — agar question type: 'boolean' hai, answer true/false hona chahiye, koi random string nahi.
questionId sahi ho — jo questionId applicant ne bheja, woh us job ke screening_questions mein genuinely exist karta ho (warna koi random/fake questionId bhej sakta hai).


## Quiz


# Q1. The /dashboard/applications page is a Server Component that calls GET /api/applicants/applications using apiFetch. A developer converts it to a Client Component with useEffect to enable real-time updates. What are the security implications of reading the auth token in a Client Component? What mechanism does Next.js provide to update server-rendered data without converting to a Client Component?

Security implications — token ko Client Component mein read karna

Yaad karo poora point tha httpOnly cookies ka (Chapter 38 se): access token browser JavaScript se kabhi bhi read nahi ho sakta, XSS attacks se bachane ke liye.

Server Component mein: apiFetch server pe chalta hai, cookies() se token seedha padh leta hai — browser JavaScript kabhi is token ko touch nahi karta. Yehi safe pattern hai jo tumne poore Chapter 38-54 mein use kiya.

Agar Client Component banaya jaye (useEffect ke sath): ab yeh code browser mein chalega, na ke server pe. Client-side code httpOnly cookies ko directly read nahi kar sakta (yeh unka poora point hai) — isliye developer ko majboorn koi aur tareeqa dhundhna padega:

Ya to token ko document.cookie se readable banana (matlab httpOnly: false karna) — jo XSS ka poora khatra wapas khol deta hai jo humne Chapter 38 mein specifically bachaya tha
Ya har request apne khud ke Next.js proxy route ke through bhejni padegi (jaise humne apply, shortlist ke liye kiya) — jo abhi bhi kaam karta hai, lekin extra complexity hai

Agar developer galti se httpOnly: false kar de taake client-side JS token access kar sake — yeh security regression hai. Ab agar kabhi bhi tumhari site pe XSS vulnerability aa jaye (jaise koi malicious script kahin inject ho jaye), attacker seedha token chura sakta hai document.cookie se — bilkul wahi attack jo humne Chapter 38 mein httpOnly cookies se rokne ki koshish ki thi.

Next.js ka solution — bina Client Component banaye real-time updates

Next.js do mechanisms deta hai:

1. Revalidation (revalidatePath ya router.refresh()) — Server Component wahi rehta hai (secure, token server-side hi reh jata hai), lekin tum manually ya periodically page ko re-fetch/re-render karwa sakte ho:

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 5000); // har 5 sec
    return () => clearInterval(interval);
  }, [router]);
  return null;
}
```

Yeh chhota sa Client Component sirf "refresh trigger" karta hai — koi token ya sensitive data client mein nahi aata. Actual data fetching hamesha Server Component mein reh jati hai, jo dobara render hoti hai jab router.refresh() call hoti hai.

2. Polling via Server Actions ya route handlers — agar tumhe genuinely live updates chahiye (jaise WebSocket jaisa feel), tum ek route handler bana sakte ho jo server-side data fetch kare (token wahi rehta hai), aur client sirf us route ko periodically poll kare — bina apna khud ka token kabhi handle kiye.



# Q2. The presigned PUT URL targets MinIO at http://localhost:9000 in development. A developer deploys to production and forgets to update the S3_ENDPOINT config value. Describe the exact failure mode: what URL does the presigned URL contain, what happens when the browser attempts to PUT to that URL, and how would you detect this misconfiguration before it reaches production?

Presigned URL mein kya hoga

Agar deploy karte waqt .env mein S3_ENDPOINT=http://localhost:9000 hi reh jaye (galti se update nahi hua), to storage.ts ka S3Client abhi bhi localhost:9000 ki taraf pointed rahega:

ts
const s3 = new S3Client({ endpoint: config.S3_ENDPOINT, ... }); // still localhost!

Jab getPresignedUploadUrl() chalega, woh ek URL banayega jaisa:

http://localhost:9000/job-portal/resumes/.../file.pdf?X-Amz-Signature=...
Browser jab is URL pe PUT try kare — kya hoga

Browser (jo ab kisi real user ke computer pe chal raha hai, na ke tumhare dev machine pe) yeh URL khol ke localhost:9000 se connect karne ki koshish karega. Lekin localhost hamesha us cheez ko refer karta hai jahan browser khud chal raha hai — matlab har user ka apna khud ka localhost:9000 (jo unke computer pe kuch bhi na ho, ya kuch aur ho).

Result: ERR_CONNECTION_REFUSED ya similar network error — file kabhi upload hi nahi hogi, kyunke wahan koi server hi maujood nahi hai us URL pe (unless galti se user ke apne machine pe koi cheez port 9000 pe chal rahi ho, jo bhi kaam nahi karega, kyunke woh MinIO nahi hoga).

Isko production tak pahunchne se pehle kaise pakden
Environment-specific config validation — deploy pipeline mein ek automated check add karo jo confirm kare S3_ENDPOINT kabhi bhi localhost na ho jab NODE_ENV=production:
```ts
if (config.NODE_ENV === 'production' && config.S3_ENDPOINT.includes('localhost')) {
  throw new Error('S3_ENDPOINT cannot be localhost in production!');
}
```
Smoke test after deploy — deployment ke baad ek automated test chalao jo genuinely ek presigned URL generate kare aur uska hostname check kare (matches expected production domain).
Staging environment — production jaisa hi ek staging environment rakho jo real (non-localhost) S3/MinIO use kare, taake yeh masla staging pe hi pakda jaye, production users ko affect karne se pehle.





# Q3. The stage badge mapping (STAGE_COLOURS) is hard-coded in the frontend. If a new stage is added to the backend CHECK constraint (e.g., 'background_check'), the frontend badge shows no colour for that stage. Compare two approaches: (A) hard-code the stage-to-colour mapping in the frontend and update it with each new stage, and (B) return stage metadata (including display colour) from the API. Evaluate each on: coupling between frontend and backend, deployment coordination, and the risk of a mismatch.

Approach A — Hard-coded mapping (jo tumne banaya)
ts
const STAGE_COLOURS = { applied: 'bg-gray-200', ... };

Coupling: bohot high — frontend ko exactly pata hona chahiye kaunse stages exist karte hain, jo backend ke CHECK constraint se match karna chahiye. Yeh do jagah duplicate information hai.

Deployment coordination: agar backend mein naya stage add ho (background_check), frontend ko bhi alag se update aur deploy karna padega — dono ek dusre se independently deploy nahi ho sakte bina masla create kiye.

Mismatch ka risk: agar backend deploy ho jaye lekin frontend na ho (ya vice versa), naya stage koi color nahi dikhayega — jaisa sawal mein bataya gaya. Yeh silent, visual bug hai — koi crash nahi, bas ganda dikhega.

Approach B — API se stage metadata bhejo

Backend response mein color bhi shamil karo:

```json
{ "stage": "background_check", "stageLabel": "Background Check", "stageColor": "bg-purple-200" }
```
Coupling: kam — frontend ko kuch bhi pehle se pata hone ki zaroorat nahi stages ke baare mein, woh sirf jo bhi API bheje woh render karta hai.

Deployment coordination: backend akela naya stage add kar sakta hai, sath color bhi bhej sakta hai — frontend ko kuch bhi update/deploy karne ki zaroorat nahi. Genuinely independent deployments.

Mismatch ka risk: bohot kam — kyunke color hamesha API se aata hai, frontend kabhi "out of sync" nahi ho sakta us data ke sath.









