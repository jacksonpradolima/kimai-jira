# Kimai Setup

## Requirements

- A self-hosted Kimai instance reachable over HTTPS from Atlassian Forge's runtime.
- A Kimai API token for each Jira user who will track or synchronize their own work. Tokens need
  permission to manage that user's timesheets and, when timer provisioning is enabled, projects and
  activities.

## Declaring egress permissions

Forge blocks outbound requests by default. The Kimai hostname must be declared under
`permissions.external.fetch.backend` in `manifest.yml`:

```yaml
permissions:
  external:
    fetch:
      backend:
        - address: https://kimai.example.com
```

Replace the placeholder with your real Kimai hostname before deploying. Never commit a URL that
embeds credentials (e.g. `******kimai.example.com`).

## Creating an API token

Each person creates their own Kimai API token and enters it through **Manage Kimai connection** in
the Kimai issue panel. The app validates the token against Kimai, identifies that user from
`/api/users/me`, and writes it directly to the Forge Secret Store. It is never stored in plain
configuration, Git, or the administration page.

## Configuring the webhook

1. Open the app's admin page in Jira and select **Generate webhook secret**. Use the generated
   secret with the Forge webhook URL for this app.
2. In Kimai, configure a webhook that POSTs `timesheet.created` and `timesheet.updated` events to
   that URL.
3. Kimai must sign the request body with the shared secret (e.g. an `X-Kimai-Signature: sha256=...`
   header); the app rejects any request that fails signature verification.

Delete events are not yet supported by the Kimai → Jira direction; see
[Synchronization Model](synchronization-model.md#kimai-to-jira) for the current status.
