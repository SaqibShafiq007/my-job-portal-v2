# Your job-posting service function receives a deadline field. The validation layer has already verified it is a valid ISO date string. Describe what the service should do with it and explain what the boundary contract means for every layer below the route handler.
service func used it directly not check that if it is a valid date or not
What the boundary contract means: once the route handler's validation passes, everything below it (service, repository, database layer) can treat the data as already-clean. No layer needs to re-verify what an earlier layer already checked.


# A colleague says: "We have NOT NULL and CHECK constraints on every important column, so we don't need a validation layer — the database will catch bad input." Explain what the database cannot catch that a validation layer can, and what the validation layer cannot catch without the database's help.

User-friendly error messages. If someone submits a bad request, the database just throws a raw technical error (null value in column "title" violates not-null constraint). Only validation can turn that into something a normal user understands, like "title is required".
Type/meaning mistakes (e.g. deadline: "banana" in a text column — DB won't stop it, validation will)

db handle race condition, if someone skiip your api entirely , mistake in your code that uh saved accidently bad data but db can throw an error.



## Quick quiz

# Q1. A route handler receives { "deadline": "not-a-date" } and passes it directly to the service, which passes it directly to a SQL INSERT. The deadline column is of type date. What kind of error does PostgreSQL return, who sees it, and what information does it reveal about the system?
postrgres tries to read "not a dat" as date and throw an error like invalid syntax 
whoever sent the req can see it 
What it reveals: the column's actual data type (date), and indirectly confirms the request reached the database layer at all (meaning no validation exists at the boundary) — internal implementation detail that should never be exposed to an outside client.



# Q2. Two applicants submit applications to the same job at the same time. Both requests pass stateless schema validation — the validation layer checks field types and presence but does not query the database. Which layer catches the duplicate, and what should the route handler do when it receives the error from that layer?
database catches(this is a race condition)
What the route handler should do: catch the db handler error msg and convert it into user friendly error msg like "you already applied to this job".

# An HTTP POST body arrives at the route handler. Explain why the TypeScript type system cannot guarantee that the body's fields have the types the route handler expects — and what mechanism is needed to provide that guarantee at runtime.

bcz typescript only chk compile time error it does not have link to runtime  like if we have tutle:123 instead of string then tpescript cant catch it.
runtime validation:actual code that checks the real data as it arrives (like Zod). Only that can catch bad data TypeScript can't see.











