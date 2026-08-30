# Configuration

The current admin page (`jira:adminPage`) exposes only site-wide settings. Personal user tokens are
configured from the Kimai issue panel and are never visible to a site administrator.

## Connection

- **Kimai URL** — base URL of the Kimai instance and shared endpoint used to validate personal user tokens.

## Defaults

- **Default Kimai project ID** — used for Jira → Kimai syncs when a worklog is created without a
  project override.
- **Default Kimai activity ID** — used alongside the default project for Jira → Kimai syncs.

## Personal user connection

Each user opens **Manage Kimai connection** in an issue's Kimai panel and enters their own API
token. Forge validates the token with `GET /api/users/me`, stores the token in the encrypted Secret
Store under that Jira account, and automatically records the returned Kimai user ID. Users can use
**Reset API key** to remove only their own token and mapping.

## Manual time entry

The **Manual** tab creates a Kimai timesheet using the selected Kimai customer and the
issue-derived project/activity. Its description is prefilled as `[ISSUE-KEY] Issue summary` (for
example, `[KJ-142] Implement Jira/Kimai synchronization`), while the user can edit it along with
date, start/end time, a read-only total duration calculated from that period, individual tags,
and billable status. Add a tag to turn it into a removable tag chip; duplicate tags are ignored.

## Webhook secret

Use **Generate webhook secret** in the admin page before configuring the Kimai webhook. The
generated value is displayed once and stored in the Forge Secret Store for signature verification.

Full sync toggles remain planned and are not yet exposed in this admin UI.

## What is never stored in plain configuration

- Personal Kimai API tokens
- Kimai webhook secrets
- Any Jira/Atlassian credentials

These always go through the Forge Secret Store (`kvs.setSecret` / `kvs.getSecret`).
