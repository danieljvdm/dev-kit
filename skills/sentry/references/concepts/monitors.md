# Monitors → Issues → Alerts — The Model

Sentry separates **what you detect** from **what you do about it**, in three stages —
**Monitors** detect, **Issues** are the unit you triage, and **Alerts** respond:

- A **Monitor** decides _when_ a signal becomes an **issue**.
- An **Issue** is the unit you triage — a grouped, stateful object (status, priority,
  assignee, history).
- An **Alert** decides _what to do_ once an issue matches its conditions — notify Slack,
  page someone, open a ticket, hit a webhook.

Monitors detect; Alerts respond.
They’re configured independently: one alert can watch many monitors/projects, and one
monitor can feed several alerts.

> Terminology: this model uses **Metric Monitor** for the detection stage and reserves
> **Alert** for the response stage.
> Older docs and integrations still say “metric **alert**” for the same detection
> concept — treat them as the same thing; the rename isn’t fully settled across the
> product.

## Monitors — when a signal becomes an issue

- **Default monitors** — auto-created per project: the **Issue Stream Monitor** and
  **Error Monitor** (the error-detection / grouping pipeline).
  Nothing to set up; worth knowing they’re “monitors” in this model.
- **Custom monitors:**
  - **Metric Monitor** — a threshold on errors / spans / logs / releases / Application
    Metrics; the threshold can be **fixed**, a **percentage change** vs.
    a prior window, or **dynamic anomaly detection**. Often created straight from a
    saved Discover or Metrics-Explorer query.
  - **Cron Monitor** — a scheduled-job watch via check-ins ([`crons.md`](crons.md)).
  - **Uptime Monitor** — periodic HTTP checks against a URL.
  - **Mobile Builds Monitor** — app-size thresholds across iOS/Android builds.

**Monitor config also sets issue attributes at creation** — priority, auto-resolve, and
assignee (ownership rules can override the assignee).
The monitor decides not just _that_ something becomes an issue but _how important_ it is
and _who owns it_.

## Alerts — acting on issues

An alert is **sources → triggers → filters → actions**:

- **Sources** — which projects/monitors it watches.
- **Triggers** — which issue-state changes fire it (new, regression, reappearance,
  resolved); triggers are OR’d.
- **Filters** — conditions the issue/event must match before actions run (priority,
  frequency, tags, assignment, age); filter groups can be ANY or ALL. **If an issue
  exists but no alert fired, a filter is usually why.**
- **Actions** — Slack, email, PagerDuty, Discord, Jira, webhook, …

## When to reach for what

- _“Tell me in Slack when a new issue shows up”_ → an **Alert** (the default error
  monitor already makes the issues).
- _“Alert when error rate / latency / a metric crosses a line”_ → a **Metric Monitor**,
  then an alert.
- _“My nightly job didn’t run”_ → a **Cron Monitor**. _“Is my endpoint up?”_ → an
  **Uptime Monitor**.

## Coverage honesty

Alert creation is automatable via Sentry’s workflow-engine API; several monitor types
(uptime, dashboards) are heavier UI/API hand-offs today — be upfront about what the
agent can do end-to-end vs.
where it walks the user through the UI. The MCP is **read-only** here: it can inspect
alert rules (`find_alert_rules`, `get_alert_rule`), cron monitors and their check-ins
(`find_monitors`, `get_monitor_details`), and dashboards — useful for verifying after
creation — but there is no create or update path for any of them, and uptime monitors
have no MCP surface at all.

## Related

- [`crons.md`](crons.md)
- [`metrics.md`](metrics.md)
- [`releases.md`](releases.md)
- [`search-query-language.md`](../search-query-language.md)
