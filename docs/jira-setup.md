# Jira Setup

## Supported editions

The app targets **Jira Cloud Standard** (and above).

## Required scopes

The app requests the following scopes (declared in `manifest.yml`):

| Scope | Purpose |
|---|---|
| `read:jira-work` | Read issues and worklogs to display the timer panel and detect changes. |
| `write:jira-work` | Create/update worklogs when syncing from Kimai. |
| `storage:app` | Persist configuration, mappings and secrets in Forge storage. |

## Installing on a test site

Use a free Atlassian developer site rather than a production Jira instance while developing:

```bash
npx forge site provision
npx forge install --demo-site
```

Wait for provisioning to finish before installation. If the demo-site pool is temporarily
unavailable, install on a separate traditional development site instead:

```bash
npx forge install --site your-dev-site.atlassian.net --product jira
```

See [the deployment guide](deployment.md#3-deploy-and-test-on-a-forge-demo-jira-site) for the
safe fallback and retry steps.

## Where the app appears

- **Issue view**: a `Kimai` panel is added to the right-hand sidebar (`jira:issueContext`) for
  Manual time entries.
- **Jira administration**: a `Kimai Integration` admin page (`jira:adminPage`) for the shared
  Kimai endpoint, defaults, and webhook settings. Users manage their own Kimai API token from the
  issue panel.

## Worklog events

The app subscribes to:

```text
avi:jira:created:worklog
avi:jira:updated:worklog
avi:jira:deleted:worklog
```

These trigger the `jira-to-kimai` synchronization path described in
[Synchronization Model](synchronization-model.md).
