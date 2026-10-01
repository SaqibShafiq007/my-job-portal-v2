Complete FK summary
-- Already set in chapters 8–10

recruiters.user_id    REFERENCES users(id)     ON DELETE CASCADE
applicants.user_id    REFERENCES users(id)     ON DELETE CASCADE
admins.user_id        REFERENCES users(id)     ON DELETE CASCADE

-- Decided in this chapter — add to your learning-log DDL

recruiters.company_id           REFERENCES      companies(id) ON DELETE RESTRICT
jobs.company_id                 REFERENCES      companies(id) ON DELETE RESTRICT
applications.job_id             REFERENCES      jobs(id)      ON DELETE RESTRICT
applications.applicant_id       REFERENCES      applicants(id) ON DELETE RESTRICT




# Which FK decision in this chapter required the most careful reasoning? What does RESTRICT protect against in that specific case?
applications.applicant_id → applicants(id)


# Describe a scenario in this portal where a developer might feel tempted to add ON DELETE CASCADE to a FK that this chapter classifies as RESTRICT. What would happen if they did?
A developer building the "delete company" admin feature might think "just CASCADE jobs.company_id so deleting a company cleans everything up automatically." If they did, deleting one company would silently delete every job it ever posted and every application those jobs ever received — destroying the company's entire hiring history with one click, no recovery possible.




# A recruiter's user account is hard-deleted via the admin panel. The recruiter row is cascade-deleted as a result. Which rows in applications are affected by this recruiter deletion, and why?
No applications rows are affected at all. Applications reference applicant_id, not the recruiter.



# . A company needs to be permanently removed from the platform. Starting from the state where the company has two active recruiters, five posted jobs, and twelve applications received, write the sequence of SQL operations required (table names and order only — no full queries) to hard-delete the company row without violating any FK constraint.
DELETE FROM applications WHERE job_id IN (jobs of this company)
DELETE FROM jobs WHERE company_id = this company
DELETE FROM recruiters WHERE company_id = this company
DELETE FROM users WHERE id IN (those recruiters' user_ids)
DELETE FROM companies WHERE id = this company




# A developer argues: "We should add CHECK (deadline > CURRENT_DATE) to the jobs table so the database rejects past deadlines." Give two reasons why this is the wrong approach — and explain where the deadline validation should live instead.