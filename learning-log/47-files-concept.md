## QUIZ

# 1. A small startup has 500 résumés totalling 100 MB. A developer argues that storing blobs in PostgreSQL is fine at this scale because the operational costs only matter "at scale." Identify the point at which each of the three costs (storage, throughput, operational) would actually become noticeable, given a team of two engineers and a budget of $200/month for database hosting. Is "wait until it's a problem" a reasonable strategy for each cost?

# Cost 1: Storage
it is gd for 100 mb but when startup grows and resume size goes to 5-20 gb then it will cost you. Wait until it's a problem : yeah it is reasonable for this cost bcz when storage cost increases you will get a warning and uh can migrate at that time.
# Cost 2: Throughput
it depends upon user traffic not data. it becomes problem when 10-15 users are downloading resume.$200 means is a small setup so throughput may occurs problem here. Wait until it's a problem : it is problem here coz traffic may come at any time without warning.
# Cost 3: Operational (backups, migrations, replication, restore testing)
2 engineers ki team ke sath, yeh cost sabse jaldi mehsoos hogi — kyunke chhoti team ke paas already kam waqt hai maintenance ke liye.

Kab masla banega: jaise hi database ka backup/restore waqt kaafi lamba ho jaye (jaise minutes se ghanton tak), ya jab tumhe koi migration urgently chalani ho aur woh table lock ho jaye — us waqt tumhe pata chalega. 2-engineer team ke liye, yeh bohot jaldi frustrating ban sakta hai, chahe data size chhota bhi ho, kyunke unke paas dedicated DevOps/DBA nahi hai isse professionally manage karne ke liye.

"Wait until it's a problem" reasonable hai kya? Aadha-aadha (mixed). Backup slow hona ek "nuisance" hai, urgent nahi — is se wait kar sakte ho. Lekin restore testing chhod dena (jaisa doc mein mention hua) genuinely khatarnak hai — agar kabhi real disaster aaye (database crash), tumhe pata hi nahi chalega ke backup kaam karta hai ya nahi, jab tak bohot der ho chuki ho.



# Q2. The presigned URL flow has the client upload directly to S3, bypassing the API server. A security engineer raises a concern: "We can no longer validate the file type or scan for malware before it reaches storage." Describe two approaches to address this concern without routing file bytes through the API server. What are the trade-offs of each?
Approach 1: S3 evemt trigger
make a event trigger in S3 which scans the whole file before doing anything.
traedoff:
security is safe
cost is 0 coz file never touches your api
delay occurs (slow)
extra infrastructure complexity(lambda function)

Approach 1: Restriction on Presigned URL
apply restriction that only allow content type like application/pdf
simple,immediately reject if anything wrong,Yeh sirf file type aur size check karta hai — malware scan nahi karta. Ek .pdf extension wali file jismein actual malware chhupa ho, yeh check nahi pakdega — sirf "yeh cheez PDF jaisi dikhti hai" confirm karta hai, content ko genuinely scan nahi karta.
gd approach is to use both.

# Q3. A team decides to store résumé bytes in a bytea column and serve them via the API: GET /api/resumes/:id reads the blob from PostgreSQL and streams it to the client. Describe the sequence of events for 100 simultaneous résumé downloads. At what point does the PostgreSQL connection pool become the bottleneck? What would you observe in application metrics, and what would the user experience be?

100 simultaneous downloads ka sequence

Socho tumhare paas 20 connections ka pool hai (typical chhoti setup, jaisa humne pehle discuss kiya).

Time 0:00 → 100 requests ek saath aati hain: GET /api/resumes/:id
Time 0:00 → Pehli 20 requests connection le leti hain (pool khali ho gaya)
Time 0:00 → Baaki 80 requests QUEUE mein wait karti hain — koi connection free nahi
Time 0:00-0:8 → In 20 connections mein se har ek, apni resume file (500 KB) client tak
                bhejne mein busy hai — 0.8 second lag raha hai (jaisa pehle discuss kiya)
Time 0:8 → Pehli 20 requests complete hui, connections free hue
Time 0:8 → Agli 20 requests (queue se) connections le leti hain, apna transfer shuru karti hain
Time 1:6 → Agli batch complete...
...

Yeh silsila chalta rehta hai — sirf 20 files ek waqt mein actually serve ho rahi hain, baaki 80 requests intezar kar rahi hain apni baari ka.

Kab connection pool "bottleneck" banta hai

Bottleneck turant ban jata hai, jaise hi simultaneous requests, available connections se zyada ho jayen — yahan 100 requests vs 20 connections, matlab 80% requests foran queue mein chali jati hain, chahe database khud kitna bhi fast kyun na ho. Masla database ki speed nahi hai — masla yeh hai ke connections file transfer ke dauran busy rehti hain, matlab naye requests ke liye kuch bhi free nahi bachta.

Application metrics mein kya dikhega
Connection pool utilization: 100% — sab connections busy dikhenge, lambe waqt tak
Request queue length badhta hua — 80 requests "waiting" state mein dikhengi
Response time (p95/p99) achanak spike — kuch requests turant complete hongi (jo pehli batch mein thin), lekin baaki kai seconds tak wait karengi apni baari ka — average response time misleading hoga, lekin tail latency (sabse slow requests) bohot bara dikhega
Agar koi aur, unrelated query is dauran chale (jaise koi login try kare, ya job list mangwaye) — woh bhi queue mein phas jayegi, kyunke sab connections resume-download mein busy hain — poora app slow lagne lagega, chahe uska resume se koi lena dena na ho
User experience
Pehle 20 users → apni file normal speed se milti hai (~0.8 sec)
Agle users → progressively zyada wait karte hain — kuch users ko file milne mein kai seconds ya zyada lag sakte hain
Agar koi aur (jaise ek recruiter, jo resume download nahi kar raha, sirf login karna chahta hai) is dauran system use kare, unhe bhi slow response ya timeout mil sakta hai — kyunke unki request bhi usi limited connection pool ka intezar kar rahi hai
Worst case: agar queue bohot bara ho jaye, kuch requests timeout ho sakti hain poori tarah — user ko error milega, "site down" jaisa lagega, chahe database khud bilkul theek chal raha ho
Ek line mein

100 simultaneous downloads, 20-connection pool ke sath, turant bottleneck ban jate hain — sirf 20 files ek waqt serve hoti hain, baaki 80 queue mein wait karti hain, jisse response time badh jata hai aur (sabse bara masla) poora application slow ho jata hai — chahe unrelated features (login, job list) ka resume se koi lena dena na ho, kyunke sab ek hi shared, limited connection pool use kar rahe hain.









































