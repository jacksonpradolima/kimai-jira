# Development

## Setup

```bash
git clone https://github.com/jacksonpradolima/kimai-jira.git
cd kimai-jira
npm ci
```

No production Forge or Kimai credentials are required for `npm ci`, `npm run lint`,
`npm run typecheck` or `npm test`.

## Registering your own Forge app

The `manifest.yml` in this repository contains a placeholder `app.id`. To develop against your own
Atlassian developer environment:

```bash
npx forge login
npx forge register kimai-for-jira
```

`forge register` updates `manifest.yml` with an app id scoped to your own account — this never
touches the maintainer's production app.

## Deploying to a development environment

```bash
npx forge deploy
```

By default this deploys to the `development` Forge environment. Use `--environment staging` or
`--environment production` for other environments once you control them.

## Installing on a demo site

```bash
npx forge install --demo-site
```

This creates (or reuses) a disposable Atlassian site for testing, so you never need access to a
real company Jira site during development.

## Live reload while developing the UI/resolvers

```bash
npx forge tunnel
```

## Linting Forge-specific issues

```bash
npx forge lint
```

`forge lint` requires being logged in to *some* Atlassian account (see `npx forge login`), but
never requires the maintainer's production credentials. CI runs this step only when a dedicated,
non-production CI account's credentials are available as repository secrets, and treats failures
as non-blocking for pull requests that don't have access to those secrets (e.g. from forks).

## Repository structure

See [Architecture](architecture.md#source-layout).

## Working on the documentation

Documentation lives under `/docs` and is built with [Zensical](https://zensical.org/) from
`zensical.toml`.

```bash
pip install -r docs/requirements.txt
zensical serve -f zensical.toml
```

This serves the docs locally with live reload. To reproduce the CI check:

```bash
zensical build -f zensical.toml --clean --strict
```

The generated `site/` output is git-ignored and must never be committed.

## Commit workflow

```mermaid
flowchart LR
  fork[Fork] --> branch[Branch] --> pullRequest[Pull Request] --> ci[CI] --> review[Review] --> merge[Merge]
```

Deployment to any real Forge installation is a separate, maintainer-triggered GitHub Actions
workflow (`.github/workflows/deploy.yml`) and never runs automatically from a pull request.
