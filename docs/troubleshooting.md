# Troubleshooting

## Jira shows “Allow access” for the Kimai panel

The **Allow access** card is an Atlassian Forge consent screen, not a Kimai API-token
prompt or an installation failure. It can appear the first time a person opens the
Kimai panel because the app uses that person's Jira permissions to read or create
worklogs. The person should select **Allow access**, review the permissions shown by
Atlassian, and then reload the Jira issue.

The consent is per Atlassian account and app. It can be requested again after an app
upgrade that adds or changes Jira permissions. A Jira administrator must approve any
required Forge upgrade before users can grant the newly requested access; see
[Updating an existing company installation](deployment.md#updating-an-existing-company-installation).

Do not confuse this with **Manage Kimai connection**. Allowing access authorizes the
Forge app to act within Jira as that user; **Manage Kimai connection** is where that
user saves their personal Kimai API token.

## Jira says “You don't have access to this app” and “This application is in development”

This message means the Jira site is displaying a Forge **development** deployment to
a person who is not allowed to use it. It is not fixed by repeatedly selecting
**Allow access**, changing the Kimai token, or granting more Jira project permissions.

For local/development testing, use the same Atlassian account that owns the Forge app,
or have the app owner add the tester as a contributor in the Forge developer console.
Confirm that the app was deployed and installed to the intended development test site:

```bash
npx forge deploy --environment development
npx forge install --environment development --site your-dev-site.atlassian.net --product jira --upgrade
```

Do not give ordinary company users access to a development installation. To make Kimai
available to company users, deploy and share the **production** environment as
described in [Deploy and share the company production app](deployment.md#5-deploy-and-share-the-company-production-app).
If people who are not Forge contributors need to use an app that is being shared from
the developer console, the app owner must also enable **Distribution → Sharing** and
have the Jira site administrator install the generated distribution link. Atlassian's
[Forge distribution guide](https://developer.atlassian.com/platform/forge/distribute-your-apps/)
explains that sharing requirement.

## `forge lint` fails with "Not logged in"

Run `npx forge login` with your own (non-production) Atlassian account, or set
`FORGE_EMAIL`/`FORGE_API_TOKEN` environment variables. See [Development](development.md).

## `forge lint` fails with a prompt error in CI ("Prompts can not be meaningfully rendered")

This happens on a first-ever Forge CLI invocation on a machine, because the CLI asks for analytics
consent. Run `npx forge settings set usage-analytics false` before any other `forge` command (the
CI workflow already does this for the optional lint step).

## `forge install --demo-site` says "No demo site found"

`--demo-site` installs to an already active Forge demo site; it does not make a missing site
available when provisioning is unavailable. Run:

```bash
npx forge site provision
```

Wait until the CLI reports the site is ready, then rerun the install command. `--upgrade` only
upgrades an existing installation and does not resolve this error.

If provisioning reports that it is temporarily unavailable, retry later—the site request may be
continuing in the background. If the demo-site service remains unavailable, create a separate
traditional [Atlassian Cloud development site](https://go.atlassian.com/cloud-dev) and install
there instead:

```bash
npx forge install --environment development --site your-dev-site.atlassian.net --product jira
```

Do not use a production company Jira site for this fallback. See [Deployment](deployment.md#demo-site-provisioning-is-unavailable).

## Kimai webhook requests are rejected with HTTP 401

The signature verification in `src/webhooks/verify-signature.ts` failed. Check that:

- the webhook secret configured in Kimai matches the one shown on the app's admin page;
- Kimai is sending the signature in the expected header (e.g. `X-Kimai-Signature`);
- the secret was not rotated on one side without updating the other.

## Duplicate worklogs/timesheets appear

This should not happen: both sync directions are idempotent based on a content hash
(`src/sync/idempotency.ts`). If you see duplicates, check the structured logs (see
[Synchronization Model](synchronization-model.md)) for the affected `jiraWorklogId` /
`kimaiTimesheetId` and file an issue with the relevant log lines (with secrets redacted).

## External network calls to Kimai are blocked

Forge blocks egress by default. Confirm the Kimai hostname is declared under
`permissions.external.fetch.backend` in `manifest.yml` and redeploy. See
[Kimai Setup](kimai-setup.md).

## Documentation site fails to build

Run `zensical build --clean -f zensical.toml --strict` locally (see [Development](development.md)) to
reproduce the same check used in CI, and fix any reported broken links or invalid Markdown.
