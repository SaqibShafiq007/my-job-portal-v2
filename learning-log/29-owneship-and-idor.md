# assertJobOwnership throws NotFoundError when company_id !== companyId. The job exists in the database — the server knows it exists. Returning 404 in this case is technically a lie. Write a one-paragraph argument for returning 403 instead (revealing existence, hiding content) and a one-paragraph argument for returning 404 (hiding existence entirely). Which would you choose for this system, and why?


# 403:
if we use this we are directly telling that job is real but uh cant own it. it may be harmfull coz attacker might knw that job is actually here
# 404:
not found means attacker won't get an idea that jobn is actually exist 
# Which one for this app, and why
404 the one we already built.
This app is meant to keep different companies' data completely separate from each other. So it's not okay to even confirm "yes, Company B has a job with that ID" — that alone is a small leak. Saying 404 for both "doesn't exist" and "exists but isn't yours" means an attacker learns nothing useful by guessing IDs, which matches exactly what we tested in Steps 4 and 5 earlier (both cases gave the identical response).



