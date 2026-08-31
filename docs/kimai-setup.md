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

This setup is only required for **Kimai → Jira** synchronization. It is not needed to add time from
Jira or to use the timer.

Kimai's standard installation does **not** include an outgoing-webhook settings page. The `/api/doc`
page documents Kimai's REST API; it is not a webhook configuration screen. To use this direction,
your Kimai administrator must install or maintain an outgoing-webhook plugin, a Symfony event
listener, or an integration service that observes Kimai timesheet changes.

### Native webhooks in Kimai 3.0

Native outgoing webhooks are planned for Kimai 3.0 (currently a draft release). When that version
is released and installed, it is an alternative to a plugin or custom integration: configure its
webhook endpoint with the values below. Track the upstream implementation and its eventual
configuration instructions in [Kimai pull request #5756](https://github.com/kimai/kimai/pull/5756).
Until then, the current Kimai UI has no native place to enter this secret.

Configure that Kimai extension or service with these values:

| Setting | Value |
| --- | --- |
| Destination URL | The Forge webhook URL displayed on the Jira app administration page |
| Method | `POST` |
| Events | `timesheet.created` and `timesheet.updated` |
| Shared secret / signing key | The value produced by **Generate webhook secret** in Jira |
| Signature header | `X-Kimai-Signature` |
| Signature | `sha256=` followed by the HMAC-SHA256 hex digest of the **raw** JSON request body, using the shared secret |
| Request body | `{ "event": "timesheet.created" | "timesheet.updated", "payload": { ...timesheet } }` |

If there is no webhook extension or integration service in your Kimai installation, there is nowhere
in the stock Kimai UI to paste the secret. Install/configure one first, then enter the secret in that
extension's **secret**, **signing key**, or equivalent field. The exact menu location depends on the
extension your Kimai instance uses.

Keep the secret private. If it is regenerated in Jira, update the matching secret in the Kimai
extension immediately; requests signed with the old value are rejected.

Delete events are not yet supported by the Kimai → Jira direction; see
[Synchronization Model](synchronization-model.md#kimai-to-jira) for the current status.
