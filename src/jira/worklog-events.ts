import { HttpKimaiClient } from '../kimai/client';
import { getKimaiConfig } from '../storage/config';
import { getKimaiApiToken } from '../storage/secrets';
import { getUserMapping } from '../storage/users';
import { syncJiraWorklogToKimai } from '../sync/jira-to-kimai';
import { logger } from '../shared/logger';

interface JiraWorklogEvent {
  eventType: 'avi:jira:created:worklog' | 'avi:jira:updated:worklog' | 'avi:jira:deleted:worklog';
  selfGenerated?: boolean;
  worklog: {
    id: string;
    issueId: string;
    authorAccountId: string;
    started: string;
    timeSpentSeconds: number;
    comment?: string;
  };
  issue?: { key: string };
}

/**
 * Trigger module handler for `avi:jira:created:worklog`,
 * `avi:jira:updated:worklog` and `avi:jira:deleted:worklog` events.
 */
export async function handler(event: JiraWorklogEvent): Promise<void> {
  if (event.eventType === 'avi:jira:deleted:worklog') {
    // Delete support is intentionally deferred; see docs/synchronization-model.md.
    logger.info({
      event: 'worklog.delete_ignored',
      direction: 'jira-to-kimai',
      jiraWorklogId: event.worklog.id,
      result: 'success',
    });
    return;
  }

  const [config, apiToken, userMapping] = await Promise.all([
    getKimaiConfig(),
    getKimaiApiToken(),
    getUserMapping(event.worklog.authorAccountId),
  ]);

  if (!config || !apiToken || !userMapping?.enabled) {
    logger.warn({
      event: 'worklog.sync_skipped_unconfigured',
      direction: 'jira-to-kimai',
      jiraWorklogId: event.worklog.id,
      result: 'failure',
    });
    return;
  }

  if (!config.defaultProjectId || !config.defaultActivityId) {
    logger.warn({
      event: 'worklog.sync_skipped_missing_defaults',
      direction: 'jira-to-kimai',
      jiraWorklogId: event.worklog.id,
      result: 'failure',
    });
    return;
  }

  const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });

  await syncJiraWorklogToKimai(client, {
    jiraIssueId: event.worklog.issueId,
    jiraIssueKey: event.issue?.key ?? event.worklog.issueId,
    jiraWorklogId: event.worklog.id,
    authorAccountId: event.worklog.authorAccountId,
    kimaiUserId: userMapping.kimaiUserId,
    kimaiProjectId: config.defaultProjectId,
    kimaiActivityId: config.defaultActivityId,
    started: event.worklog.started,
    timeSpentSeconds: event.worklog.timeSpentSeconds,
    comment: event.worklog.comment,
    selfGenerated: event.selfGenerated,
  });
}
