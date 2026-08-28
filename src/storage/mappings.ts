import { kvs } from '@forge/kvs';
import { WorklogMapping } from '../shared/types';

function byJiraWorklogKey(jiraWorklogId: string): string {
  return `worklog:jira:${jiraWorklogId}`;
}

function byKimaiTimesheetKey(kimaiTimesheetId: number): string {
  return `worklog:kimai:${kimaiTimesheetId}`;
}

/**
 * Persists a worklog <-> timesheet mapping, indexed from both sides so it
 * can be looked up regardless of which system triggered the sync.
 */
export async function saveWorklogMapping(mapping: WorklogMapping): Promise<void> {
  await kvs.set(byJiraWorklogKey(mapping.jiraWorklogId), mapping);
  await kvs.set(byKimaiTimesheetKey(mapping.kimaiTimesheetId), mapping);
}

export async function getMappingByJiraWorklogId(
  jiraWorklogId: string,
): Promise<WorklogMapping | undefined> {
  return kvs.get<WorklogMapping>(byJiraWorklogKey(jiraWorklogId));
}

export async function getMappingByKimaiTimesheetId(
  kimaiTimesheetId: number,
): Promise<WorklogMapping | undefined> {
  return kvs.get<WorklogMapping>(byKimaiTimesheetKey(kimaiTimesheetId));
}

export async function deleteWorklogMapping(mapping: WorklogMapping): Promise<void> {
  await kvs.delete(byJiraWorklogKey(mapping.jiraWorklogId));
  await kvs.delete(byKimaiTimesheetKey(mapping.kimaiTimesheetId));
}
