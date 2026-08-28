# Configuration

The admin page (`jira:adminPage`) exposes the following settings, all persisted through
`src/storage/config.ts` and `src/storage/secrets.ts`:

## Connection

- **Kimai URL** — base URL of the Kimai instance.
- **API Token** — stored via `kvs.setSecret`, never returned to the browser once saved.
- **Test Connection** — calls `GET /api/users/me` on Kimai to validate the configuration.

## Synchronization

- Jira → Kimai (on/off)
- Kimai → Jira (on/off)
- Allow create / update / delete (delete is off by default; see
  [Synchronization Model](synchronization-model.md))

## Timer

- Enable/disable the issue timer panel.
- Automatically create a Jira worklog when a timer is stopped.

## Defaults

- Default Kimai project and activity, used when a worklog event does not specify one.
- Default billable flag for manual entries.

## Webhook

- The generated Forge web trigger URL for incoming Kimai webhooks.
- A rotatable webhook secret, used to verify Kimai's HMAC signature
  (`src/webhooks/verify-signature.ts`).

## What is never stored in plain configuration

- Kimai API tokens
- Kimai webhook secrets
- Any Jira/Atlassian credentials

These always go through the Forge Secret Store (`kvs.setSecret` / `kvs.getSecret`).
