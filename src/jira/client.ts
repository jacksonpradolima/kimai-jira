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
}

export class ForgeJiraClient implements JiraClient {
  async createWorklog(input: CreateJiraWorklogInput): Promise<JiraWorklog> {
    const response = await asApp().requestJira(
      route`/rest/api/3/issue/${input.issueIdOrKey}/worklog`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          started: toJiraTimestamp(input.started),
          timeSpentSeconds: input.timeSpentSeconds,
          comment: input.comment,
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
          comment: input.comment,
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
