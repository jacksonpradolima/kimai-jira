import { JiraClient } from '../jira/client';
import { WorklogMapping } from '../shared/types';
import { logger } from '../shared/logger';
import { computeContentHash, mergeMapping, shouldSkipSyncEvent } from './idempotency';
import { getMappingByKimaiTimesheetId, recordMapping } from './mapping';

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
  const existing = await getMappingByKimaiTimesheetId(change.kimaiTimesheetId);
  const beginMs = new Date(change.begin).getTime();
  const endMs = new Date(change.end).getTime();

  if (Number.isNaN(beginMs) || Number.isNaN(endMs)) {
    throw new RangeError(
      `Invalid Kimai timesheet timestamps for Jira sync: begin=${change.begin}, end=${change.end}`,
    );
  }

  const timeSpentSeconds = Math.max(0, Math.round((endMs - beginMs) / 1000));

  const hash = computeContentHash({
    started: change.begin,
    duration: timeSpentSeconds,
    comment: change.description ?? '',
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

  const worklog = existing
    ? await client.updateWorklog(change.jiraIssueKey, existing.jiraWorklogId, {
        started: change.begin,
        timeSpentSeconds,
        comment: change.description,
      })
    : await client.createWorklog({
        issueIdOrKey: change.jiraIssueKey,
        started: change.begin,
        timeSpentSeconds,
        comment: change.description,
      });

  const mapping = mergeMapping(existing, {
    jiraIssueId: worklog.issueId,
    jiraIssueKey: change.jiraIssueKey,
    jiraWorklogId: worklog.id,
    kimaiTimesheetId: change.kimaiTimesheetId,
    origin: 'kimai',
    lastHash: hash,
  });

  await recordMapping(mapping);

  logger.info({
    event: existing ? 'timesheet.updated' : 'timesheet.created',
    direction: 'kimai-to-jira',
    jiraIssueKey: change.jiraIssueKey,
    jiraWorklogId: worklog.id,
    kimaiTimesheetId: change.kimaiTimesheetId,
    result: 'success',
  });

  return mapping;
}
