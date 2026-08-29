# Kimai Setup

## Requirements

- A self-hosted Kimai instance reachable over HTTPS from Atlassian Forge's runtime.
- A Kimai API token for a user with permission to manage timesheets, projects and activities.

## Declaring egress permissions

Forge blocks outbound requests by default. The Kimai hostname must be declared under
`permissions.external.fetch.backend` in `manifest.yml`:

```yaml
permissions:
  external:
    fetch:
      backend:
        - https://kimai.example.com
```

Replace the placeholder with your real Kimai hostname before deploying. Never commit a URL that
embeds credentials (e.g. `******kimai.example.com`).

## Creating an API token

In Kimai, create a dedicated API user/token for the integration rather than reusing a personal
account. Paste the token into the app's admin page; it is written directly to the Forge Secret
Store and never stored in plain configuration or Git.

## Configuring the webhook

1. Open the app's admin page in Jira and select **Generate webhook secret**. Use the generated
   secret with the Forge webhook URL for this app.
2. In Kimai, configure a webhook that POSTs `timesheet.created` and `timesheet.updated` events to
   that URL.
3. Kimai must sign the request body with the shared secret (e.g. an `X-Kimai-Signature: sha256=...`
   header); the app rejects any request that fails signature verification.

Delete events are not yet supported by the Kimai → Jira direction; see
[Synchronization Model](synchronization-model.md#kimai-to-jira) for the current status.
