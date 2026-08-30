# Architecture

```mermaid
flowchart TB
  jira[Jira Cloud] --> forge[Atlassian Forge] --> kimai[Kimai self-hosted]
```

Instead of running our own externally-hosted server, the app runs entirely on Forge: UI
extensions, event triggers, a web trigger endpoint, storage and encrypted secrets.

## Modules (`manifest.yml`)

| Module | Purpose |
|---|---|
| `jira:issueContext` | Right-hand sidebar panel with Timer/Manual tabs, rendered with UI Kit 2 (`@forge/react`). |
| `jira:adminPage` | Site administrator configuration page. |
| `trigger` | Subscribes to `avi:jira:created/updated/deleted:worklog` events. |
| `webtrigger` | Public HTTPS endpoint that receives Kimai webhooks. |
| `function` | Backend handlers for the resolvers, trigger and web trigger. |

## Source layout

```mermaid
flowchart TB
  root["src/"]
  root --> frontend["frontend/: UI Kit 2 entry points (issue-context, admin)"]
  root --> resolvers["resolvers/: Forge resolver functions backing the frontend"]
  root --> jira["jira/: Jira REST API client and worklog trigger handler"]
  root --> kimai["kimai/: Kimai REST API client"]
  root --> webhooks["webhooks/: Web trigger handler, signature verification, event handlers"]
  root --> sync["sync/: Synchronization policy, mapping, idempotency, conflict resolution"]
  root --> storage["storage/: Forge KVS and secret storage helpers"]
  root --> shared["shared/: Cross-cutting types, logging, errors, validation"]
```

`jira/`, `kimai/` and `sync/` are intentionally separate: neither Jira- nor Kimai-specific code
implements synchronization policy directly, which keeps both integrations swappable and testable
in isolation.

## Data flow

```mermaid
flowchart LR
  jiraEvent[Jira worklog event] --> jiraHandler[jira/worklog-events.ts] --> jiraSync[sync/jira-to-kimai.ts] --> kimaiClient[kimai/client.ts]
  kimaiWebhook[Kimai webhook] --> webhookHandler[webhooks/kimai-webhook.ts] --> kimaiSync[sync/kimai-to-jira.ts] --> jiraClient[jira/client.ts]
```

Both directions read/write the same persistent mapping (`storage/mappings.ts`) keyed by both the
Jira worklog ID and the Kimai timesheet ID, described in
[Synchronization Model](synchronization-model.md).
