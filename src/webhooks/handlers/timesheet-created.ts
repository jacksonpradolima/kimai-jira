import { JiraClient } from '../../jira/client';
import { getJiraWorklogCorrelation } from '../../sync/correlation';
import { syncKimaiTimesheetToJira } from '../../sync/kimai-to-jira';
import { getMappingByJiraWorklogId } from '../../sync/mapping';

export interface KimaiTimesheetPayload {
  id: number;
  begin: string;
  end: string | null;
  description?: string;
  meta?: { jiraIssueKey?: string };
}

/**
 * Handles a `timesheet.created` Kimai webhook event.
 *
 * The Jira issue key is expected to be embedded either in the timesheet
 * description (e.g. `[BA-3] ...`) or in Kimai timesheet meta fields
 * configured by the administrator.
 */
export async function handleTimesheetCreated(
  client: JiraClient,
  payload: KimaiTimesheetPayload,
): Promise<void> {
  if (!payload.end) {
    return;
  }

  const correlatedJiraWorklogId = getJiraWorklogCorrelation(payload.description);
  if (correlatedJiraWorklogId) {
    const mapping = await getMappingByJiraWorklogId(correlatedJiraWorklogId);
    if (!mapping || mapping.kimaiTimesheetId !== payload.id) {
      return;
    }
  }

  const jiraIssueKey = resolveIssueKey(payload);
  if (!jiraIssueKey) {
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

export function resolveIssueKey(payload: KimaiTimesheetPayload): string | undefined {
  if (payload.meta?.jiraIssueKey) {
    return payload.meta.jiraIssueKey;
  }
  const match = /\[([A-Z][A-Z0-9]*-\d+)\]/.exec(payload.description ?? '');
  return match ? match[1] : undefined;
}
