# State and concurrency

Choose an object boundary around the entities that need coordination. Separate
independent entities when scale requires it; a bounded singleton can still be an
intentional coordinator. Evaluate its traffic and responsibilities before
calling it a bottleneck.

Use durable storage for state that must survive eviction or failure. Memory may
cache durable values but cannot be the only record of acknowledged durable work.
Prefer SQLite for new objects when appropriate; retain existing migration history
and plan a storage migration explicitly for deployed classes.

Understand input and output gates for the storage APIs in use. Synchronous
SQLite operations without an intervening await can have different guarantees
from operations separated by asynchronous work. Use a transaction for the
required atomic unit. Avoid a blanket rule that every await breaks atomicity.

Keep `blockConcurrencyWhile` short and tied to initialization or a specific
invariant. Avoid external network work while holding it. Reconstruct necessary
state after eviction and make initialization safe to repeat.

Check schema changes against existing data, including partially completed
upgrades when relevant. Consult the [rules of Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)
and the installed storage API before relying on concurrency guarantees.
