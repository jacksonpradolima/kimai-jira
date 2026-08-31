# Installation

Installation has two distinct paths. Test first on a personal Forge demo site, then deploy the
company app to Forge production and install it on the company Jira site. The detailed guide is
[Deployment: local, Forge, and company rollout](deployment.md).

## Company installation summary

From a company-owned Forge app, after setting the production Kimai hostname in `manifest.yml`:

```bash
npx forge deploy --environment production
npx forge install --environment production --site your-company.atlassian.net --product jira
```

The installer must be a Jira site administrator (or have the required Forge installation
permission). Review the requested scopes before confirming.

After installation, the Jira administrator opens **Jira administration → Apps → Kimai
Integration** to set the Kimai URL and optional defaults, generates the Kimai webhook secret, and
gives the URL/secret to the Kimai administrator. Each user then opens an issue's **Kimai** panel
and uses **Manage Kimai connection** to store their own personal Kimai API token.

See [Configuration](configuration.md) for what each setting does and [Kimai Setup](kimai-setup.md)
for the webhook setup.
