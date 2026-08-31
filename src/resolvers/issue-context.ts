import Resolver from '@forge/resolver';
import { HttpKimaiClient, KimaiClient } from '../kimai/client';
import { ForgeJiraClient, JiraIssueDetails } from '../jira/client';
import { getKimaiConfig } from '../storage/config';
import {
  clearPersonalKimaiApiToken,
  getPersonalKimaiApiToken,
  setPersonalKimaiApiToken,
} from '../storage/secrets';
import { deleteUserMapping, getUserMapping, saveUserMapping } from '../storage/users';
import { claimTimerStart, releaseTimerStart } from '../storage/timers';
import {
  claimJiraIssueKimaiTarget,
  getJiraIssueKimaiTarget,
  getJiraProjectCustomerMapping,
  releaseJiraIssueKimaiTarget,
  saveJiraIssueKimaiTarget,
  saveJiraProjectCustomerMapping,
} from '../storage/issue-targets';
import { AppError, toSafeUserMessage } from '../shared/errors';
import {
  deletePendingJiraWorklogCreation,
  recordMapping,
  savePendingJiraWorklogCreation,
} from '../sync/mapping';
import { formatKimaiTimesheetCorrelation } from '../sync/correlation';

const resolver = new Resolver();

function getTrustedIssueKey(context: Record<string, unknown>): string | undefined {
  const extension = context.extension as { issue?: { key?: unknown } } | undefined;
  const issueKey = extension?.issue?.key;
  return typeof issueKey === 'string' && issueKey ? issueKey : undefined;
}

function getCustomerId(payload: unknown): number | undefined {
  const customerId = (payload as { customerId?: unknown } | undefined)?.customerId;
  const parsed = typeof customerId === 'string' ? Number(customerId) : customerId;
  return typeof parsed === 'number' && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function hasCurrentKimaiConnection(
  config: { url: string },
  userMapping: { enabled: boolean; kimaiBaseUrl?: string } | undefined,
): boolean {
  return Boolean(userMapping?.enabled && userMapping.kimaiBaseUrl === config.url);
}

interface ManualTimeEntryPayload {
  customerId?: unknown;
  description?: unknown;
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  duration?: unknown;
  billable?: unknown;
  timezoneOffsetMinutes?: unknown;
}

function timeValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
    throw new AppError('INVALID_MANUAL_TIME', `${label} must use HH:MM.`);
  }
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) {
    throw new AppError('INVALID_MANUAL_TIME', `${label} must use HH:MM.`);
  }
  return value;
}

function dateValue(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('INVALID_MANUAL_DATE', 'Date must use YYYY-MM-DD.');
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError('INVALID_MANUAL_DATE', 'Date must use YYYY-MM-DD.');
  }
  return value;
}

function durationSeconds(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string' || !/^\d{1,3}:\d{2}(:\d{2})?$/.test(value)) {
    throw new AppError('INVALID_MANUAL_DURATION', 'Duration must use HH:MM or HH:MM:SS.');
  }
  const parts = value.split(':').map(Number);
  const [hours, minutes, seconds = 0] = parts;
  if (minutes > 59 || seconds > 59 || hours === 0 && minutes === 0 && seconds === 0) {
    throw new AppError('INVALID_MANUAL_DURATION', 'Duration must be greater than zero.');
  }
  return hours * 3600 + minutes * 60 + seconds;
}

function timestamp(date: string, time: string, timezoneOffsetMinutes: unknown): string {
  if (
    typeof timezoneOffsetMinutes !== 'number'
    || !Number.isInteger(timezoneOffsetMinutes)
    || Math.abs(timezoneOffsetMinutes) > 14 * 60
  ) {
    throw new AppError('INVALID_TIMEZONE_OFFSET', 'Timezone offset is invalid.');
  }
  // Kimai's API accepts an HTML5 local date-time without a timezone suffix.
  // Sending a converted UTC value without `Z` makes Kimai interpret it as a
  // second local time, which can move late-evening entries into the next day.
  return `${date}T${time}:00`;
}

