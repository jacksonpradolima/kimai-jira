import { JiraClient } from '../jira/client';
import { WorklogMapping } from '../shared/types';
import { logger } from '../shared/logger';
import {
  computeContentHash,
  mergeMapping,
  normalizeSyncTimestamp,
  shouldSkipSyncEvent,
} from './idempotency';
import {
  claimKimaiTimesheetCreation,
  getMappingByKimaiTimesheetId,
  recordMapping,
  releaseKimaiTimesheetCreation,
} from './mapping';

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
  let existing = await getMappingByKimaiTimesheetId(change.kimaiTimesheetId);
  const begin = normalizeSyncTimestamp(change.begin);
  const end = normalizeSyncTimestamp(change.end);
  const beginMs = new Date(begin).getTime();
  const endMs = new Date(end).getTime();

  if (existing?.pendingJiraWorklogDeletion) {
    const pendingDeletion = existing.pendingJiraWorklogDeletion;
    await client.deleteWorklog(pendingDeletion.jiraIssueKey, pendingDeletion.jiraWorklogId);
    existing = mergeMapping(existing, {
      jiraWorklogId: existing.jiraWorklogId,
      kimaiTimesheetId: existing.kimaiTimesheetId,
      pendingJiraWorklogDeletion: undefined,
    });
    await recordMapping(existing);
  }

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
  const requiresCreation = !existing || issueChanged;
  let creationClaimed = false;
  if (requiresCreation) {
    creationClaimed = await claimKimaiTimesheetCreation(change.kimaiTimesheetId);
    if (!creationClaimed) {
      logger.info({
        event: 'timesheet.create_in_progress',
        direction: 'kimai-to-jira',
        jiraIssueKey: change.jiraIssueKey,
        kimaiTimesheetId: change.kimaiTimesheetId,
        result: 'success',
      });
      return undefined;
    }
  }

  try {
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

    await recordMapping(mapping);

    if (pendingJiraWorklogDeletion) {
      await client.deleteWorklog(
        pendingJiraWorklogDeletion.jiraIssueKey,
        pendingJiraWorklogDeletion.jiraWorklogId,
      );
      mapping = mergeMapping(mapping, {
        jiraWorklogId: mapping.jiraWorklogId,
        kimaiTimesheetId: mapping.kimaiTimesheetId,
        pendingJiraWorklogDeletion: undefined,
      });
      await recordMapping(mapping);
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
    if (creationClaimed) {
      await releaseKimaiTimesheetCreation(change.kimaiTimesheetId);
    }
  }
}

export function normalizeKimaiDescription(
  description: string | undefined,
  jiraIssueKey: string,
): string {
  if (!description) {
    return '';
  }

  const escapedIssueKey = jiraIssueKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return description.replace(new RegExp(`^\\s*\\[${escapedIssueKey}\\]\\s*`), '');
}
