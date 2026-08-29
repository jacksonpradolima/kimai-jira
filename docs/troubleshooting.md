# Troubleshooting

## `forge lint` fails with "Not logged in"

Run `npx forge login` with your own (non-production) Atlassian account, or set
`FORGE_EMAIL`/`FORGE_API_TOKEN` environment variables. See [Development](development.md).

## `forge lint` fails with a prompt error in CI ("Prompts can not be meaningfully rendered")

This happens on a first-ever Forge CLI invocation on a machine, because the CLI asks for analytics
consent. Run `npx forge settings set usage-analytics false` before any other `forge` command (the
CI workflow already does this for the optional lint step).

## Kimai webhook requests are rejected with HTTP 401

The signature verification in `src/webhooks/verify-signature.ts` failed. Check that:

- the webhook secret configured in Kimai matches the one shown on the app's admin page;
- Kimai is sending the signature in the expected header (e.g. `X-Kimai-Signature`);
- the secret was not rotated on one side without updating the other.

## Duplicate worklogs/timesheets appear

This should not happen: both sync directions are idempotent based on a content hash
(`src/sync/idempotency.ts`). If you see duplicates, check the structured logs (see
[Synchronization Model](synchronization-model.md)) for the affected `jiraWorklogId` /
`kimaiTimesheetId` and file an issue with the relevant log lines (with secrets redacted).

## External network calls to Kimai are blocked

Forge blocks egress by default. Confirm the Kimai hostname is declared under
`permissions.external.fetch.backend` in `manifest.yml` and redeploy. See
[Kimai Setup](kimai-setup.md).

## Documentation site fails to build

Run `zensical build --clean -f zensical.toml --strict` locally (see [Development](development.md)) to
reproduce the same check used in CI, and fix any reported broken links or invalid Markdown.