function utcTimestamp(date: string, time: string, timezoneOffsetMinutes: unknown): string {
  if (
    typeof timezoneOffsetMinutes !== 'number'
    || !Number.isInteger(timezoneOffsetMinutes)
    || Math.abs(timezoneOffsetMinutes) > 14 * 60
  ) {
    throw new AppError('INVALID_TIMEZONE_OFFSET', 'Timezone offset is invalid.');
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) + timezoneOffsetMinutes * 60 * 1000)
    .toISOString()
    .slice(0, 19);
}

function addDuration(begin: string, seconds: number): string {
  const beginAsUtc = new Date(`${begin}Z`);
  const end = new Date(beginAsUtc.getTime() + seconds * 1000).toISOString();
  return end.slice(0, 19);
}

function timerProjectName(issue: JiraIssueDetails): string {
  return `${issue.project.key} - ${issue.project.name}`.slice(0, 150);
}

function timerActivityName(issue: JiraIssueDetails): string {
  return `[${issue.key}] ${issue.summary}`.slice(0, 150);
}

async function resolveKimaiCustomerId(
  client: KimaiClient,
  issue: JiraIssueDetails,
  requestedCustomerId: number | undefined,
): Promise<number> {
  const customers = await client.getCustomers();
  if (customers.length === 0) {
    throw new AppError(
      'KIMAI_CUSTOMER_REQUIRED',
      'No Kimai customers are available. Create a customer in Kimai before starting a timer.',
    );
  }

  const projectCustomer = await getJiraProjectCustomerMapping(issue.project.id);
  const kimaiCustomerId = requestedCustomerId ?? projectCustomer?.kimaiCustomerId;
  if (kimaiCustomerId === undefined) {
    throw new AppError('KIMAI_CUSTOMER_REQUIRED', 'Select a Kimai customer before starting a timer.');
  }
  if (!customers.some((customer) => customer.id === kimaiCustomerId)) {
    throw new AppError(
      'KIMAI_CUSTOMER_UNAVAILABLE',
      'The selected Kimai customer is no longer available. Select another customer.',
    );
  }

  return kimaiCustomerId;
}

async function resolveTimerTarget(
  client: KimaiClient,
  issue: JiraIssueDetails,
  kimaiCustomerId: number,
): Promise<{ projectId: number; activityId: number }> {
  const existing = await getJiraIssueKimaiTarget(issue.id);
  if (existing?.kimaiCustomerId === kimaiCustomerId) {
    const [projects, activities] = await Promise.all([
      client.getProjects(), client.getActivities(existing.kimaiProjectId),
    ]);
    if (
      projects.some((project) => project.id === existing.kimaiProjectId && project.customer === kimaiCustomerId)
      && activities.some((activity) => activity.id === existing.kimaiActivityId && activity.project === existing.kimaiProjectId)
    ) {
      return { projectId: existing.kimaiProjectId, activityId: existing.kimaiActivityId };
    }
  }

  const claimed = await claimJiraIssueKimaiTargetWithRetry(issue.id, kimaiCustomerId);
  if (!claimed) throw new AppError('KIMAI_TARGET_BUSY', 'Kimai target setup is busy. Try again shortly.');
  try {
    const afterClaim = await getJiraIssueKimaiTarget(issue.id);
    if (afterClaim?.kimaiCustomerId === kimaiCustomerId) {
      const [projects, activities] = await Promise.all([
        client.getProjects(), client.getActivities(afterClaim.kimaiProjectId),
      ]);
      if (
        projects.some((project) => project.id === afterClaim.kimaiProjectId && project.customer === kimaiCustomerId)
        && activities.some((activity) => activity.id === afterClaim.kimaiActivityId && activity.project === afterClaim.kimaiProjectId)
      ) return { projectId: afterClaim.kimaiProjectId, activityId: afterClaim.kimaiActivityId };
    }

    const projectName = timerProjectName(issue);
    const projects = await client.getProjects();
    const project = projects.find(
      (candidate) => candidate.customer === kimaiCustomerId && candidate.name === projectName,
    ) ?? await client.createProject({ name: projectName, customer: kimaiCustomerId, visible: true });

    const activityName = timerActivityName(issue);
    const activities = await client.getActivities(project.id);
    const activity = activities.find(
      (candidate) => candidate.project === project.id && candidate.name === activityName,
    ) ?? await client.createActivity({ name: activityName, project: project.id, visible: true });

    await Promise.all([
      saveJiraProjectCustomerMapping({
        jiraProjectId: issue.project.id, jiraProjectKey: issue.project.key,
        jiraProjectName: issue.project.name, kimaiCustomerId,
      }),
      saveJiraIssueKimaiTarget({
        jiraIssueId: issue.id, jiraIssueKey: issue.key, kimaiCustomerId,
        kimaiProjectId: project.id, kimaiActivityId: activity.id,
      }),
    ]);

    return { projectId: project.id, activityId: activity.id };
  } finally {
    await releaseJiraIssueKimaiTarget(issue.id, kimaiCustomerId);
  }
}

