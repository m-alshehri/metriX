# Bright Data balance protection

Bright Data collection is in a manually controlled test mode. EnsembleData is unchanged.

- All three platform slots start disabled. Recharging the provider does not enable collection.
- An administrator must assign a slot to one social account and enable it explicitly, after recharge is confirmed. Enable one platform at a time and inspect its result before the next.
- A database compare-and-set consumes the slot **before** the paid request. Concurrent jobs, cron, retries, new pipeline jobs and redeployments cannot reuse it.
- Failure or timeout does not refund the slot. Check the provider dashboard for an accepted request/snapshot before any deliberate reset.
- Every new request uses asynchronous `/trigger`, one input, `limit_per_input=1`, `limit_multiple_results=1`, and Facebook `num_of_posts=1`. Existing snapshots are polled/downloaded without another trigger.
- Slots are service-role-only; users cannot enable or reset them through the public API. The migration grants no insert/delete permission to the application.
- These controls limit requests originating in this deployment. They do not impose a dollar limit on the provider account or cover other applications, provider schedules, minimum charges, or old deployments. Do not promise a dollar amount without checking actual provider billing.

To arm a test, an administrator updates the matching platform row's `social_account_id` and `enabled=true` while `reserved_at is null`. No row is armed by the migration. Never reset a used slot automatically.

Provider references:
- https://docs.brightdata.com/api-reference/rest-api/scraper/asynchronous-requests
- https://docs.brightdata.com/api-reference/scrapers/synchronous-requests
- https://docs.brightdata.com/api-reference/scrapers/social-media-apis/linkedin-posts-discover-by-company-url
