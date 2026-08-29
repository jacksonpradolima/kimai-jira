import { KimaiClient } from '../kimai/client';
import { WorklogMapping } from '../shared/types';
import { logger } from '../shared/logger';
import { formatJiraWorklogCorrelation } from './correlation';
import {
  computeContentHash,
  mergeMapping,
  normalizeSyncTimestamp,
  shouldSkipSyncEvent,
} from './idempotency';
import {
  claimJiraWorklogSync,
  deletePendingKimaiTimesheetCreation,
  getMappingByJiraWorklogId,
  getPendingKimaiTimesheetCreation,
  recordMapping,
  releaseJiraWorklogSync,
  savePendingKimaiTimesheetCreation,
} from './mapping';

const SYNC_CLAIM_RETRY_DELAY_MS = 25;
const SYNC_CLAIM_RETRY_COUNT = 40;

async function claimJiraWorklogSyncWithRetry(jiraWorklogId: string): Promise<boolean> {
  for (let attempt = 0; attempt < SYNC_CLAIM_RETRY_COUNT; attempt += 1) {
    if (await claimJiraWorklogSync(jiraWorklogId)) {
      return true;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, SYNC_CLAIM_RETRY_DELAY_MS);
    });
  }

  return false;
}

export interface JiraWorklogChange {
  jiraIssueId: string;
  jiraIssueKey: string;
  jiraWorklogId: string;
  authorAccountId?: string;
  kimaiUserId?: number;
  kimaiProjectId?: number;
  kimaiActivityId?: number;
  started: string;
  timeSpentSeconds: number;
  comment?: string;
  selfGenerated?: boolean;
}

/**
 * Applies a Jira worklog create/update event to Kimai, creating or updating
 * the mapped timesheet. Self-generated events (i.e. caused by our own
 * previous Kimai -> Jira write) are ignored to prevent sync loops.
 */
export async function syncJiraWorklogToKimai(
  client: KimaiClient,
  change: JiraWorklogChange,
): Promise<WorklogMapping | undefined> {
  if (change.selfGenerated) {
    logger.info({
      event: 'worklog.skipped_self_generated',
      direction: 'jira-to-kimai',
      jiraIssueKey: change.jiraIssueKey,
      jiraWorklogId: change.jiraWorklogId,
      result: 'success',
    });
    return undefined;
  }

  const syncClaimed = await claimJiraWorklogSyncWithRetry(change.jiraWorklogId);
  if (!syncClaimed) {
    logger.warn({
      event: 'worklog.sync_retry_required',
      direction: 'jira-to-kimai',
      jiraIssueKey: change.jiraIssueKey,
      jiraWorklogId: change.jiraWorklogId,
      result: 'failure',
    });
    throw new Error('Jira worklog synchronization is busy; retry the event.');
  }

  try {
    let existing = await getMappingByJiraWorklogId(change.jiraWorklogId);
    const pendingCreation = await getPendingKimaiTimesheetCreation(change.jiraWorklogId);
    if (pendingCreation) {
      await recordMapping(pendingCreation);
      await deletePendingKimaiTimesheetCreation(change.jiraWorklogId);
      existing = pendingCreation;
    }
    const started = normalizeSyncTimestamp(change.started);
    const startedMs = new Date(started).getTime();
    const hash = computeContentHash({
      started,
      duration: change.timeSpentSeconds,
      comment: change.comment ?? '',
    });

    if (shouldSkipSyncEvent(existing, { hash })) {
      logger.info({
        event: 'worklog.duplicate_ignored',
        direction: 'jira-to-kimai',
        jiraIssueKey: change.jiraIssueKey,
        jiraWorklogId: change.jiraWorklogId,
        result: 'success',
      });
      return existing;
    }

    const endIso = new Date(startedMs + change.timeSpentSeconds * 1000).toISOString();
    const createdTimesheet = !existing;
    if (
      createdTimesheet
      && (change.kimaiUserId === undefined
        || change.kimaiProjectId === undefined
        || change.kimaiActivityId === undefined)
    ) {
      throw new Error('Kimai user, project, and activity are required to create a timesheet.');
    }
    const description = createdTimesheet
      ? `${formatJiraWorklogCorrelation(change.jiraWorklogId)} [${change.jiraIssueKey}] ${change.comment ?? ''}`.trim()
      : `[${change.jiraIssueKey}] ${change.comment ?? ''}`.trim();
    const timesheet = existing
      ? await client.updateTimesheet(existing.kimaiTimesheetId, {
          begin: started,
          end: endIso,
          description,
        })
      : await client.createTimesheet({
          begin: started,
          end: endIso,
          description,
          project: change.kimaiProjectId as number,
          activity: change.kimaiActivityId as number,
          user: change.kimaiUserId as number,
        });

    const mapping = mergeMapping(existing, {
      jiraIssueId: change.jiraIssueId,
      jiraIssueKey: change.jiraIssueKey,
      jiraWorklogId: change.jiraWorklogId,
      kimaiTimesheetId: timesheet.id,
      origin: 'jira',
      lastHash: hash,
    });

    if (createdTimesheet) {
      await savePendingKimaiTimesheetCreation(change.jiraWorklogId, mapping);
    }
    await recordMapping(mapping);
    if (createdTimesheet) {
      await deletePendingKimaiTimesheetCreation(change.jiraWorklogId);
    }

    logger.info({
      event: existing ? 'worklog.updated' : 'worklog.created',
      direction: 'jira-to-kimai',
      jiraIssueKey: change.jiraIssueKey,
      jiraWorklogId: change.jiraWorklogId,
      kimaiTimesheetId: timesheet.id,
      result: 'success',
    });

    return mapping;
  } finally {
    await releaseJiraWorklogSync(change.jiraWorklogId);
  }
}
