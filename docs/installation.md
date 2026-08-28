# Installation

## 1. Register the app in your own Forge environment

```bash
npx forge register kimai-for-jira
```

This creates (or attaches) a Forge app under your own Atlassian developer account and updates the
placeholder `app.id` in `manifest.yml`.

## 2. Deploy to a Forge environment

```bash
npx forge deploy
```

## 3. Install on a Jira site

For evaluation, install on a disposable Atlassian demo site instead of a real company site:

```bash
npx forge install --demo-site
```

To install on a specific existing site instead:

```bash
npx forge install --site your-site.atlassian.net --product jira
```

## 4. Configure the Kimai connection

Once installed, open **Jira administration → Apps → Kimai Integration** and provide:

- the Kimai base URL;
- a Kimai API token (stored using the Forge Secret Store, never written to Git);
- default project/activity and synchronization toggles.

See [Configuration](configuration.md) for details.

## 5. Point Kimai webhooks at the app

After configuration, the admin page shows the Forge web trigger URL. Configure this URL, together
with the generated webhook secret, in your Kimai instance so Kimai timesheet changes flow back
into Jira. See [Kimai Setup](kimai-setup.md).
