import { ForgeKvsAPIError, kvs } from '@forge/kvs';

export interface JiraProjectCustomerMapping {
  jiraProjectId: string;
  jiraProjectKey: string;
  jiraProjectName: string;
  kimaiCustomerId: number;
}

export interface JiraIssueKimaiTarget {
  jiraIssueId: string;
  jiraIssueKey: string;
  kimaiCustomerId: number;
  kimaiProjectId: number;
  kimaiActivityId: number;
}

function projectCustomerKey(jiraProjectId: string): string {
  return `timer:project-customer:${jiraProjectId}`;
}

function issueTargetKey(jiraIssueId: string): string {
  return `timer:issue-target:${jiraIssueId}`;
}

function issueTargetReservationKey(jiraIssueId: string, kimaiCustomerId: number): string {
  return `timer:issue-target-reservation:${jiraIssueId}:${kimaiCustomerId}`;
}

export async function getJiraProjectCustomerMapping(
  jiraProjectId: string,
): Promise<JiraProjectCustomerMapping | undefined> {
  return kvs.get<JiraProjectCustomerMapping>(projectCustomerKey(jiraProjectId));
}

export async function saveJiraProjectCustomerMapping(
  mapping: JiraProjectCustomerMapping,
): Promise<void> {
  await kvs.set(projectCustomerKey(mapping.jiraProjectId), mapping);
}

export async function getJiraIssueKimaiTarget(
  jiraIssueId: string,
): Promise<JiraIssueKimaiTarget | undefined> {
  return kvs.get<JiraIssueKimaiTarget>(issueTargetKey(jiraIssueId));
}

export async function saveJiraIssueKimaiTarget(target: JiraIssueKimaiTarget): Promise<void> {
  await kvs.set(issueTargetKey(target.jiraIssueId), target);
}

export async function claimJiraIssueKimaiTarget(
  jiraIssueId: string,
  kimaiCustomerId: number,
): Promise<boolean> {
  try {
    await kvs.set(
      issueTargetReservationKey(jiraIssueId, kimaiCustomerId),
      { claimedAt: new Date().toISOString() },
      { keyPolicy: 'FAIL_IF_EXISTS', ttl: { value: 1, unit: 'MINUTES' } },
    );
    return true;
  } catch (error) {
    if (error instanceof ForgeKvsAPIError && error.responseDetails.status === 409) return false;
    throw error;
  }
}

export async function releaseJiraIssueKimaiTarget(
  jiraIssueId: string,
  kimaiCustomerId: number,
): Promise<void> {
  await kvs.delete(issueTargetReservationKey(jiraIssueId, kimaiCustomerId));
}
