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

## Quick start (development)

```bash
git clone https://github.com/jacksonpradolima/kimai-jira.git
cd kimai-jira
npm ci
npm run lint
npm run typecheck
npm test
```

None of the above require production Forge credentials or access to a real Kimai/Jira site. To
run the app against your own free Atlassian developer environment, see
[docs/development.md](docs/development.md):

```bash
npx forge login
npx forge register kimai-for-jira
npx forge deploy
npx forge install --demo-site
```

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
