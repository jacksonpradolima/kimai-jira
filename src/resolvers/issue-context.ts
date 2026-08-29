import Resolver from '@forge/resolver';
import { HttpKimaiClient } from '../kimai/client';
import { getKimaiConfig } from '../storage/config';
import { getKimaiApiToken } from '../storage/secrets';
import { getUserMapping } from '../storage/users';
import { toSafeUserMessage } from '../shared/errors';

const resolver = new Resolver();

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

  const issueKey = (request.payload as { issueKey?: string }).issueKey;
  let runningTimesheet: { id: number } | undefined;
  if (userMapping?.enabled && issueKey) {
    try {
      const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
      const activeTimesheets = await client.getActiveTimesheets(userMapping.kimaiUserId);
      const issueMarker = `[${issueKey}]`;
      const active = activeTimesheets.find((timesheet) =>
        timesheet.description?.startsWith(issueMarker),
      );
      runningTimesheet = active ? { id: active.id } : undefined;
    } catch {
      // Keep the issue panel available when active-timer lookup is unavailable.
    }
  }

  return {
    configured: true,
    kimaiUrl: config.url,
    defaultProjectId: config.defaultProjectId,
    defaultActivityId: config.defaultActivityId,
    runningTimesheet,
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

  try {
    const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
    const { project, activity, description } = request.payload as {
      project: number;
      activity: number;
      description?: string;
    };
    const timesheet = await client.startTimer({
      project,
      activity,
      description,
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
  if (!config || !apiToken) {
    return { ok: false, error: 'Kimai is not configured yet.' };
  }

  try {
    const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
    const { timesheetId } = request.payload as { timesheetId: number };
    const timesheet = await client.stopTimer(timesheetId);
    return { ok: true, timesheet };
  } catch (error) {
    return { ok: false, error: toSafeUserMessage(error) };
  }
});

export const handler = resolver.getDefinitions();
