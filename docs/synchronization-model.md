# Synchronization Model

## Mapping

Every synchronized entry is tracked as a `WorklogMapping`:

```ts
interface WorklogMapping {
  jiraIssueId: string;
  jiraIssueKey: string;
  jiraWorklogId: string;

  kimaiTimesheetId: number;

  origin: 'jira' | 'kimai';

  lastSyncedAt: string;
  lastHash?: string;
}
```

It is stored twice, indexed from both directions (`storage/mappings.ts`), so either system can
look up its counterpart in O(1).

## Jira → Kimai

1. Jira emits `avi:jira:created:worklog` / `avi:jira:updated:worklog`.
2. `src/jira/worklog-events.ts` resolves the Kimai user/project/activity for the worklog author.
3. `src/sync/jira-to-kimai.ts` creates or updates the mapped Kimai timesheet.
4. The mapping is persisted with a content hash of the synced fields.

Kimai delete events are deferred until a reliable webhook event is available upstream; the
handler layer (`src/webhooks/handlers/`) isolates this so delete support can be added without
changing the synchronization architecture (see also the note under "Kimai to Jira" below).

## Kimai to Jira

1. Kimai calls the Forge web trigger with a signed `timesheet.created` / `timesheet.updated`
   payload.
2. `src/webhooks/kimai-webhook.ts` verifies the HMAC signature before processing anything.
3. `src/sync/kimai-to-jira.ts` creates or updates the mapped Jira worklog.

`timesheet.deleted` is not yet propagated from Kimai to Jira; support will be added once the
corresponding Kimai webhook event is available/reliable.

## Idempotency and loop prevention

- **Idempotency**: `src/sync/idempotency.ts` computes a stable content hash for each change.
  Replayed events with an unchanged hash are skipped (`shouldSkipSyncEvent`).
- **Loop prevention**: Jira worklog events include a `selfGenerated` flag; when set, the event is
  ignored because it was caused by our own Kimai → Jira write. Combined with the persisted
  mapping, this prevents infinite create/update loops between the two systems.

## Conflict resolution

The MVP policy is "last accepted update wins" (`src/sync/conflict-resolution.ts`). Every applied
change is logged with its source, timestamp, previous hash and new hash so a future version can
build a proper conflict-resolution UI without changing the underlying data model.