async function claimJiraIssueKimaiTargetWithRetry(issueId: string, customerId: number): Promise<boolean> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await claimJiraIssueKimaiTarget(issueId, customerId)) return true;
    await new Promise<void>((resolve) => { setTimeout(resolve, 25); });
  }
  return false;
}

/**
 * Returns today's tracked time summary for the current issue context, used
 * to render the `jira:issueContext` panel.
 */
resolver.define('getIssueTimerState', async (request) => {
  const accountId = request.context.accountId as string | undefined;
  const [config, apiToken, userMapping] = await Promise.all([
    getKimaiConfig(),
    accountId ? getPersonalKimaiApiToken(accountId) : Promise.resolve(undefined),
    accountId ? getUserMapping(accountId) : Promise.resolve(undefined),
  ]);
  if (!config) {
    return { configured: false };
  }
  if (!apiToken) {
    return { configured: true, personalTokenConfigured: false };
  }

  const issueKey = getTrustedIssueKey(request.context as Record<string, unknown>);
  let runningTimesheet: { id: number; begin: string } | undefined;
  let timerUnavailable = false;
  let timerSetupError: string | undefined;
  let customers: Array<{ id: number; name: string }> = [];
  let issueSummary: string | undefined;
  let defaultKimaiCustomerId: number | undefined;
  let target:
    | {
        status: 'existing' | 'to-be-created';
        kimaiCustomerId?: number;
        projectId?: number;
        activityId?: number;
        projectName: string;
        activityName: string;
      }
    | undefined;
  if (!hasCurrentKimaiConnection(config, userMapping)) {
    timerSetupError = 'Your Kimai API token needs to be connected again.';
  } else if (!issueKey) {
    timerSetupError = 'Open a Jira issue before starting a timer.';
  } else {
    const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
    try {
      const jiraIssue = await new ForgeJiraClient().getIssueDetails(issueKey);
      issueSummary = jiraIssue.summary;
      const [projectCustomer, issueTarget] = await Promise.all([
        getJiraProjectCustomerMapping(jiraIssue.project.id),
        getJiraIssueKimaiTarget(jiraIssue.id),
      ]);
      defaultKimaiCustomerId = projectCustomer?.kimaiCustomerId ?? issueTarget?.kimaiCustomerId;
      target = issueTarget
        ? {
            status: 'existing',
            kimaiCustomerId: issueTarget.kimaiCustomerId,
            projectId: issueTarget.kimaiProjectId,
            activityId: issueTarget.kimaiActivityId,
            projectName: timerProjectName(jiraIssue),
            activityName: timerActivityName(jiraIssue),
          }
        : {
            status: 'to-be-created',
            projectName: timerProjectName(jiraIssue),
          activityName: timerActivityName(jiraIssue),
        };
    } catch {
      timerUnavailable = true;
    }
    try {
      const loadedCustomers = await client.getCustomers();
      customers = loadedCustomers.map((customer) => ({ id: customer.id, name: customer.name }));
    } catch {
      timerUnavailable = true;
    }
    try {
      const activeTimesheets = await client.getActiveTimesheets(userMapping!.kimaiUserId);
      const active = activeTimesheets.find((timesheet) => timesheet.description?.startsWith(`[${issueKey}]`));
      runningTimesheet = active ? { id: active.id, begin: active.begin } : undefined;
    } catch {
      timerUnavailable = true;
    }
  }

  return {
    configured: true,
    personalTokenConfigured: true,
    connectedKimaiUser: userMapping?.kimaiUsername,
    kimaiUrl: config.url,
    issueKey,
    issueSummary,
    customers,
    defaultKimaiCustomerId,
    target,
    runningTimesheet,
    timerUnavailable,
    timerSetupError,
  };
});

