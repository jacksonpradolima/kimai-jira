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
  root --> storage["storage/: Forge KVS, secret storage, and Jira target mappings"]
  root --> shared["shared/: Cross-cutting types, logging, errors, validation"]
```

`jira/`, `kimai/` and `sync/` are intentionally separate: neither Jira- nor Kimai-specific code
implements synchronization policy directly, which keeps both integrations swappable and testable
in isolation.

### Issue timer target provisioning

The issue timer uses a Kimai customer selected in the Jira issue panel. The selected customer is
stored as the default for that Jira project, so a later timer started for another issue in the same
project preselects it. The user can choose another customer before starting a timer; that choice
becomes the new project default.

```mermaid
flowchart TD
  panel["Jira issue timer panel"] --> customers["Load Kimai customers"]
  customers --> available{"Any customers available?"}
  available -- No --> missing["Show: create a customer in Kimai"]
  available -- Yes --> selected["Preselect the Jira project's saved customer<br/>or let the user choose another"]
  selected --> target{"Issue target already mapped<br/>for the selected customer?"}
  target -- Yes --> reuse["Reuse the mapped Kimai project and activity"]
  target -- No --> project["Find or create Kimai project<br/>from the Jira project"]
  project --> activity["Find or create project-specific Kimai activity<br/>from the Jira issue"]
  activity --> persist["Save the Jira project customer default<br/>and issue target mapping"]
  reuse --> timer["Start Kimai timer"]
  persist --> timer
```

Kimai projects and activities are created only after the user presses **Start**. The timer controls
disable while that request is pending, and the backend also holds a short-lived claim to prevent a
duplicate start for the same Kimai user and Jira issue.

## Data flow

Synchronization is not a distributed transaction. A Jira worklog or Kimai timesheet is already
saved in its source system before the integration receives its event. A failure therefore never
rejects or deletes that source record. The integration considers a change synchronized only after
the target API call and mapping persistence both succeed.

### Jira worklog to Kimai timesheet

```mermaid
flowchart TD
  jiraEvent["Jira saves a worklog and emits an event"] --> prerequisites{"Kimai configuration, defaults,<br/>and user mapping available?"}
  prerequisites -- No --> skipped["Do not call Kimai or save a mapping<br/>Jira worklog remains; log skipped"]
  prerequisites -- Yes --> duplicate{"Existing mapping has the<br/>same content hash?"}
  duplicate -- Yes --> ignored["Do not write; log duplicate ignored"]
  duplicate -- No --> writeKimai["Create or update Kimai timesheet"]
  writeKimai --> kimaiAccepted{"Kimai accepts the user,<br/>project, and activity?"}
  kimaiAccepted -- No --> kimaiFailure["Jira worklog remains; no new or updated mapping<br/>Handler fails with no user-facing response"]
  kimaiAccepted -- Yes --> saveKimaiMapping["Store pending-create record, then persist<br/>the Jira worklog - Kimai timesheet mapping"]
  saveKimaiMapping --> kimaiMappingSaved{"Mapping storage succeeds?"}
  kimaiMappingSaved -- Yes --> jiraSuccess["Both records are linked<br/>Log worklog created or updated success"]
  kimaiMappingSaved -- No --> kimaiRecovery["Kimai timesheet remains; pending record enables recovery<br/>on a later replay; handler fails"]
```

If the configured Kimai project, activity, or user does not exist, Kimai rejects the request. The
Jira worklog remains unchanged and no new mapping is saved. Jira event handlers do not return a
user-facing success message; successful and skipped outcomes are recorded in Forge logs, while a
target failure causes the handler to fail.

### Kimai timesheet to Jira worklog

```mermaid
flowchart TD
  kimaiEvent["Kimai saves a timesheet and sends a webhook"] --> signature{"Webhook signature valid?"}
  signature -- No --> unauthorized["Reject request with HTTP 401"]
  signature -- Yes --> usable{"Timesheet is finished and a Jira<br/>issue key can be resolved?"}
  usable -- No --> ignoredWebhook["Ignore event and return HTTP 200 OK"]
  usable -- Yes --> duplicateWebhook{"Existing mapping has the<br/>same content hash?"}
  duplicateWebhook -- Yes --> duplicateOk["Do not write; return HTTP 200 OK"]
  duplicateWebhook -- No --> writeJira["Create or update Jira worklog"]
  writeJira --> jiraAccepted{"Jira issue exists and the app<br/>may write its worklog?"}
  jiraAccepted -- No --> jiraFailure["Kimai timesheet remains; no new or updated mapping<br/>Log error and return HTTP 500"]
  jiraAccepted -- Yes --> saveJiraMapping["Store pending-create record, then persist<br/>the Kimai timesheet - Jira worklog mapping"]
  saveJiraMapping --> jiraMappingSaved{"Mapping storage succeeds?"}
  jiraMappingSaved -- Yes --> kimaiSuccess["Both records are linked<br/>Log success and return HTTP 200 { ok: true }"]
  jiraMappingSaved -- No --> jiraRecovery["Jira worklog remains; pending record enables recovery<br/>on a later webhook; return HTTP 500"]
```

If the referenced Jira issue or its project does not exist, or the app lacks permission to add a
worklog, Jira rejects the request. The Kimai timesheet remains unchanged and unmapped; the webhook
receives a safe HTTP 500 error response so the failure is visible to Kimai and Forge logs.

Both directions use the same persistent mapping (`storage/mappings.ts`), indexed by Jira worklog
ID and Kimai timesheet ID. Pending-create records make a replay recover from a mapping-storage
failure after the target record was created; they are recovery markers, not a cross-system rollback.
See [Synchronization Model](synchronization-model.md) for idempotency and loop prevention.
