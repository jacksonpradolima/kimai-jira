import Resolver from '@forge/resolver';
import { HttpKimaiClient } from '../kimai/client';
import { getKimaiConfig } from '../storage/config';
import { getKimaiApiToken } from '../storage/secrets';
import { getUserMapping } from '../storage/users';
import { toSafeUserMessage } from '../shared/errors';

const resolver = new Resolver();

function getTrustedIssueKey(context: Record<string, unknown>): string | undefined {
  const extension = context.extension as { issue?: { key?: unknown } } | undefined;
  const issueKey = extension?.issue?.key;
  return typeof issueKey === 'string' && issueKey ? issueKey : undefined;
}

/**
 * Returns today's tracked time summary for the current issue context, used
 * to render the `jira:issueContext` panel.
 */
resolver.define('getIssueTimerState', async (request) => {
  const config = await getKimaiConfig();
  const apiToken = await getKimaiApiToken();
  const accountId = request.context.accountId as string | undefined;
  const userMapping = accountId ? await getUserMapping(accountId) : undefined;
  if (!config || !apiToken) {
    return { configured: false };
  }

  const issueKey = getTrustedIssueKey(request.context as Record<string, unknown>);
  let runningTimesheet: { id: number; begin: string } | undefined;
  let timerUnavailable = false;
  if (userMapping?.enabled && issueKey) {
    try {
      const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
      const activeTimesheets = await client.getActiveTimesheets(userMapping.kimaiUserId);
      const issueMarker = `[${issueKey}]`;
      const active = activeTimesheets.find((timesheet) =>
        timesheet.description?.startsWith(issueMarker),
      );
      runningTimesheet = active ? { id: active.id, begin: active.begin } : undefined;
    } catch {
      timerUnavailable = true;
    }
  }

  return {
    configured: true,
    kimaiUrl: config.url,
    defaultProjectId: config.defaultProjectId,
    defaultActivityId: config.defaultActivityId,
    runningTimesheet,
    timerUnavailable,
  };
});

resolver.define('startTimer', async (request) => {
  const config = await getKimaiConfig();
  const apiToken = await getKimaiApiToken();
  const accountId = request.context.accountId as string | undefined;
  const userMapping = accountId ? await getUserMapping(accountId) : undefined;
  if (!config || !apiToken) {
    return { ok: false, error: 'Kimai is not configured yet.' };
  }
  if (!userMapping?.enabled) {
    return { ok: false, error: 'No enabled Kimai user mapping exists for this Jira user.' };
  }
  const issueKey = getTrustedIssueKey(request.context as Record<string, unknown>);
  if (!config.defaultProjectId || !config.defaultActivityId || !issueKey) {
    return { ok: false, error: 'This issue timer requires Kimai defaults and an issue context.' };
  }

  try {
    const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
    const timesheet = await client.startTimer({
      project: config.defaultProjectId,
      activity: config.defaultActivityId,
      description: `[${issueKey}] Jira issue timer`,
      user: userMapping.kimaiUserId,
    });
    return { ok: true, timesheet };
  } catch (error) {
    return { ok: false, error: toSafeUserMessage(error) };
  }
});

resolver.define('stopTimer', async (request) => {
  const config = await getKimaiConfig();
  const apiToken = await getKimaiApiToken();
  const accountId = request.context.accountId as string | undefined;
  const userMapping = accountId ? await getUserMapping(accountId) : undefined;
  if (!config || !apiToken) {
    return { ok: false, error: 'Kimai is not configured yet.' };
  }
  if (!userMapping?.enabled) {
    return { ok: false, error: 'No enabled Kimai user mapping exists for this Jira user.' };
  }

  try {
    const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
    const { timesheetId } = request.payload as { timesheetId: number };
    const activeTimesheet = await client.getTimesheet(timesheetId);
    if (activeTimesheet.user !== userMapping.kimaiUserId) {
      return { ok: false, error: 'You can only stop your own Kimai timer.' };
    }
    const timesheet = await client.stopTimer(timesheetId);
    return { ok: true, timesheet };
  } catch (error) {
    return { ok: false, error: toSafeUserMessage(error) };
  }
});

export const handler = resolver.getDefinitions();
