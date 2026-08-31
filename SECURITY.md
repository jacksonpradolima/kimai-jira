# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not** open a public GitHub
issue. Instead, report it privately using GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
feature for this repository (Security tab → "Report a vulnerability").

Please include:

- a description of the vulnerability and its potential impact;
- steps to reproduce it;
- any relevant logs (with secrets/tokens redacted).

We will acknowledge your report and work with you on a fix and coordinated disclosure timeline.

## Supported Versions

This project is pre-1.0 and under active development. Security fixes are applied to the `main`
branch; there is currently no separate long-term-support branch.

## Credential Handling

- Kimai API tokens and the Kimai webhook secret are always stored in the Forge encrypted Secret
  Store (`kvs.setSecret` / `kvs.getSecret`), never in plain KVS storage or in Git.
- `.env` files are git-ignored; only `.env.example` (with empty values) is committed.
- No Jira or Kimai credentials, and no production URLs containing credentials, are ever committed
  to this repository.
- Incoming Kimai webhook requests are verified with an HMAC-SHA256 signature using a
  constant-time comparison before any data is processed.

See [`docs/security.md`](docs/security.md) for more detail.
