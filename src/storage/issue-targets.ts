import { kvs } from '@forge/kvs';

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
