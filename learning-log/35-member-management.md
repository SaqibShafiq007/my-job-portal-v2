# listCompanyMembers returns the full list without pagination. The guideline notes that member lists are unlikely to grow large enough to require pagination. At what approximate member count would you revisit this decision — and what signals (query time, payload size, UI experience) would trigger that revisit in a real project?
|it is not about number it is about when query time(db) getting slow , Payload size(response getting heavy) increases and ui feels messy or slow.then we have to add pagination.

# The self-removal check compares member.userId === userId using the user ID from the JWT. Could an owner bypass this check by supplying their own recruiter ID to the DELETE endpoint but using a different JWT? Explain why the current implementation prevents or does not prevent this bypass.

 no, they can't bypass it — the check is based on the token's real identity, not anything the request can fake.


 ## QUIZ

 # Q1. getMemberById(recruiterId, companyId) returns null if the recruiter ID does not exist in this company — regardless of whether the UUID exists in a different company. The service then throws NotFoundError. Compare this to an alternative implementation that first checks if the recruiter ID exists at all, then checks company membership, returning 404 in the first case and 403 in the second. Which approach is more secure and why?

1st approach is best cause 2nd appproach may give an idea to attaacker that this id actually exist when 403 occurs.
404 = "that ID doesn't exist anywhere"
403 = "that ID is real, just belongs to someone else"
so approach A is safe.




# Q2. A hiring manager is removed from the company via DELETE /api/companies/members/:recruiterId. Their users row is untouched. They still have a valid access token (issued 5 minutes ago, expires in 10 more minutes). Describe what happens when they make a request to a company-scoped route during those 10 minutes. Is the token still valid? Does getRecruiterCompany return data? What response do they receive?

their token is valid , he is authenticated but when we find its company using getRecruiterCompany , it return 403 Forbidden -> No company workspace found.




# 3. The PATCH /api/companies/members/:recruiterId endpoint does not allow changing the target to 'owner'. A product manager wants to add an "ownership transfer" feature. The desired flow: the owner promotes another member to 'owner', and the original owner is simultaneously demoted to 'hr_manager'. Describe the service-layer logic and database operations this feature would require, including what atomicity guarantees are needed.

```sql
export async function transferOwnership(userId: string, newOwnerRecruiterId: string) {
  const company = await getRecruiterCompany(userId);
  if (!company) throw new ForbiddenError('No company workspace found.');

  assertCompanyRole(company.companyRole, ['owner']);  // only current owner can transfer

  const target = await getMemberById(newOwnerRecruiterId, company.companyId);
  if (!target) throw new NotFoundError('Member not found.');

  if (target.userId === userId) {
    throw new BadRequestError('You already own this company.');
  }

  // ... do the actual transfer (below)
}
```

here we use transaction 
```sql
BEGIN;

UPDATE recruiters SET company_role = 'hr_manager'
WHERE id = $1 AND company_id = $2;   -- old owner → demoted

UPDATE recruiters SET company_role = 'owner'
WHERE id = $3 AND company_id = $2;   -- new person → promoted

COMMIT;
```






