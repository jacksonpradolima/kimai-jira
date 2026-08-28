# Getting Started

This page gets a new contributor or administrator up and running quickly.

## Prerequisites

- Node.js 18+ (Node 22 is used in CI)
- npm
- A free [Atlassian developer account](https://developer.atlassian.com/platform/forge/getting-started/)
  (this is **not** the same as access to any production/company Jira site)
- The [Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/#install-forge)
  (installed automatically as a dev dependency via `npm ci`)

## Clone and install

```bash
git clone https://github.com/jacksonpradolima/kimai-jira.git
cd kimai-jira
npm ci
```

## Validate the project locally

These commands never require production Forge or Kimai credentials:

```bash
npm run lint
npm run typecheck
npm test
```

## Run against your own Forge developer environment

`forge lint`, `forge deploy` and `forge install` need *a* Atlassian account, but never the
production one used by the maintainer's real Jira site. See [Development](development.md) for the
full `forge register` / `forge deploy` / `forge install --demo-site` walkthrough.

```bash
npx forge login
npx forge register kimai-for-jira
npx forge deploy
npx forge install --demo-site
```

## Next steps

- Administrators: continue to [Installation](installation.md).
- Contributors: continue to [Development](development.md).
