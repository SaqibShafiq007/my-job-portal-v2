# The isolation rule comment placed in companies.repo.ts and jobs.repo.ts documents the constraint for future developers. What other mechanisms — beyond comments — could enforce the isolation rule programmatically so that a developer adding a new company-scoped query without the company_id filter would be caught before the code ships?







# Q1. The attack test shows that GET /api/jobs/<company-B-job> with a Company A recruiter token returns 404. A security reviewer argues the test is incomplete because it only tests one recruiter against one cross-company job. What additional scenarios would make the test suite more thorough? Name at least three, and for each, state the expected response code and why.

1.Reverse direction : Company B tries Company A's job
2.Company B has 2 jobs (from the seed data — NovaSpark has "UI Designer" and "Senior Frontend Engineer"). Try both with Company A's token.
3.A recruiter who belongs to more than one company (if that's possible in this system)
If your data model ever allows a recruiter to be linked to multiple companies, you'd want to test: does the isolation check correctly use only the specific company relevant to this request, not accidentally leak access from a different company they're also linked to? 

# . A recruiter who belongs to more than one company (if that's possible in this system) If your data model ever allows a recruiter to be linked to multiple companies, you'd want to test: does the isolation check correctly use only the specific company relevant to this request, not accidentally leak access from a different company they're also linked to?

# Q3. The isolation rule states that company_id must come from the authenticated recruiter row, never from a URL parameter. The admin exception allows queries without any company_id filter. Is there a category of user other than admin that might legitimately need partial cross-company access — for example, a platform-level auditor role with read-only access to all companies? Describe how you would implement this role's access control without weakening the isolation guarantees for the recruiter role.

Short answer:
Yes — an auditor role fits this.
How to implement it, without weakening recruiter isolation:

Add a new role, e.g. auditor, in the users.role column (alongside admin/recruiter/applicant).
Create a separate route, like GET /api/audit/jobs/:id, guarded by requireRole('auditor') — completely separate from /api/jobs/:id.
This new route's query has no company_id filter, same idea as the admin route — it's allowed to see any company's data.
Make it read-only: only allow GET routes for auditors — no PUT/DELETE/POST on this router at all. This limits the risk even further than admin (admin could presumably write too).
