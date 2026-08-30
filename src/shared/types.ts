/**
 * Shared domain types used across the Jira <-> Kimai synchronization layers.
 */

export interface WorklogMapping {
  jiraIssueId: string;
  jiraIssueKey: string;
  jiraWorklogId: string;

  kimaiTimesheetId: number;

  origin: 'jira' | 'kimai';

  lastSyncedAt: string;
  lastHash?: string;
  pendingJiraWorklogDeletion?: {
    jiraIssueKey: string;
    jiraWorklogId: string;
  };
}

export interface UserMapping {
  jiraAccountId: string;
  kimaiUserId: number;
  enabled: boolean;
}

export interface KimaiUser {
  id: number;
  username: string;
  email?: string;
}

export interface KimaiTimesheet {
  id: number;
  begin: string;
  end?: string | null;
  duration?: number;
  description?: string;
  project: number;
  activity: number;
  user: number;
  billable?: boolean;
  tags?: string[];
}

export interface KimaiProject {
  id: number;
  name: string;
  customer: number;
}

export interface KimaiCustomer {
  id: number;
  name: string;
}

export interface KimaiActivity {
  id: number;
  name: string;
  project?: number | null;
}

export interface CreateKimaiProjectInput {
  name: string;
  customer: number;
  visible: boolean;
}

export interface CreateKimaiActivityInput {
  name: string;
  project: number;
  visible: boolean;
}

export interface CreateTimesheetInput {
  begin: string;
  end?: string;
  project: number;
  activity: number;
  user?: number;
  description?: string;
  billable?: boolean;
  tags?: string[];
}

export type UpdateTimesheetInput = Partial<CreateTimesheetInput>;

export interface StartTimerInput {
  project: number;
  activity: number;
  user?: number;
  description?: string;
}

export interface KimaiConfig {
  url: string;
  hasToken: boolean;
  defaultProjectId?: number;
  defaultActivityId?: number;
}

export interface SyncSettings {
  jiraToKimai: boolean;
  kimaiToJira: boolean;
  allowCreate: boolean;
  allowUpdate: boolean;
  allowDelete: boolean;
}

export type SyncOrigin = 'jira' | 'kimai';

export interface SyncEvent {
  origin: SyncOrigin;
  entityId: string;
  hash: string;
  occurredAt: string;
}
