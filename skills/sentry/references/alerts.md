# Sentry alerts

Resolve the organization, project/environment, triggering condition, frequency,
and destination from the request and existing configuration. Ask only for missing
choices that change who is notified or when. Use configured credentials through
the connector or secret system; never ask for an auth token in the conversation.

Inspect existing alerts before creating another. Resolve destination IDs through
current membership and integration data. Read [workflow payloads](alert-payloads.md)
when the target uses the workflow engine API; check current endpoint/tool schemas
before applying its pinned examples. Legacy alert rules may use another API.

Prepare the exact condition and destination before a mutation. Reuse existing
authorization; a request for a draft config does not authorize sending a test
notification or enabling it. After an authorized create/update, read back the
workflow and return its identifier or service-provided link. If the response is
ambiguous, look for the created workflow before retrying to avoid duplicates.
