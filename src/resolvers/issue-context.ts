import Resolver from '@forge/resolver';
import { HttpKimaiClient, KimaiClient } from '../kimai/client';
import { ForgeJiraClient, JiraIssueDetails } from '../jira/client';
import { getKimaiConfig } from '../storage/config';
import { getKimaiApiToken } from '../storage/secrets';
import { getUserMapping } from '../storage/users';
import { claimTimerStart, releaseTimerStart } from '../storage/timers';
import {
  getJiraIssueKimaiTarget,
  getJiraProjectCustomerMapping,
  saveJiraIssueKimaiTarget,
  saveJiraProjectCustomerMapping,
} from '../storage/issue-targets';
import { AppError, toSafeUserMessage } from '../shared/errors';

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
    return { projectId: existing.kimaiProjectId, activityId: existing.kimaiActivityId };
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
      jiraProjectId: issue.project.id,
      jiraProjectKey: issue.project.key,
      jiraProjectName: issue.project.name,
      kimaiCustomerId,
    }),
    saveJiraIssueKimaiTarget({
      jiraIssueId: issue.id,
      jiraIssueKey: issue.key,
      kimaiCustomerId,
      kimaiProjectId: project.id,
      kimaiActivityId: activity.id,
    }),
  ]);

  return { projectId: project.id, activityId: activity.id };
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
  let timerSetupError: string | undefined;
  let customers: Array<{ id: number; name: string }> = [];
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
  if (!userMapping?.enabled) {
    timerSetupError = 'No enabled Kimai user mapping exists for this Jira user.';
  } else if (!issueKey) {
    timerSetupError = 'Open a Jira issue before starting a timer.';
  } else {
    try {
      const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
      const jiraClient = new ForgeJiraClient();
      const [activeTimesheets, jiraIssue, loadedCustomers] = await Promise.all([
        client.getActiveTimesheets(userMapping.kimaiUserId),
        jiraClient.getIssueDetails(issueKey),
        client.getCustomers(),
      ]);
      const issueMarker = `[${issueKey}]`;
      const active = activeTimesheets.find((timesheet) =>
        timesheet.description?.startsWith(issueMarker),
      );
      runningTimesheet = active ? { id: active.id, begin: active.begin } : undefined;
      customers = loadedCustomers.map((customer) => ({ id: customer.id, name: customer.name }));
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
  }

  return {
    configured: true,
    kimaiUrl: config.url,
    customers,
    defaultKimaiCustomerId,
    target,
    runningTimesheet,
    timerUnavailable,
    timerSetupError,
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
  if (!issueKey) {
    return { ok: false, error: 'Open a Jira issue before starting a timer.' };
  }

  const startClaimed = await claimTimerStart(userMapping.kimaiUserId, issueKey);
  if (!startClaimed) {
    return { ok: false, error: 'A timer start is already in progress for this issue.' };
  }

  try {
    const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
    const issueMarker = `[${issueKey}]`;
    const activeTimesheets = await client.getActiveTimesheets(userMapping.kimaiUserId);
    const existingTimer = activeTimesheets.find((timesheet) =>
      timesheet.description?.startsWith(issueMarker),
    );
    if (existingTimer) {
      return { ok: true, timesheet: existingTimer };
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
      user: userMapping.kimaiUserId,
    });
    return { ok: true, timesheet };
  } catch (error) {
    return { ok: false, error: toSafeUserMessage(error) };
  } finally {
    await releaseTimerStart(userMapping.kimaiUserId, issueKey);
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
