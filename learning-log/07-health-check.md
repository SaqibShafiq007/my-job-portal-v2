Why is the health check wired directly in app.ts rather than inside a module under src/modules/?
bcz it is not a feature like companies,jobs,auths etc. It is a infrastructor. a signal from the process abnout the process that app is still alive or not.







Imagine you had added a SELECT 1 to the health check handler. The database goes down. Walk through exactly what happens to the running process — step by step — and explain why that's a worse outcome than if the health check hadn't queried the database at all.

it does not handle db or reddis , it just chk if app is alive? if it checks db then app restarts and does nothing. we will stuck in an infinte loop











What is the difference between a liveness probe and a readiness probe? Which one did you just build, and which chapter builds the other?
liveness probe chk if app is alive or not
readiness probe check if app is ready to handle traffic?



            --------Quiz

11)A load balancer checks GET /health on each instance every five seconds. Instance A returns 200. Instance B returns 503. What does the load balancer do — and what would happen if there were no /health route at all?

Load balancer sends traffic only to Instance A (returning 200 — healthy) and stops sending traffic to Instance B (returning 503 — unhealthy). Instance B gets removed from rotation until it starts returning 200 again.
If there was no /health route at all — load balancer would get 404 from both instances, which is not 200, so it would think both instances are unhealthy and stop sending traffic to everyone. All users would get errors even though Instance A was perfectly fine and working.

2)
Your infrastructure team adds a CDN in front of the service that caches all GET responses for 30 seconds to reduce load. What specific problem does this create for the /health endpoint — and what field in the response body would expose it?

CDN caches the /health response for 30 seconds. So for 30 seconds everyone gets the same old cached response — even if the app actually went down 5 seconds ago. The load balancer keeps receiving 200 (from cache) and thinks app is healthy, keeps sending traffic, but app is actually dead.
The timestamp field in the response would expose this problem — because the cached response would keep showing the same old timestamp for 30 seconds instead of a fresh time on every call. Anyone looking at the timestamp would immediately notice "this response is 25 seconds old, something is wrong."



3)A teammate suggests adding a database SELECT 1 to the health check "so we know the whole stack is healthy." What specific failure mode does that introduce? How would you address the underlying concern differently?

stuck in infinite loop