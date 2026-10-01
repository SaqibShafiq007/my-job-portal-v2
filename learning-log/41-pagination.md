## LOG


# A product manager requests a "total results" count alongside each page — for example, "Showing 20 of 347 jobs". Explain why this is expensive to add with cursor pagination. Describe two implementation strategies: one that provides an exact count and one that provides an approximate count. What are the performance and UX trade-offs of each?
coz cursor pagination go through all jobs to find exact job thats why it is slow here it is not gd for count(*)
exact count is slow but appropriate
approximate is fast but in appropriate



# Cursor pagination gives the client an opaque token that cannot be shared as a human-readable URL. A developer proposes encoding page number in the cursor ("page=3") so that the URL ?cursor=cGFnZT0z still corresponds to "page 3" even after decoding. Evaluate whether this is still cursor pagination or offset pagination with extra steps. What is lost by this approach?
cursor point to row num not exact pg thats why it is offset pagination.
here duplication/skips items ot.ccurs and consistensy los



## Quiz


# Q1. A job board uses offset pagination: LIMIT 20 OFFSET (page - 1) * 20. A new batch of 5 jobs is published between a user requesting page 1 and page 2. Trace exactly which rows the user sees on each page and identify which jobs are duplicated or skipped. Then explain why the same scenario with cursor pagination produces neither duplicates nor skips.

Sorting: newest first (created_at DESC). Before the new batch, imagine 25 jobs, labeled by position (1 = newest):

Position: 1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25
Job:      A  B  C  D  E  F  G  H  I  J  K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y
Page 1 request — LIMIT 20 OFFSET 0

User gets jobs at positions 1–20:

A B C D E F G H I J K L M N O P Q R S T
Now: 5 new jobs get published

New jobs (call them N1–N5) go to the very top (newest). Everything else shifts down by 5:

Position: 1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30
Job:     N1 N2 N3 N4 N5 A  B  C  D  E  F  G  H  I  J  K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y
Page 2 request — LIMIT 20 OFFSET 20

The database doesn't know anything changed — it just grabs positions 21–40 (now):

Positions 21–40 → P Q R S T U V W X Y
Compare Page 1 vs Page 2
Page 1 showed: A B C D E F G H I J K L M N O P Q R S T
Page 2 showed: P Q R S T U V W X Y


# Q2. The composite cursor (created_at, id) is decoded and used in the WHERE clause as (j.created_at, j.id) < ($1::timestamptz, $2). PostgreSQL evaluates row comparisons left to right. Describe what happens if two jobs have the same created_at and the cursor only included created_at. Which job would be skipped and why?
one job would becomes skip thats why we use id


# Q3. An admin needs to export all jobs from the database for a data warehouse load. The export must process records in batches of 1,000 and start from an arbitrary position (e.g., batch 47 of 200). Evaluate whether cursor or offset pagination is more appropriate for this specific use case, and identify the conditions under which your answer would change.

offset would be appropriate coz we are jumping directly to batch 47.
when it wpuld change: when data is actively changing.

























































