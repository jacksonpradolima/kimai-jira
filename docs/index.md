# Kimai for Jira

**Kimai for Jira** is an open-source [Atlassian Forge](https://developer.atlassian.com/platform/forge/) app
that connects Jira Cloud issues to a self-hosted [Kimai](https://www.kimai.org/) instance.

It runs on [Atlassian Forge](https://developer.atlassian.com/platform/forge/), Atlassian's hosted
platform for Jira Cloud apps. Forge deploys and runs the app; Jira provides the UI and worklog
events; Kimai remains the time-tracking system. New to Forge? Start with
[Deployment](deployment.md#what-atlassian-forge-is).

It brings a Clockify-like experience to Jira, backed by Kimai instead:

- a timer directly inside the Jira issue view;
- manual time entry associated with the current issue;
- two-way synchronization between Jira worklogs and Kimai timesheets;
- user and project/activity mapping;
- secure, signature-verified webhooks and loop prevention.

## Who is this documentation for?

- **Administrators and app owners** installing the app for a Jira site and a Kimai instance —
  start with [Deployment: local, Forge, and company rollout](deployment.md).
- **Developers** contributing code — start with [Development](development.md) and then use the
  end-to-end [deployment guide](deployment.md) to test against Forge.

## UI documentation

The [UI gallery](ui/README.md) is automatically rendered from the production Forge UI Kit views
with deterministic fixtures. It includes implemented states, screen flows, and the command CI uses
to detect stale screenshots.

## Project status

This project is under active development. See the [Architecture](architecture.md) and
[Synchronization Model](synchronization-model.md) pages for the current design, and the
repository's `CHANGELOG.md` for release history.
