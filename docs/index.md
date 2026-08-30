# Kimai for Jira

**Kimai for Jira** is an open-source [Atlassian Forge](https://developer.atlassian.com/platform/forge/) app
that connects Jira Cloud issues to a self-hosted [Kimai](https://www.kimai.org/) instance.

It brings a Clockify-like experience to Jira, backed by Kimai instead:

- a timer directly inside the Jira issue view;
- manual time entry associated with the current issue;
- two-way synchronization between Jira worklogs and Kimai timesheets;
- user and project/activity mapping;
- secure, signature-verified webhooks and loop prevention.

## Who is this documentation for?

- **Administrators** installing and configuring the app for a Jira site and a Kimai instance —
  start with [Getting Started](getting-started.md) and [Installation](installation.md).
- **Developers** contributing code — start with [Development](development.md) and
  [Architecture](architecture.md).

## UI documentation

The [UI gallery](ui/README.md) is automatically rendered from the production Forge UI Kit views
with deterministic fixtures. It includes implemented states, screen flows, and the command CI uses
to detect stale screenshots.

## Project status

This project is under active development. See the [Architecture](architecture.md) and
[Synchronization Model](synchronization-model.md) pages for the current design, and the
repository's `CHANGELOG.md` for release history.
