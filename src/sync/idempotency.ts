import * as crypto from 'crypto';
import { WorklogMapping } from '../shared/types';

/**
 * Determines whether an incoming sync event should be skipped because it
 * has already been applied (idempotency). Loop prevention is handled by the
 * originating system's self-generated flag before this function is called.
 */
export function shouldSkipSyncEvent(
  existingMapping: WorklogMapping | undefined,
  incoming: { hash: string },
): boolean {
  if (!existingMapping) {
    return false;
  }

  // Same content hash already recorded: this is a replay/duplicate event.
  if (existingMapping.lastHash && existingMapping.lastHash === incoming.hash) {
    return true;
  }

  return false;
}

/**
 * Computes a stable content hash for a worklog/timesheet payload so that
 * repeated deliveries of the same logical change can be detected.
 */
export function computeContentHash(fields: Record<string, unknown>): string {
  const normalized = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${JSON.stringify(fields[key])}`)
    .join('&');

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function normalizeSyncTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new RangeError(`Invalid sync timestamp: ${value}`);
  }

  return timestamp.toISOString();
}

export function mergeMapping(
  existing: WorklogMapping | undefined,
  updates: Partial<WorklogMapping> & Pick<WorklogMapping, 'jiraWorklogId' | 'kimaiTimesheetId'>,
): WorklogMapping {
  return {
    jiraIssueId: updates.jiraIssueId ?? existing?.jiraIssueId ?? '',
    jiraIssueKey: updates.jiraIssueKey ?? existing?.jiraIssueKey ?? '',
    jiraWorklogId: updates.jiraWorklogId,
    kimaiTimesheetId: updates.kimaiTimesheetId,
    origin: updates.origin ?? existing?.origin ?? 'jira',
    lastSyncedAt: updates.lastSyncedAt ?? new Date().toISOString(),
    lastHash: updates.lastHash ?? existing?.lastHash,
    lastKimaiModifiedAt: updates.lastKimaiModifiedAt ?? existing?.lastKimaiModifiedAt,
    pendingJiraWorklogDeletion: Object.prototype.hasOwnProperty.call(
      updates,
      'pendingJiraWorklogDeletion',
    )
      ? updates.pendingJiraWorklogDeletion
      : existing?.pendingJiraWorklogDeletion,
  };
}
