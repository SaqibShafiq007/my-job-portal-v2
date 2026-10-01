## LOg


# The cache is bypassed for any filtered request. A product manager argues that the location=Remote filter is extremely common — possibly as common as the unfiltered view — and should also be cached. Describe how you would extend the caching strategy to support a small set of high-traffic filter combinations. What are the risks of caching too many keys?
```ts
function getCacheKey(query: PublicJobsQuery): string | null {
  const isFirstPage = !query.cursor && query.limit === 20;
  if (!isFirstPage) return null;

  if (!query.q && !query.location) {
    return 'jobs:public:page1';
  }
  if (!query.q && query.location === 'Remote') {
    return 'jobs:public:location:remote:page1';
  }

  return null; // koi aur combination cache nahi hogi
}
```

risks of caching too many keys?:
many of the keys will not use again
memory bloat problem


# The JSON serialised in Redis includes createdAt as an ISO string. When the response is returned from cache, PostgreSQL Date objects are already strings — so the type is consistent. However, if you later add a field that does not serialise cleanly with JSON.stringify (e.g., a BigInt, a Buffer, or a circular reference), the cache write would fail silently or produce incorrect output. Describe a defensive pattern for detecting serialisation failures before they reach production.

Question means:
JSON.stringify zyada tar cheezon ko theek se convert kar sakta hai (numbers, strings, dates already-string-hai-to-fine). Lekin kuch special JavaScript types aise hain jo JSON.stringify theek se handle nahi karta:

BigInt (bohot bare numbers ke liye ek type) — JSON.stringify isse convert karne ki koshish kare to crash/error de deta hai
Buffer (binary data, jaise files) — ajeeb, ghalat output deta hai
Circular reference (jab ek object khud apne andar khud ko refer kare, jaise A → B → A) — JSON.stringify crash ho jata hai

Sawal poochta hai: agar kal ko tum koi naya field add karo (result object mein) jo in problematic types mein se ek ho, to JSON.stringify ya to crash karega, ya ghalat/adhura data save karega — aur tumhe pata bhi nahi chalega jab tak production mein masla na ho jaye. Isko pehle se kaise pakdein, taake production mein surprise na ho?

# Ans
redis.set chalane se pehle, ek "safety check" lagao jo confirm kare ke serialization sahi hui, aur agar nahi hui to error turant pakdo (crash na ho pura app, sirf caching skip ho jaye, aur alert/log ho).



# The cache-aside pattern checks Redis first, then PostgreSQL on a miss. An alternative is the write-through pattern: when a job is published, the service immediately writes the new job board result to Redis rather than waiting for the next cache miss. Compare these two patterns on: implementation complexity, consistency guarantees, and behaviour during Redis downtime.


1. Implementation Complexity

Cache-aside: Simple — tumne jo banaya, ek jagah (getPublicJobs) mein hi logic hai. Baaki kahin (jaise publishJob, closeJob) ko Redis ke baare mein kuch bhi pata nahi, koi extra code nahi.

Write-through: Zyada complex — ab har jagah jahan job ka status badalta hai (publishJob, closeJob, editJob) — wahan bhi Redis-update-karne wala code likhna padega. Matlab multiple jagah pe Redis ka logic phaila hua hoga, aur agar kahin bhool gaye, cache out-of-sync ho jayega.

2. Consistency Guarantees

Cache-aside: Data 60 seconds tak purana (stale) ho sakta hai — jaise humne discuss kiya, TTL khatam hone tak. Guarantee: "zyada se zyada 60 sec purana."

Write-through: Turant fresh — job publish hote hi Redis bhi turant update ho jata hai, koi staleness ka window nahi (agar sahi se implement ho).

3. Redis Downtime ke Dauran Behavior

Cache-aside: Agar Redis down ho jaye, tumhara code redis.get() call kare to fail ho sakta hai — lekin (agar sahi se likha ho, jaise try/catch se) app bas cache skip kar de aur Postgres se seedha data de de. App chalta rehta hai, bas thoda slow.

Write-through: Agar Redis down ho, aur publishJob function Redis ko update karne ki koshish kare, aur woh call fail ho (uncaught error), to poori publish operation fail ho sakti hai — matlab job publish karna khud rukk sakta hai sirf isliye kyunke cache update nahi ho paya. Yeh bara risk hai — ek "nice-to-have" caching feature ki wajah se core functionality (job publish karna) break nahi honi chahiye.

