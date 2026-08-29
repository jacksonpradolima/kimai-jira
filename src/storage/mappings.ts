import { kvs } from '@forge/kvs';
import { ForgeKvsAPIError } from '@forge/kvs';
import { WorklogMapping } from '../shared/types';

function byJiraWorklogKey(jiraWorklogId: string): string {
  return `worklog:jira:${jiraWorklogId}`;
}

function byKimaiTimesheetKey(kimaiTimesheetId: number): string {
  return `worklog:kimai:${kimaiTimesheetId}`;
}

function byJiraWorklogReservationKey(jiraWorklogId: string): string {
  return `worklog:reservation:jira:${jiraWorklogId}`;
}

function byKimaiTimesheetReservationKey(kimaiTimesheetId: number): string {
  return `worklog:reservation:kimai:${kimaiTimesheetId}`;
}

/**
 * Persists a worklog <-> timesheet mapping, indexed from both sides so it
 * can be looked up regardless of which system triggered the sync.
 */
export async function saveWorklogMapping(mapping: WorklogMapping): Promise<void> {
  const previous = await getMappingByKimaiTimesheetId(mapping.kimaiTimesheetId);
  if (previous && previous.jiraWorklogId !== mapping.jiraWorklogId) {
    await kvs.delete(byJiraWorklogKey(previous.jiraWorklogId));
  }

  await kvs.set(byJiraWorklogKey(mapping.jiraWorklogId), mapping);
  await kvs.set(byKimaiTimesheetKey(mapping.kimaiTimesheetId), mapping);
}

/**
 * Claims creation for a Jira worklog before calling Kimai. The conditional
 * write prevents concurrent event deliveries from creating duplicate entries.
 */
export async function claimJiraWorklogCreation(jiraWorklogId: string): Promise<boolean> {
  try {
    await kvs.set(
      byJiraWorklogReservationKey(jiraWorklogId),
      { claimedAt: new Date().toISOString() },
      {
        keyPolicy: 'FAIL_IF_EXISTS',
        ttl: { value: 5, unit: 'MINUTES' },
      },
    );
    return true;
  } catch (error) {
    if (error instanceof ForgeKvsAPIError && error.responseDetails.status === 409) {
      return false;
    }
    throw error;
  }
}

export async function releaseJiraWorklogCreation(jiraWorklogId: string): Promise<void> {
  await kvs.delete(byJiraWorklogReservationKey(jiraWorklogId));
}

export async function claimKimaiTimesheetCreation(kimaiTimesheetId: number): Promise<boolean> {
  try {
    await kvs.set(
      byKimaiTimesheetReservationKey(kimaiTimesheetId),
      { claimedAt: new Date().toISOString() },
      {
        keyPolicy: 'FAIL_IF_EXISTS',
        ttl: { value: 5, unit: 'MINUTES' },
      },
    );
    return true;
  } catch (error) {
    if (error instanceof ForgeKvsAPIError && error.responseDetails.status === 409) {
      return false;
    }
    throw error;
  }
}

export async function releaseKimaiTimesheetCreation(kimaiTimesheetId: number): Promise<void> {
  await kvs.delete(byKimaiTimesheetReservationKey(kimaiTimesheetId));
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
