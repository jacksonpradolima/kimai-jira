# Security

## Reporting a vulnerability

See `SECURITY.md` in the repository root for how to privately report a security issue.

## Credential handling

- Kimai API tokens and the Kimai webhook secret are stored using the Forge encrypted Secret Store
  (`kvs.setSecret` / `kvs.getSecret`), never in plain KVS storage, environment variables committed
  to Git, or the app's frontend bundle.
- `.env` is git-ignored; only `.env.example` (with empty values) is committed.
- No Jira/Atlassian credentials, Kimai credentials, or production URLs containing credentials are
  ever committed to this repository.

## Webhook authentication

Forge web trigger URLs are publicly reachable without Atlassian authentication. Every incoming
Kimai webhook request is verified against an HMAC-SHA256 signature
(`src/webhooks/verify-signature.ts`) using a constant-time comparison before any data is written.
Requests that fail verification are rejected with HTTP 401 and are not processed further.

## Logging

Structured logs (`src/shared/logger.ts`) redact known secret-shaped fields (tokens, authorization
headers, webhook secrets) and never include raw provider error bodies or stack traces in
user-facing responses (`src/shared/errors.ts`).

## CI and deployment isolation

- Pull request validation (`.github/workflows/ci.yml`) never deploys the app and never requires
  production Forge credentials.
- Deployment (`.github/workflows/deploy.yml`) is a separate, manually-triggered workflow gated
  behind a GitHub Environment, so it can only be run by a trusted maintainer with the appropriate
  secrets configured.
