[![Documentation](https://img.shields.io/badge/Docs-Kimai%20for%20Jira-3D9970?style=flat-square)](https://jacksonpradolima.github.io/kimai-jira/)
[![CI](https://github.com/jacksonpradolima/kimai-jira/actions/workflows/ci.yml/badge.svg)](https://github.com/jacksonpradolima/kimai-jira/actions/workflows/ci.yml)
[![Documentation workflow](https://github.com/jacksonpradolima/kimai-jira/actions/workflows/docs.yml/badge.svg)](https://github.com/jacksonpradolima/kimai-jira/actions/workflows/docs.yml)
[![Release](https://github.com/jacksonpradolima/kimai-jira/actions/workflows/release.yml/badge.svg)](https://github.com/jacksonpradolima/kimai-jira/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/jacksonpradolima/kimai-jira?display_name=tag&sort=semver&style=flat-square)](https://github.com/jacksonpradolima/kimai-jira/releases)
[![Node.js 22](https://img.shields.io/badge/node-22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Atlassian Forge](https://img.shields.io/badge/Atlassian-Forge-1868DB?style=flat-square&logo=atlassian&logoColor=white)](https://developer.atlassian.com/platform/forge/)
[![License](https://img.shields.io/github/license/jacksonpradolima/kimai-jira?style=flat-square)](LICENSE)

# Kimai for Jira

Open-source [Atlassian Forge](https://developer.atlassian.com/platform/forge/) app that
integrates Jira Cloud worklogs with a self-hosted [Kimai](https://www.kimai.org/) instance:
a timer and manual time entry inside the Jira issue view, with two-way synchronization between
Jira worklogs and Kimai timesheets.

Full documentation (installation, configuration, architecture, development, security, ...) lives
under [`/docs`](docs/index.md) and is published at
<https://jacksonpradolima.github.io/kimai-jira/>.

## Run locally, test in Forge, and install for your company

```bash
git clone https://github.com/jacksonpradolima/kimai-jira.git
cd kimai-jira
npm ci
npm run lint
npm run typecheck
npm test
```

These checks do not require Forge credentials or access to a real Kimai/Jira site. The complete,
step-by-step guide covers registering your own Forge app, deploying to a disposable demo Jira
site, testing Kimai synchronization, installing in a company Jira site, and configuring users:

[Deployment: local, Forge, and company rollout](docs/deployment.md)

The short version for a personal development site is:

```bash
npx forge login
npx forge register kimai-for-jira-dev
npx forge site provision
npx forge deploy --environment development
npx forge install --environment development --demo-site
```

`forge site provision` must finish before `--demo-site` can install the app. If demo-site
provisioning is temporarily unavailable, use a separate traditional Jira Cloud development site
with `--site`; the full fallback is in the [deployment guide](docs/deployment.md#3-deploy-and-test-on-a-forge-demo-jira-site).

## UI Preview

The UI gallery is generated from the same Forge UI Kit view components used by the app. See
[the complete UI documentation](docs/ui/README.md) for every state and regeneration details.

| Running timer | Administration |
| --- | --- |
| ![Running Kimai timer](docs/ui/generated/issue-timer-running.png) | ![Kimai administration](docs/ui/generated/admin-configuration.png) |

## Status

Early-stage, MVP-focused. See [`docs/architecture.md`](docs/architecture.md) and
[`docs/synchronization-model.md`](docs/synchronization-model.md) for the current design, and
[`CHANGELOG.md`](CHANGELOG.md) for release history.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Security

See [`SECURITY.md`](SECURITY.md).

## License

[MIT](LICENSE)
