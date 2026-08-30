import { JiraClient } from '../../jira/client';
import { syncKimaiTimesheetToJira } from '../../sync/kimai-to-jira';
import { getMappingByKimaiTimesheetId } from '../../sync/mapping';
import { KimaiTimesheetPayload, resolveEnabledKimaiUser, resolveIssueKey } from './timesheet-created';

/**
 * Handles a `timesheet.updated` Kimai webhook event. Uses the same sync
 * logic as `timesheet.created`, which is naturally idempotent and will
 * update an existing mapping rather than creating a duplicate worklog.
 */
export async function handleTimesheetUpdated(
  client: JiraClient,
  payload: KimaiTimesheetPayload,
): Promise<void> {
  if (!payload.end) {
    return;
  }
  const userMapping = await resolveEnabledKimaiUser(payload);
  if (!userMapping) return;
  const jiraIssueKey = resolveIssueKey(payload)
    ?? (await getMappingByKimaiTimesheetId(payload.id))?.jiraIssueKey;
  if (!jiraIssueKey) {
    return;
  }

  await syncKimaiTimesheetToJira(client, {
    kimaiTimesheetId: payload.id,
    jiraIssueKey,
    begin: payload.begin,
    end: payload.end,
    description: payload.description,
    modifiedAt: payload.modifiedAt,
    jiraAuthorAccountId: userMapping.jiraAccountId,
  });
}
