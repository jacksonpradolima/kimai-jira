import { JiraClient } from '../../jira/client';
import { syncKimaiTimesheetToJira } from '../../sync/kimai-to-jira';
import { getMappingByKimaiTimesheetId } from '../../sync/mapping';
import { KimaiTimesheetPayload, resolveEnabledKimaiUser, resolveIssueKey } from './timesheet-created';
import { getSyncSettings } from '../../storage/config';

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
  const sync = await getSyncSettings();
  if (!sync.kimaiToJira) return;
  const userMapping = await resolveEnabledKimaiUser(payload);
  if (!userMapping) return;
  const mapping = await getMappingByKimaiTimesheetId(payload.id);
  if ((mapping && !sync.allowUpdate) || (!mapping && !sync.allowCreate)) return;
  const jiraIssueKey = resolveIssueKey(payload) ?? mapping?.jiraIssueKey;
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
    kimaiUserId: userMapping.kimaiUserId,
    jiraAuthorAccountId: userMapping.jiraAccountId,
  });
}
