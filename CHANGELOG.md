# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Forge project scaffold: `manifest.yml`, TypeScript configuration, ESLint, Jest unit
  tests, and GitHub Actions CI (`npm ci`, lint, typecheck, test, `forge lint`).
- `jira:issueContext` timer/manual-entry panel and `jira:adminPage` configuration page (UI Kit 2).
- Jira worklog trigger handler and Kimai webhook web trigger, with HMAC signature verification.
- Jira → Kimai and Kimai → Jira synchronization modules with idempotency, loop prevention and a
  "last accepted update wins" conflict-resolution policy.
- Forge KVS-backed storage for configuration, user mappings and worklog/timesheet mappings, with
  credentials stored via the Forge Secret Store.
- Project documentation under `/docs`, built with Zensical and published to GitHub Pages.
- Separate, maintainer-triggered deployment workflow, kept independent of pull-request CI.
