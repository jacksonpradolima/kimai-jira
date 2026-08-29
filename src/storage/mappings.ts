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

function pendingJiraWorklogCreationKey(kimaiTimesheetId: number): string {
  return `worklog:pending-jira-creation:${kimaiTimesheetId}`;
}

function pendingKimaiTimesheetCreationKey(jiraWorklogId: string): string {
  return `worklog:pending-kimai-creation:${jiraWorklogId}`;
}

/**
 * Persists a worklog <-> timesheet mapping, indexed from both sides so it
 * can be looked up regardless of which system triggered the sync.
 */
export async function saveWorklogMapping(mapping: WorklogMapping): Promise<void> {
  const previous = await getMappingByKimaiTimesheetId(mapping.kimaiTimesheetId);
  const transaction = kvs.transact();
  if (previous && previous.jiraWorklogId !== mapping.jiraWorklogId) {
    transaction.delete(byJiraWorklogKey(previous.jiraWorklogId));
  }

  await transaction
    .set(byJiraWorklogKey(mapping.jiraWorklogId), mapping)
    .set(byKimaiTimesheetKey(mapping.kimaiTimesheetId), mapping)
    .execute();
}

/**
 * Claims creation for a Jira worklog before calling Kimai. The conditional
 * write prevents concurrent event deliveries from creating duplicate entries.
 */
export async function claimJiraWorklogCreation(jiraWorklogId: string): Promise<boolean> {
  return claimReservation(byJiraWorklogReservationKey(jiraWorklogId));
}

export async function claimJiraWorklogSync(jiraWorklogId: string): Promise<boolean> {
  return claimReservation(byJiraWorklogReservationKey(jiraWorklogId));
}

async function claimReservation(key: string): Promise<boolean> {
  try {
    await kvs.set(
      key,
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

export async function releaseJiraWorklogSync(jiraWorklogId: string): Promise<void> {
  await kvs.delete(byJiraWorklogReservationKey(jiraWorklogId));
}

export async function claimKimaiTimesheetCreation(kimaiTimesheetId: number): Promise<boolean> {
  return claimReservation(byKimaiTimesheetReservationKey(kimaiTimesheetId));
}

export async function claimKimaiTimesheetSync(kimaiTimesheetId: number): Promise<boolean> {
  return claimReservation(byKimaiTimesheetReservationKey(kimaiTimesheetId));
}

export async function releaseKimaiTimesheetCreation(kimaiTimesheetId: number): Promise<void> {
  await kvs.delete(byKimaiTimesheetReservationKey(kimaiTimesheetId));
}

export async function releaseKimaiTimesheetSync(kimaiTimesheetId: number): Promise<void> {
  await kvs.delete(byKimaiTimesheetReservationKey(kimaiTimesheetId));
}

export async function savePendingJiraWorklogCreation(
  kimaiTimesheetId: number,
  mapping: WorklogMapping,
): Promise<void> {
  await kvs.set(pendingJiraWorklogCreationKey(kimaiTimesheetId), mapping);
}

export async function getPendingJiraWorklogCreation(
  kimaiTimesheetId: number,
): Promise<WorklogMapping | undefined> {
  return kvs.get<WorklogMapping>(pendingJiraWorklogCreationKey(kimaiTimesheetId));
}

export async function deletePendingJiraWorklogCreation(kimaiTimesheetId: number): Promise<void> {
  await kvs.delete(pendingJiraWorklogCreationKey(kimaiTimesheetId));
}

export async function savePendingKimaiTimesheetCreation(
  jiraWorklogId: string,
  mapping: WorklogMapping,
): Promise<void> {
  await kvs.set(pendingKimaiTimesheetCreationKey(jiraWorklogId), mapping);
}

export async function getPendingKimaiTimesheetCreation(
  jiraWorklogId: string,
): Promise<WorklogMapping | undefined> {
  return kvs.get<WorklogMapping>(pendingKimaiTimesheetCreationKey(jiraWorklogId));
}

export async function deletePendingKimaiTimesheetCreation(jiraWorklogId: string): Promise<void> {
  await kvs.delete(pendingKimaiTimesheetCreationKey(jiraWorklogId));
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
