import { JiraClient } from '../../jira/client';
import { syncKimaiTimesheetToJira } from '../../sync/kimai-to-jira';
import { KimaiTimesheetPayload, resolveIssueKey } from './timesheet-created';

/**
 * Handles a `timesheet.updated` Kimai webhook event. Uses the same sync
 * logic as `timesheet.created`, which is naturally idempotent and will
 * update an existing mapping rather than creating a duplicate worklog.
 */
export async function handleTimesheetUpdated(
  client: JiraClient,
  payload: KimaiTimesheetPayload,
): Promise<void> {
  const jiraIssueKey = resolveIssueKey(payload);
  if (!jiraIssueKey || !payload.end) {
    return;
  }

  await syncKimaiTimesheetToJira(client, {
    kimaiTimesheetId: payload.id,
    jiraIssueKey,
    begin: payload.begin,
    end: payload.end,
    description: payload.description,
  });
}