resolver.define('startTimer', async (request) => {
  const accountId = request.context.accountId as string | undefined;
  const [config, apiToken, userMapping] = await Promise.all([
    getKimaiConfig(),
    accountId ? getPersonalKimaiApiToken(accountId) : Promise.resolve(undefined),
    accountId ? getUserMapping(accountId) : Promise.resolve(undefined),
  ]);
  if (!config) {
    return { ok: false, error: 'Kimai is not configured yet.' };
  }
  if (!apiToken) {
    return { ok: false, error: 'Add your personal Kimai API token before starting a timer.' };
  }
  if (!userMapping?.enabled) {
    return { ok: false, error: 'Your Kimai API token needs to be connected again.' };
  }
  const issueKey = getTrustedIssueKey(request.context as Record<string, unknown>);
  if (!issueKey) {
    return { ok: false, error: 'Open a Jira issue before starting a timer.' };
  }

  const startClaimed = await claimTimerStart(userMapping!.kimaiUserId);
  if (!startClaimed) {
    return { ok: false, error: 'A timer start is already in progress for your Kimai account.' };
  }

  try {
    const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
    const issueMarker = `[${issueKey}]`;
    const activeTimesheets = await client.getActiveTimesheets(userMapping!.kimaiUserId);
    const existingTimer = activeTimesheets.find((timesheet) =>
      timesheet.description?.startsWith(issueMarker),
    );
    if (existingTimer) {
      return { ok: true, timesheet: existingTimer };
    }
    if (activeTimesheets.length > 0) {
      return { ok: false, error: 'Stop your active Kimai timer before starting another one.' };
    }
    const jiraIssue = await new ForgeJiraClient().getIssueDetails(issueKey);
    const kimaiCustomerId = await resolveKimaiCustomerId(
      client,
      jiraIssue,
      getCustomerId(request.payload),
    );
    const target = await resolveTimerTarget(client, jiraIssue, kimaiCustomerId);
    const timesheet = await client.startTimer({
      project: target.projectId,
      activity: target.activityId,
      description: `[${issueKey}] Jira issue timer`,
      user: userMapping!.kimaiUserId,
    });
    return { ok: true, timesheet };
  } catch (error) {
    return { ok: false, error: toSafeUserMessage(error) };
  } finally {
    await releaseTimerStart(userMapping!.kimaiUserId);
  }
});

