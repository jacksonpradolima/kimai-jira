import { asApp, route } from '@forge/api';

export interface CreateJiraWorklogInput {
  issueIdOrKey: string;
  started: string;
  timeSpentSeconds: number;
  comment?: string;
}

export interface UpdateJiraWorklogInput {
  started?: string;
  timeSpentSeconds?: number;
  comment?: string;
}

export interface JiraWorklog {
  id: string;
  issueId: string;
  started: string;
  timeSpentSeconds: number;
  comment?: string;
}

export interface JiraIssueResolver {
  getIssueKey(issueIdOrKey: string): Promise<string>;
}

interface JiraAdfDocument {
  type: 'doc';
  version: 1;
  content: Array<{
    type: 'paragraph';
    content: Array<{
      type: 'text';
      text: string;
    }>;
  }>;
}

/**
 * Thin wrapper around the Jira REST API worklog endpoints. All calls are
 * made `asApp()` so they do not depend on the identity of the user who
 * triggered the sync, which keeps the integration working for events fired
 * on behalf of another user (e.g. incoming Kimai webhooks).
 */
export interface JiraClient {
  createWorklog(input: CreateJiraWorklogInput): Promise<JiraWorklog>;
  updateWorklog(
    issueIdOrKey: string,
    worklogId: string,
    input: UpdateJiraWorklogInput,
  ): Promise<JiraWorklog>;
  getWorklog(issueIdOrKey: string, worklogId: string): Promise<JiraWorklog>;
  deleteWorklog(issueIdOrKey: string, worklogId: string): Promise<void>;
}

export class ForgeJiraClient implements JiraClient, JiraIssueResolver {
  async createWorklog(input: CreateJiraWorklogInput): Promise<JiraWorklog> {
    const response = await asApp().requestJira(
      route`/rest/api/3/issue/${input.issueIdOrKey}/worklog`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          started: toJiraTimestamp(input.started),
          timeSpentSeconds: input.timeSpentSeconds,
          comment: toJiraAdfDocument(input.comment),
        }),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Jira worklog create failed (${response.status} ${response.statusText}): ${message}`,
      );
    }

    return (await response.json()) as JiraWorklog;
  }

  async updateWorklog(
    issueIdOrKey: string,
    worklogId: string,
    input: UpdateJiraWorklogInput,
  ): Promise<JiraWorklog> {
    const response = await asApp().requestJira(
      route`/rest/api/3/issue/${issueIdOrKey}/worklog/${worklogId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          started: input.started ? toJiraTimestamp(input.started) : undefined,
          timeSpentSeconds: input.timeSpentSeconds,
          comment: toJiraAdfDocument(input.comment),
        }),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Jira worklog update failed (${response.status} ${response.statusText}): ${message}`,
      );
    }

    return (await response.json()) as JiraWorklog;
  }

  async getWorklog(issueIdOrKey: string, worklogId: string): Promise<JiraWorklog> {
    const response = await asApp().requestJira(
      route`/rest/api/3/issue/${issueIdOrKey}/worklog/${worklogId}`,
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Jira worklog lookup failed (${response.status} ${response.statusText}): ${message}`,
      );
    }

    return (await response.json()) as JiraWorklog;
  }

  async deleteWorklog(issueIdOrKey: string, worklogId: string): Promise<void> {
    const response = await asApp().requestJira(
      route`/rest/api/3/issue/${issueIdOrKey}/worklog/${worklogId}`,
      { method: 'DELETE' },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Jira worklog delete failed (${response.status} ${response.statusText}): ${message}`,
      );
    }
  }

  async getIssueKey(issueIdOrKey: string): Promise<string> {
    const response = await asApp().requestJira(
      route`/rest/api/3/issue/${issueIdOrKey}?fields=key`,
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Jira issue lookup failed (${response.status} ${response.statusText}): ${message}`,
      );
    }

    const issue = (await response.json()) as { key?: unknown };
    if (typeof issue.key !== 'string' || !issue.key) {
      throw new Error(`Jira issue lookup returned no key for ${issueIdOrKey}`);
    }

    return issue.key;
  }
}

/**
 * Jira expects timestamps formatted as `yyyy-MM-ddTHH:mm:ss.SSSZZZZZ`; this
 * converts a plain ISO-8601 string produced elsewhere in the app.
 */
export function toJiraTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid ISO-8601 date for Jira: ${isoDate}`);
  }

  return date.toISOString().replace('Z', '+0000');
}

export function toJiraAdfDocument(comment: string | undefined): JiraAdfDocument | undefined {
  if (comment === undefined) {
    return undefined;
  }

  if (comment === '') {
    return { type: 'doc', version: 1, content: [] };
  }

  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: comment }],
      },
    ],
  };
}
