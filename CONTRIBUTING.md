# Contributing

Thanks for considering a contribution to Kimai for Jira!

## Workflow

```text
Fork -> Branch -> Pull Request -> CI -> Review -> Merge
```

You do **not** need access to the maintainer's production Jira site or production Forge
credentials to contribute. All required checks run locally and in CI without them.

## Getting set up

```bash
git clone https://github.com/<your-fork>/kimai-jira.git
cd kimai-jira
npm ci
```

## Before opening a pull request

Run the same checks CI runs:

```bash
npm run lint
npm run typecheck
npm test
```

If you want to also exercise Forge-specific validation, run `npx forge lint` against your own
(non-production) Atlassian developer account — see [docs/development.md](docs/development.md).

## Testing against a real Forge/Jira/Kimai environment

Use your own free Atlassian developer account and a disposable demo site:

```bash
npx forge login
npx forge register kimai-for-jira
npx forge deploy
npx forge install --demo-site
```

## Code organization

Please keep the separation between `src/jira/`, `src/kimai/` and `src/sync/` intact: neither
Jira- nor Kimai-specific code should implement synchronization policy directly. See
[docs/architecture.md](docs/architecture.md).

## Security

Never commit credentials, tokens, or production URLs containing credentials. See
[`SECURITY.md`](SECURITY.md) for how to report vulnerabilities privately.

## Deployment

Deployment to any real Forge installation happens through a separate, maintainer-triggered
workflow (`.github/workflows/deploy.yml`). Pull requests never trigger a deployment.