(Is risk ko kam karne ke liye, write-through mein bhi try/catch lagana zaroori hai taake Redis fail ho to bhi main operation (Postgres write) successfully complete ho — lekin phir cache turant purana ho jayega, jo write-through ka poora fayda hi khatam kar deta hai.)




# Q2. The current implementation uses redis.get and redis.set as two separate operations. If two requests arrive simultaneously during a cache miss (before either has written to Redis), both will query PostgreSQL and both will write the result to Redis. Explain why this is usually acceptable (as opposed to a bug), and describe a scenario where it could cause a problem. What Redis primitive would you use to prevent it?

it is not wrong bcz both get correct data althoguh it is wastefull

Kab yeh masla ban sakta hai
High-traffic scenario: agar tumhare paas bohot zyada simultaneous requests hon (jaise 1000 log ek hi second mein site pe aayen, aur cache abhi khali ho — jaise TTL abhi khatam hua ho), to sabhi 1000 requests ek saath Postgres pe hit kar sakti hain — isse ek "thundering herd" problem ban sakta hai, jahan Postgres pe achanak bohot bara load pad jata hai, sirf isliye kyunke cache thodi der ke liye khali thi. Yeh database ko overwhelm kar sakta hai, agar traffic genuinely bara ho.
to prevemt it use lock key





# Q3. config.cacheTtlSeconds defaults to 60 seconds. Without Chapter 45's active invalidation, a job published at second 0 could remain absent from the public board until second 60. Describe the impact of this latency on: the recruiter experience (they just published a job), the applicant experience (they are browsing the board), and search engine crawlers. Then explain how Chapter 45 eliminates this problem.

Sawal, simple mein

Job publish hone ke baad, agar Chapter 45 ka active invalidation (jo hum abhi tak nahi banaya) na ho, to cache 60 seconds tak purana rah sakta hai — matlab naya published job 60 seconds tak public board pe nahi dikhega, chahe woh already database mein open ho chuka ho.

Har group pe iska asar
Recruiter ka experience

Recruiter ne abhi apni job publish ki — woh khush hai, expect karta hai turant public board pe dikhe. Lekin agar woh turant apne hi post kiye hue job ko public page pe check kare, use woh nahi dikhegi (agar cache abhi purana hai) — confusing aur frustrating hoga, jaise "kya mera publish kaam nahi kiya?"

Applicant ka experience

Ali public board browse kar raha hai. Agar woh page ko refresh kare theek us waqt jab koi naya job publish hua, use woh nahi dikhega — kuch der baad (60 sec ke andar) refresh kare to shayad dikh jaye. Yeh chhota sa delay hai, aur zyada tar applicants ko shayad notice bhi na ho — lekin theoretically inconsistent experience hai.

Search engine crawlers

Yeh zyada real masla hai — agar Googlebot theek us 60-second window mein tumhari site crawl kare jab naya job cache mein nahi hai, woh us job ko miss kar dega us crawl cycle mein. Crawlers bohot baar dobara nahi aate turant — agar woh next crawl kuch ghanton/dino baad ho, naya job Google search results mein der se aayega. Job boards ke liye yeh important hai, kyunke SEO/discoverability hi asal traffic ka bara source hota hai.

Chapter 45 isse kaise khatam karta hai

Active invalidation ka matlab: jab bhi koi job publish/close ho, us waqt turant cache ko manually clear/delete kar do — agli request ko cache miss milega, aur Postgres se fresh data mil jayega, chahe TTL abhi khatam na hua ho.

ts
// publishJob function ke andar, status update karne ke baad:
await redis.del('jobs:public:page1');

Isse "wait for TTL to expire" wala delay poori tarah khatam ho jata hai — job publish hote hi, agli request turant naya data dekhegi, chahe cache abhi 60-second window ke andar hi ho.

Ek line mein

Bina invalidation ke, naya job 60 sec tak invisible reh sakta hai (recruiter confusion, applicant ko thodi der delay, aur crawlers job miss kar sakte hain). Chapter 45 ka fix: job publish hote hi turant Redis cache ko delete kar do, taake agli request fresh data le — koi wait nahi karna padta TTL khatam hone ka.


















































































