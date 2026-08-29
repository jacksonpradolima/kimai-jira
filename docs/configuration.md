# Configuration

The current admin page (`jira:adminPage`) exposes the settings that are implemented today and stores
all non-secret values through `src/storage/config.ts` and `src/storage/secrets.ts`:

## Connection

- **Kimai URL** — base URL of the Kimai instance.
- **API Token** — stored via the Forge Secret Store, never returned to the browser after saving.
- **Test Connection** — calls `GET /api/users/me` on Kimai to validate the configuration.

## Defaults

- **Default Kimai project ID** — used for Jira → Kimai syncs when a worklog is created without a
  project override.
- **Default Kimai activity ID** — used alongside the default project for Jira → Kimai syncs.

The broader config surface in earlier docs (full sync toggles, webhook URL/secret management, and
per-user mappings) is still planned and not yet exposed in this admin UI.

## What is never stored in plain configuration

- Kimai API tokens
- Kimai webhook secrets
- Any Jira/Atlassian credentials

These always go through the Forge Secret Store (`kvs.setSecret` / `kvs.getSecret`).