resolver.define('stopTimer', async (request) => {
  const accountId = request.context.accountId as string | undefined;
  const [config, apiToken, userMapping] = await Promise.all([
    getKimaiConfig(),
    accountId ? getPersonalKimaiApiToken(accountId) : Promise.resolve(undefined),
    accountId ? getUserMapping(accountId) : Promise.resolve(undefined),
  ]);
  if (!config) {
    return { ok: false, error: 'Kimai is not configured yet.' };
  }
  if (!apiToken) {
    return { ok: false, error: 'Add your personal Kimai API token before stopping a timer.' };
  }
  if (!hasCurrentKimaiConnection(config, userMapping)) {
    return { ok: false, error: 'Your Kimai API token needs to be connected again.' };
  }

  try {
    const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
    const { timesheetId } = request.payload as { timesheetId: number };
    const activeTimesheet = await client.getTimesheet(timesheetId);
    if (activeTimesheet.user !== userMapping!.kimaiUserId) {
      return { ok: false, error: 'You can only stop your own Kimai timer.' };
    }
    const timesheet = await client.stopTimer(timesheetId);
    return { ok: true, timesheet };
  } catch (error) {
    return { ok: false, error: toSafeUserMessage(error) };
  }
});

resolver.define('createManualTimeEntry', async (request) => {
  const accountId = request.context.accountId as string | undefined;
  const payload = request.payload as ManualTimeEntryPayload;
  const [config, apiToken, userMapping] = await Promise.all([
    getKimaiConfig(),
    accountId ? getPersonalKimaiApiToken(accountId) : Promise.resolve(undefined),
    accountId ? getUserMapping(accountId) : Promise.resolve(undefined),
  ]);
  if (!config) {
    return { ok: false, error: 'Kimai is not configured yet.' };
  }
  if (!apiToken || !hasCurrentKimaiConnection(config, userMapping)) {
    return { ok: false, error: 'Add your personal Kimai API token before adding time.' };
  }

  try {
    const issueKey = getTrustedIssueKey(request.context as Record<string, unknown>);
    if (!issueKey) {
      throw new AppError('JIRA_ISSUE_REQUIRED', 'Open a Jira issue before adding time.');
    }
    const date = dateValue(payload.date);
    const startTime = timeValue(payload.startTime, 'Start time');
    const duration = durationSeconds(payload.duration);
    const timezoneOffsetMinutes = payload.timezoneOffsetMinutes;
    const begin = timestamp(date, startTime, timezoneOffsetMinutes);
    let end = payload.endTime ? timestamp(date, timeValue(payload.endTime, 'End time'), timezoneOffsetMinutes) : undefined;
    if (!end && duration === undefined) {
      throw new AppError('MANUAL_DURATION_REQUIRED', 'Enter a duration or an end time.');
    }
    if (end && end < begin) {
      end = addDuration(end, 24 * 60 * 60);
    }
    if (end === begin) {
      throw new AppError('INVALID_MANUAL_PERIOD', 'End time must differ from start time.');
    }

    const jiraBegin = utcTimestamp(date, startTime, timezoneOffsetMinutes);
    let jiraEnd = payload.endTime
      ? utcTimestamp(date, timeValue(payload.endTime, 'End time'), timezoneOffsetMinutes)
      : addDuration(jiraBegin, duration as number);
    if (jiraEnd < jiraBegin) {
      jiraEnd = addDuration(jiraEnd, 24 * 60 * 60);
    }
    const timeSpentSeconds = duration ?? Math.round(
      (new Date(`${jiraEnd}Z`).getTime() - new Date(`${jiraBegin}Z`).getTime()) / 1000,
    );
    const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
    const jiraClient = new ForgeJiraClient();
    const issue = await jiraClient.getIssueDetails(issueKey);
    const customerId = await resolveKimaiCustomerId(client, issue, getCustomerId(payload));
    const target = await resolveTimerTarget(client, issue, customerId);
    const description = manualDescriptionWithIssueMarker(issueKey, payload.description);
    const timesheet = await client.createTimesheet({
      begin,
      end: end ?? addDuration(begin, duration as number),
      project: target.projectId,
      activity: target.activityId,
      user: userMapping!.kimaiUserId,
      description,
      billable: payload.billable === true,
    });
    let worklog;
    try {
      worklog = await jiraClient.createWorklog({
        issueIdOrKey: issueKey,
        started: jiraBegin,
        timeSpentSeconds,
        comment: `${formatKimaiTimesheetCorrelation(timesheet.id)} ${description}`,
        authorAccountId: accountId,
      });
    } catch {
      try {
        await client.deleteTimesheet(timesheet.id);
      } catch {
        throw new AppError(
          'JIRA_WORKLOG_CREATE_FAILED',
          'Jira could not add the worklog. The Kimai entry was created; remove it manually before retrying.',
        );
      }
      throw new AppError(
        'JIRA_WORKLOG_CREATE_FAILED',
        'Jira could not add the worklog. The Kimai entry was removed.',
      );
    }
    const mapping = {
      jiraIssueId: worklog.issueId,
      jiraIssueKey: issueKey,
      jiraWorklogId: worklog.id,
      kimaiTimesheetId: timesheet.id,
      kimaiUserId: userMapping!.kimaiUserId,
      origin: 'jira' as const,
      lastSyncedAt: new Date().toISOString(),
    };
    await savePendingJiraWorklogCreation(timesheet.id, mapping);
    await recordMapping(mapping);
    await deletePendingJiraWorklogCreation(timesheet.id);
    return { ok: true, timesheet, worklog };
  } catch (error) {
    return { ok: false, error: toSafeUserMessage(error) };
  }
});

