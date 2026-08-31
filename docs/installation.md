# Installation

Installation has two distinct paths. Test first on a personal Forge demo site, then deploy the
company app to Forge production and install it on the company Jira site. The detailed guide is
[Deployment: local, Forge, and company rollout](deployment.md).

## Company installation summary

From a company-owned Forge app, after setting the production Kimai hostname in `manifest.yml`:

```bash
npx forge deploy --environment production
```

Then enable **Distribution → Sharing** in the Forge developer console, select **Jira**,
and give the generated installation link to a Jira site administrator. The administrator
opens that link, chooses the company Jira site, and reviews the requested scopes before
confirming. This sharing step is required for ordinary company users who are not Forge
app contributors. See [Deployment](deployment.md#5-deploy-and-share-the-company-production-app)
for the complete procedure, including the privacy-policy and terms URLs required by the
developer console.

After installation, the Jira administrator opens **Jira administration → Apps → Kimai
Integration** to set the Kimai URL and optional defaults, generates the Kimai webhook secret, and
gives the URL/secret to the Kimai administrator. Each user then opens an issue's **Kimai** panel
and uses **Manage Kimai connection** to store their own personal Kimai API token.

See [Configuration](configuration.md) for what each setting does and [Kimai Setup](kimai-setup.md)
for the webhook setup.
