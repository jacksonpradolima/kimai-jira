# Testing

## Running the test suite

```bash
npm test
```

Tests use Jest with `ts-jest`, live under `tests/unit/`, and never require network access, a real
Jira site or a real Kimai instance.

## What is unit tested

- **Duration/date conversion** — `tests/unit/validation.test.ts`
- **Idempotency and mapping merges** — `tests/unit/idempotency.test.ts`
- **Webhook signature verification** — `tests/unit/verify-signature.test.ts`
- **Loop prevention (`selfGenerated`) and duplicate suppression** —
  `tests/unit/jira-to-kimai.test.ts`
- **Issue key resolution from Kimai timesheet payloads** —
  `tests/unit/resolve-issue-key.test.ts`

## Writing new tests

- Place unit tests under `tests/unit/`, mirroring the `src/` module they cover.
- Mock Forge-provided modules (`@forge/kvs`, `@forge/api`) with `jest.mock(...)` rather than
  calling out to a real Forge runtime; see `tests/unit/jira-to-kimai.test.ts` for an example that
  mocks `src/storage/mappings.ts`.
- Prefer testing the `sync/*` and `webhooks/verify-signature.ts` modules directly, since they hold
  the synchronization policy described in [Synchronization Model](synchronization-model.md).

## Manual end-to-end test

Once deployed to a demo site (see [Development](development.md)):

1. Open a Jira issue and start the Kimai timer.
2. Wait, then stop the timer.
3. Verify the timesheet was created in Kimai and, once created, that a Jira worklog is created.
4. Edit the Jira worklog and verify Kimai updates.
5. Edit the Kimai timesheet and verify Jira updates.
6. Replay the same Kimai webhook payload and verify no duplicate worklog is created.
