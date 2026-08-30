import { ForgeJiraClient } from './client';
import { HttpKimaiClient } from '../kimai/client';
import { getKimaiConfig } from '../storage/config';
import { getPersonalKimaiApiToken } from '../storage/secrets';
import { getUserMapping } from '../storage/users';
import { syncJiraWorklogToKimai } from '../sync/jira-to-kimai';
import { getMappingByJiraWorklogId } from '../sync/mapping';
import { logger } from '../shared/logger';

interface JiraWorklogEvent {
  eventType: 'avi:jira:created:worklog' | 'avi:jira:updated:worklog' | 'avi:jira:deleted:worklog';
  selfGenerated?: boolean;
  worklog: {
    id: string;
    issueId: string;
    author?: { accountId?: string };
    authorAccountId?: string;
    started: string;
    timeSpentSeconds: number;
    comment?: unknown;
  };
  issue?: { key?: string };
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

  const jiraIssueKey = event.issue?.key ?? (await new ForgeJiraClient().getIssueKey(event.worklog.issueId));
  const authorAccountId = event.worklog.author?.accountId ?? event.worklog.authorAccountId;
  const [config, existingMapping, userMapping, apiToken] = await Promise.all([
    getKimaiConfig(),
    getMappingByJiraWorklogId(event.worklog.id),
    authorAccountId ? getUserMapping(authorAccountId) : Promise.resolve(undefined),
    authorAccountId ? getPersonalKimaiApiToken(authorAccountId) : Promise.resolve(undefined),
  ]);

  if (!config || !apiToken) {
    logger.warn({
      event: 'worklog.sync_skipped_unconfigured',
      direction: 'jira-to-kimai',
      jiraWorklogId: event.worklog.id,
      result: 'failure',
    });
    return;
  }

  if (!existingMapping && !authorAccountId) {
    logger.warn({
      event: 'worklog.sync_skipped_missing_author',
      direction: 'jira-to-kimai',
      jiraWorklogId: event.worklog.id,
      result: 'failure',
    });
    return;
  }

  if (!existingMapping && !userMapping?.enabled) {
    logger.warn({
      event: 'worklog.sync_skipped_unconfigured',
      direction: 'jira-to-kimai',
      jiraWorklogId: event.worklog.id,
      result: 'failure',
    });
    return;
  }

  if (!existingMapping && (!config.defaultProjectId || !config.defaultActivityId)) {
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
    jiraIssueKey,
    jiraWorklogId: event.worklog.id,
    authorAccountId,
    kimaiUserId: userMapping?.kimaiUserId,
    kimaiProjectId: config.defaultProjectId,
    kimaiActivityId: config.defaultActivityId,
    started: event.worklog.started,
    timeSpentSeconds: event.worklog.timeSpentSeconds,
    comment: jiraCommentToText(event.worklog.comment),
    selfGenerated: event.selfGenerated,
  });
}

export function jiraCommentToText(comment: unknown): string | undefined {
  if (typeof comment === 'string') {
    return comment;
  }

  if (!comment || typeof comment !== 'object') {
    return undefined;
  }

  const visit = (node: unknown): string => {
    if (!node || typeof node !== 'object') {
      return '';
    }

    const value = node as { type?: unknown; text?: unknown; content?: unknown };
    if (typeof value.text === 'string') {
      return value.text;
    }
    if (value.type === 'hardBreak') {
      return '\n';
    }

    const text = Array.isArray(value.content) ? value.content.map(visit).join('') : '';
    return isAdfBlock(value.type) && text && !text.endsWith('\n') ? `${text}\n` : text;
  };

  const text = visit(comment).replace(/\n$/, '');
  return text || undefined;
}

function isAdfBlock(type: unknown): boolean {
  return type === 'paragraph' || type === 'heading' || type === 'blockquote' || type === 'codeBlock';
}
