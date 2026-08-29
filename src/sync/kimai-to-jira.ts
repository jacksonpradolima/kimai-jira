import { JiraClient } from '../jira/client';
import { WorklogMapping } from '../shared/types';
import { logger } from '../shared/logger';
import { stripJiraWorklogCorrelation } from './correlation';
import {
  computeContentHash,
  mergeMapping,
  normalizeSyncTimestamp,
  shouldSkipSyncEvent,
} from './idempotency';
import {
  claimKimaiTimesheetSync,
  deletePendingJiraWorklogCreation,
  getMappingByKimaiTimesheetId,
  getPendingJiraWorklogCreation,
  recordMapping,
  releaseKimaiTimesheetSync,
  savePendingJiraWorklogCreation,
} from './mapping';

const SYNC_CLAIM_RETRY_DELAY_MS = 25;
const SYNC_CLAIM_RETRY_COUNT = 40;

async function claimKimaiTimesheetSyncWithRetry(kimaiTimesheetId: number): Promise<boolean> {
  for (let attempt = 0; attempt < SYNC_CLAIM_RETRY_COUNT; attempt += 1) {
    if (await claimKimaiTimesheetSync(kimaiTimesheetId)) {
      return true;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, SYNC_CLAIM_RETRY_DELAY_MS);
    });
  }

  return false;
}

function isJiraWorklogNotFound(error: unknown): boolean {
  return error instanceof Error && /\b404\b/.test(error.message);
}

async function completePendingJiraWorklogDeletion(
  client: JiraClient,
  existing: WorklogMapping,
): Promise<WorklogMapping> {
  const pendingDeletion = existing.pendingJiraWorklogDeletion;
  if (!pendingDeletion) {
    return existing;
  }

  try {
    await client.deleteWorklog(pendingDeletion.jiraIssueKey, pendingDeletion.jiraWorklogId);
  } catch (error) {
    if (!isJiraWorklogNotFound(error)) {
      throw error;
    }
  }

  const cleared = mergeMapping(existing, {
    jiraWorklogId: existing.jiraWorklogId,
    kimaiTimesheetId: existing.kimaiTimesheetId,
    pendingJiraWorklogDeletion: undefined,
  });
  await recordMapping(cleared);
  return cleared;
}

export interface KimaiTimesheetChange {
  kimaiTimesheetId: number;
  jiraIssueKey: string;
  begin: string;
  end: string;
  description?: string;
}

/**
 * Applies a Kimai timesheet create/update event to Jira, creating or
 * updating the mapped worklog. Assumes the caller has already validated
 * the webhook signature and resolved the Jira issue key for the timesheet.
 */
export async function syncKimaiTimesheetToJira(
  client: JiraClient,
  change: KimaiTimesheetChange,
): Promise<WorklogMapping | undefined> {
  const syncClaimed = await claimKimaiTimesheetSyncWithRetry(change.kimaiTimesheetId);
  if (!syncClaimed) {
    logger.warn({
      event: 'timesheet.sync_retry_required',
      direction: 'kimai-to-jira',
      jiraIssueKey: change.jiraIssueKey,
      kimaiTimesheetId: change.kimaiTimesheetId,
      result: 'failure',
    });
    throw new Error('Kimai timesheet synchronization is busy; retry the event.');
  }

  try {
    let existing = await getMappingByKimaiTimesheetId(change.kimaiTimesheetId);
    const pendingCreation = await getPendingJiraWorklogCreation(change.kimaiTimesheetId);
    if (pendingCreation) {
      await recordMapping(pendingCreation);
      await deletePendingJiraWorklogCreation(change.kimaiTimesheetId);
      existing = pendingCreation;
    }
    if (existing) {
      existing = await completePendingJiraWorklogDeletion(client, existing);
    }

    const begin = normalizeSyncTimestamp(change.begin);
    const end = normalizeSyncTimestamp(change.end);
    const beginMs = new Date(begin).getTime();
    const endMs = new Date(end).getTime();
    const timeSpentSeconds = Math.max(0, Math.round((endMs - beginMs) / 1000));
    const comment = normalizeKimaiDescription(change.description, change.jiraIssueKey);
    const hash = computeContentHash({
      started: begin,
      duration: timeSpentSeconds,
      comment,
    });

    if (shouldSkipSyncEvent(existing, { hash })) {
      logger.info({
        event: 'timesheet.duplicate_ignored',
        direction: 'kimai-to-jira',
        jiraIssueKey: change.jiraIssueKey,
        kimaiTimesheetId: change.kimaiTimesheetId,
        result: 'success',
      });
      return existing;
    }

    const issueChanged = Boolean(existing && existing.jiraIssueKey !== change.jiraIssueKey);
    const createdWorklog = !existing || issueChanged;
    const worklog = existing && !issueChanged
      ? await client.updateWorklog(change.jiraIssueKey, existing.jiraWorklogId, {
          started: begin,
          timeSpentSeconds,
          comment,
        })
      : await client.createWorklog({
          issueIdOrKey: change.jiraIssueKey,
          started: begin,
          timeSpentSeconds,
          comment,
        });

    const pendingJiraWorklogDeletion = issueChanged && existing
      ? {
          jiraIssueKey: existing.jiraIssueKey,
          jiraWorklogId: existing.jiraWorklogId,
        }
      : undefined;
    let mapping = mergeMapping(existing, {
      jiraIssueId: worklog.issueId,
      jiraIssueKey: change.jiraIssueKey,
      jiraWorklogId: worklog.id,
      kimaiTimesheetId: change.kimaiTimesheetId,
      origin: 'kimai',
      lastHash: hash,
      pendingJiraWorklogDeletion,
    });

    if (createdWorklog) {
      await savePendingJiraWorklogCreation(change.kimaiTimesheetId, mapping);
    }
    await recordMapping(mapping);
    if (createdWorklog) {
      await deletePendingJiraWorklogCreation(change.kimaiTimesheetId);
    }

    if (pendingJiraWorklogDeletion) {
      mapping = await completePendingJiraWorklogDeletion(client, mapping);
    }

    logger.info({
      event: existing ? 'timesheet.updated' : 'timesheet.created',
      direction: 'kimai-to-jira',
      jiraIssueKey: change.jiraIssueKey,
      jiraWorklogId: worklog.id,
      kimaiTimesheetId: change.kimaiTimesheetId,
      result: 'success',
    });

    return mapping;
  } finally {
    await releaseKimaiTimesheetSync(change.kimaiTimesheetId);
  }
}

export function normalizeKimaiDescription(
  description: string | undefined,
  jiraIssueKey: string,
): string {
  if (!description) {
    return '';
  }

  const withoutCorrelation = stripJiraWorklogCorrelation(description);
  const escapedIssueKey = jiraIssueKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return withoutCorrelation.replace(new RegExp(`^\\s*\\[${escapedIssueKey}\\]\\s*`), '');
}
