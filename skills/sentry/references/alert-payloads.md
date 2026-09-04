# Workflow payloads

Reference shape from the pinned upstream Sentry guide. Confirm the target's
current API schema before mutation; this API and feature availability can change.
Workflow actions belong in `actionFilters[].actions`, not `triggers.actions`.

### Trigger Events

Pick which issue events fire the workflow.
Use `logicType: "any-short"` (triggers must always use this).

| Type                     | Fires when               |
| ------------------------ | ------------------------ |
| `first_seen_event`       | New issue created        |
| `regression_event`       | Resolved issue recurs    |
| `reappeared_event`       | Archived issue reappears |
| `issue_resolved_trigger` | Issue is resolved        |

### Filter Conditions

Conditions that must pass before actions execute.
Use `logicType: "all"`, `"any-short"`, or `"none"`.

**The `comparison` field is polymorphic** — its shape depends on the condition `type`:

| Type                                | `comparison` format                                        | Description                                  |
| ----------------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| `issue_priority_greater_or_equal`   | `75` (bare integer)                                        | Priority >= Low(25)/Medium(50)/High(75)      |
| `issue_priority_deescalating`       | `true` (bare boolean)                                      | Priority dropped below peak                  |
| `event_frequency_count`             | `{"value": 100, "interval": "1hr"}`                        | Event count in time window                   |
| `event_unique_user_frequency_count` | `{"value": 50, "interval": "1hr"}`                         | Affected users in time window                |
| `tagged_event`                      | `{"key": "level", "match": "eq", "value": "error"}`        | Event tag matches                            |
| `assigned_to`                       | `{"targetType": "Member", "targetIdentifier": 123}`        | Issue assigned to target                     |
| `level`                             | `{"level": 40, "match": "gte"}`                            | Event level (fatal=50, error=40, warning=30) |
| `age_comparison`                    | `{"time": "hour", "value": 24, "comparisonType": "older"}` | Issue age                                    |
| `issue_category`                    | `{"value": 1}`                                             | Category (1=Error, 6=Feedback)               |
| `issue_occurrences`                 | `{"value": 100}`                                           | Total occurrence count                       |

**Interval options:** `"1min"`, `"5min"`, `"15min"`, `"1hr"`, `"1d"`, `"1w"`, `"30d"`

**Tag match types:** `"co"` (contains), `"nc"` (not contains), `"eq"`, `"ne"`, `"sw"`
(starts with), `"ew"` (ends with), `"is"` (set), `"ns"` (not set)

Set `conditionResult` to `false` to invert (fire when condition is NOT met).

### Actions

| Type        | Key Config                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `email`     | `config.targetType`: `"user"` / `"team"` / `"issue_owners"`, `config.targetIdentifier`: `<id>`   |
| `slack`     | `integrationId`: `<id>`, `config.targetDisplay`: `"#channel-name"`                               |
| `pagerduty` | `integrationId`: `<id>`, `config.targetDisplay`: `<service_name>`, `data.priority`: `"critical"` |
| `discord`   | `integrationId`: `<id>`, `data.tags`: tag list                                                   |
| `msteams`   | `integrationId`: `<id>`, `config.targetDisplay`: `<channel>`                                     |
| `opsgenie`  | `integrationId`: `<id>`, `data.priority`: `"P1"`-`"P5"`                                          |
| `jira`      | `integrationId`: `<id>`, `data`: project/issue config                                            |
| `github`    | `integrationId`: `<id>`, `data`: repo/issue config                                               |

### Full Payload Structure

```json
{
  "name": "<Alert Name>",
  "enabled": true,
  "environment": null,
  "config": { "frequency": 30 },
  "triggers": {
    "logicType": "any-short",
    "conditions": [{ "type": "first_seen_event", "comparison": true, "conditionResult": true }],
    "actions": []
  },
  "actionFilters": [
    {
      "logicType": "all",
      "conditions": [
        { "type": "issue_priority_greater_or_equal", "comparison": 75, "conditionResult": true },
        {
          "type": "event_frequency_count",
          "comparison": { "value": 50, "interval": "1hr" },
          "conditionResult": true
        }
      ],
      "actions": [
        {
          "type": "email",
          "integrationId": null,
          "data": {},
          "config": {
            "targetType": "user",
            "targetIdentifier": "<user_id>",
            "targetDisplay": null
          },
          "status": "active"
        }
      ]
    }
  ]
}
```

`frequency`: minutes between repeated notifications.
Allowed values: `0`, `5`, `10`, `30`, `60`, `180`, `720`, `1440`.

**Structure note:** `triggers.actions` is always `[]` — actions live inside
`actionFilters[].actions`.
