# Privacy Policy

**Effective date:** 31 August 2026

Kimai for Jira synchronizes Jira Cloud worklogs and a configured Kimai instance. This
policy explains the data the app handles when it is installed on a Jira site.

## Who operates the app

The organization that installs and operates the app is referred to in this policy as
the **operator**, **we**, or **us**. The operator decides who is authorized to use the
app and is responsible for configuring its Jira site and Kimai instance.

For privacy requests or questions, contact your organization's administrator or use the
support contact shown on the app's installation page.

## Information the app handles

To provide time-tracking synchronization, the app handles:

- Jira account IDs, issue identifiers/keys, worklog identifiers, authors, dates,
  durations, and worklog comments;
- Kimai user IDs, timesheet identifiers, dates, durations, project/activity IDs, and
  timesheet descriptions;
- mappings between the related Jira worklogs and Kimai timesheets;
- each user's Kimai API token; and
- a site-wide Kimai webhook secret.

The app does not request a user's Kimai password. It does not intentionally collect
payment-card information, advertising identifiers, or precise location data.

## How information is used

We use this information only to authenticate a user to Kimai, show and manage that
user's timers, and create, update, or correlate worklogs and timesheets between Jira
and Kimai. The app also uses the data to prevent duplicate synchronization and to
investigate operational failures.

## Storage and sharing

The app runs on Atlassian Forge. Personal Kimai API tokens and the Kimai webhook
secret are stored with Forge's encrypted secret storage. Synchronization mappings and
site configuration are stored in Forge app storage.

The app sends the minimum relevant worklog or timesheet data between Jira Cloud and
the configured Kimai server. We do not sell this data or disclose it to advertising
providers. Atlassian, Jira Cloud, Forge, and the configured Kimai service process
information as needed to provide their respective services.

## Retention and deletion

Information remains in Jira and Kimai according to the operator's retention settings.
App-stored mappings and configuration remain while the app is installed and may be
removed when the app is uninstalled. A user can remove their own Kimai API token using
**Reset API key** in the Kimai panel. A Jira administrator can rotate the webhook
secret and manage site-wide configuration.

## Security

The app uses Atlassian Forge's platform controls and encrypted secret storage for
tokens and webhook secrets. No security control is absolute; users must protect their
Jira and Kimai accounts and promptly report suspected unauthorized access to the
operator.

## Changes

We may update this policy when the app or its data handling changes. The current
version is published with the app documentation.
