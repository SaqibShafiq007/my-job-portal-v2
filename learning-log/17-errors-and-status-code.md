## Log it Questions


# You add a new PaymentRequiredError (HTTP 402) for a future billing feature. Write the complete class definition. What is the only file you need to change?

```ts
export class PaymentRequiredError  extends AppError {
  constructor(message = 'Payment required') {
    super(402, 'ayment-required', message);
  }
}
```
addd just this in error.ts


# A route calls await someService.doThing() and the service throws a ConflictError. You do not have a try/catch in the route handler. In Express 4, does the error reach the error handler — and why or why not? What would you need to add to guarantee it does?
No, express has no idea that an error actually occured . it just becomes an unhandled promise rejection, floating outside Express's error system entirely. 
we need to add it in try/catch
```ts
router.get('/', async (req, res, next) => {
  try {
    await someService.doThing();
  } catch (err) {
    next(err);
  }
});
```

# Your error handler logs the full error with console.error on 500s. In a production system with structured logging (e.g. sending logs to Datadog or CloudWatch), what would you pass to the logger instead of just the raw err object to make the log entry useful?
structured logging needs context around the error (who, what, when, where) not just the bare error text so you can search/filter/trace it later instead of digging through a wall of unstructured text.
like msg,requestId,path(jobbs),userId(it is affecting 1 user or everyone)



## Quick Quiz

# Q1. A teammate calls your jobsService.getJob() from a CLI script — not from an Express route handler. The service throws new NotFoundError('Job not found'). There is no error handler in scope. What happens? What does your teammate need to add to their script to handle this gracefully, and what would the handling look like given that NotFoundError is an AppError with statusCode and code properties?
 What happens: node crash and print erro
 What the teammate needs to add: he should add a ttry catch
 Because NotFoundError still carries those properties (404, 'NOT_FOUND') no matter where it's used that's the benefit of the class design. Even outside Express, the teammate can still read err.statusCode or err.code if they want to display something more specific, without needing Express at all.

# Q2. You register the error handler before your routes:
# app.use(errorHandler);         // registered first
# app.use('/jobs', jobsRouter);  // registered second
# What happens when a route in jobsRouter calls next(new NotFoundError('...'))? Why?
error is not caught by error handler coz express run middlewares in the exact od=rder of run 1st router and then errorhandler

# Q3. In production (NODE_ENV=production), an unexpected database connection error — Error: connect ECONNREFUSED 127.0.0.1:5432 — reaches the error handler. What does the client receive in the response body? What does the server log? Why are these two things different from each other?

code :internal error
msg : unexpected error occured
code 500
Server logs (via console.error): the full real error , Error: connect ECONNREFUSED 127.0.0.1:5432, including its stack trace.
why they different : bcz NODE_ENV !== 'development'  , there may be a secuirty tish and cocnfusiong to users . server side keeps full detail bcz we have to solve this.
