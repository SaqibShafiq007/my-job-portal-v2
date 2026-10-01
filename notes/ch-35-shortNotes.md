What Chapter 36 Is Doing
Chapters 1–35 built up the skeleton: recruiters, companies, roles, auth. Chapter 36 is where you actually let recruiters create and manage job postings. It's the "jobs CRUD + lifecycle" chapter.
Concretely, it adds four capabilities:

Post a new job → POST /api/jobs/
Edit an existing job → PATCH /api/jobs/:id
Publish a job (draft → open, visible to applicants) → POST /api/jobs/:id/publish
Close a job (open → closed) → POST /api/jobs/:id/close

