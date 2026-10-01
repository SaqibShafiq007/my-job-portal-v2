# he service deletes the invitation row after creating the recruiter row, but these two operations are not wrapped in a transaction. Describe the failure scenario that arises if the process crashes between the two steps. What constraint would you add to the database to make a repeated acceptance idempotent rather than destructive?


if server crash bw them them a user again want to click th elink again and this cause duplication. 2 same rows  createRecruiterRow again with same userId, same companyId.
to protect this we added UNIQUE (user_id, company_id) ,

Not fully idempotent.
True idempotency would mean clicking the link twice gives the exact same successful result both times (like  you're a member"no error at all). What we actually have is . clicking it twice gives success the first time, and a clear, harmless error the second time. The user isn't silently broken or duplicated  they just see "already a member," which is accurate and not harmful.



# The error messages for "token not found," "token expired," and "email mismatch" are all identical: "Invalid or expired invitation token." A developer argues that users deserve more specific error messages so they know whether to request a new invitation versus check their email address. Evaluate the security argument for uniform messages against the usability argument for specific messages. What is your recommendation?
uniform msg is correct 
specific msg like expired ,wrong email , fake token will be beneficial for an attacker so our mission is protect from attacker


## Quiz 


# . The findInvitationByToken function hashes the raw token before querying the database. Suppose a developer changes the function to query directly by token_hash = $1 where $1 is taken from the request body without hashing (i.e., the client sends the hash instead of the raw token). What changes to the token distribution in sendInvitationEmail would be required to make this work — and does this alternative design weaken security? Explain.


# Q2. The accept-invitation endpoint creates a new user with status='active' and role='recruiter' without sending a verification email. A product manager asks: what stops someone from harvesting invitation links from email logs and using them to create accounts for email addresses they don't control? Trace through the security model and explain why this attack is not possible given the current design.

if someone get the email and he login but he will never recieved anything sendt to bob mail like.attacker  does not have accesss to actuall mailbox
Reset your password links
Confirm this action emails
Any notification



# Q3. The unique constraint UNIQUE (user_id, company_id) on the recruiters table is mentioned in the guidelines as a guard against duplicate acceptance. Without this constraint, what sequence of HTTP requests by the invitee could create two recruiters rows for the same user and company — and what would be the downstream consequences for getRecruiterCompany(userId) if it returns more than one row?

duplication occur if invitee twicke entre link