/**
 * Saves a token only for the authenticated Jira user. The token is verified
 * against Kimai before it reaches Forge Secret Store, and `/api/users/me`
 * supplies the Kimai identity used by timer and worklog synchronization.
 */
resolver.define('savePersonalKimaiToken', async (request) => {
  const accountId = request.context.accountId as string | undefined;
  const apiToken = (request.payload as { apiToken?: unknown }).apiToken;
  if (!accountId) {
    return { ok: false, error: 'Unable to identify the current Jira user.' };
  }
  if (typeof apiToken !== 'string' || !apiToken.trim()) {
    return { ok: false, error: 'Enter your Kimai API token.' };
  }

  const config = await getKimaiConfig();
  if (!config) {
    return { ok: false, error: 'Kimai is not configured yet. Ask a site administrator to set it up.' };
  }

  try {
    const user = await new HttpKimaiClient({ baseUrl: config.url, apiToken: apiToken.trim() }).getCurrentUser();
    const [previousToken, previousMapping] = await Promise.all([
      getPersonalKimaiApiToken(accountId), getUserMapping(accountId),
    ]);
    await setPersonalKimaiApiToken(accountId, apiToken.trim());
    try {
      await saveUserMapping({
        jiraAccountId: accountId, kimaiUserId: user.id, kimaiUsername: user.username,
        kimaiBaseUrl: config.url, enabled: true,
      });
    } catch (error) {
      if (previousToken) await setPersonalKimaiApiToken(accountId, previousToken);
      else await clearPersonalKimaiApiToken(accountId);
      if (previousMapping) await saveUserMapping(previousMapping);
      else await deleteUserMapping(accountId);
      throw error;
    }
    return { ok: true, user: { id: user.id, username: user.username, email: user.email } };
  } catch (error) {
    return { ok: false, error: toSafeUserMessage(error) };
  }
});

resolver.define('clearPersonalKimaiToken', async (request) => {
  const accountId = request.context.accountId as string | undefined;
  if (!accountId) {
    return { ok: false, error: 'Unable to identify the current Jira user.' };
  }
  await Promise.all([clearPersonalKimaiApiToken(accountId), deleteUserMapping(accountId)]);
  return { ok: true };
});

export const handler = resolver.getDefinitions();

function manualDescriptionWithIssueMarker(issueKey: string, description: unknown): string {
  const text = typeof description === 'string' ? description.trim() : '';
  const marker = `[${issueKey}]`;
  return text.startsWith(marker) ? text : `${marker}${text ? ` ${text}` : ''}`;
}
