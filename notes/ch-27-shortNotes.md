Tenant = Company
Many companies share one database.
Companies must never see each other's data.
Always get companyId from the authenticated user's database record, never from the URL or request body.
Every recruiter query must include WHERE company_id = companyId.
Admins can access all companies' data (intentional exception).
Applicants are isolated by applicant_id, not company_id.
Changing IDs in the URL should never allow access to another company's or another applicant's data (prevents IDOR).