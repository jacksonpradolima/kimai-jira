import { KimaiClient } from '../kimai/client';
import { WorklogMapping } from '../shared/types';
import { logger } from '../shared/logger';
import {
  computeContentHash,
  mergeMapping,
  shouldSkipSyncEvent,
} from './idempotency';
import { getMappingByJiraWorklogId, recordMapping } from './mapping';

export interface JiraWorklogChange {
  jiraIssueId: string;
  jiraIssueKey: string;
  jiraWorklogId: string;
  authorAccountId: string;
  kimaiUserId: number;
  kimaiProjectId: number;
  kimaiActivityId: number;
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

  const existing = await getMappingByJiraWorklogId(change.jiraWorklogId);
  const startedMs = new Date(change.started).getTime();
  if (Number.isNaN(startedMs)) {
    throw new RangeError(`Invalid Jira worklog timestamp: ${change.started}`);
  }

  const hash = computeContentHash({
    started: change.started,
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

  const description = `[${change.jiraIssueKey}] ${change.comment ?? ''}`.trim();
  const endIso = new Date(startedMs + change.timeSpentSeconds * 1000).toISOString();

  const timesheet = existing
    ? await client.updateTimesheet(existing.kimaiTimesheetId, {
        begin: change.started,
        end: endIso,
        description,
      })
    : await client.createTimesheet({
        begin: change.started,
        end: endIso,
        description,
        project: change.kimaiProjectId,
        activity: change.kimaiActivityId,
        user: change.kimaiUserId,
      });

  const mapping = mergeMapping(existing, {
    jiraIssueId: change.jiraIssueId,
    jiraIssueKey: change.jiraIssueKey,
    jiraWorklogId: change.jiraWorklogId,
    kimaiTimesheetId: timesheet.id,
    origin: 'jira',
    lastHash: hash,
  });

  await recordMapping(mapping);

  logger.info({
    event: existing ? 'worklog.updated' : 'worklog.created',
    direction: 'jira-to-kimai',
    jiraIssueKey: change.jiraIssueKey,
    jiraWorklogId: change.jiraWorklogId,
    kimaiTimesheetId: timesheet.id,
    result: 'success',
  });

  return mapping;
}
