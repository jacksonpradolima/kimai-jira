import { ForgeJiraClient } from './client';
import { HttpKimaiClient } from '../kimai/client';
import { getKimaiConfig, getSyncSettings } from '../storage/config';
import { getPersonalKimaiApiToken } from '../storage/secrets';
import { getUserMapping, getUserMappingByKimaiUserId } from '../storage/users';
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
    updated?: string;
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
  const sync = await getSyncSettings();
  if (!sync.jiraToKimai) {
    logger.info({ event: 'worklog.sync_disabled', direction: 'jira-to-kimai', jiraWorklogId: event.worklog.id, result: 'success' });
    return;
  }
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
  if (event.eventType === 'avi:jira:created:worklog' && !sync.allowCreate) return;
  if (event.eventType === 'avi:jira:updated:worklog' && !sync.allowUpdate) return;

  const jiraIssueKey = event.issue?.key ?? (await new ForgeJiraClient().getIssueKey(event.worklog.issueId));
  const authorAccountId = event.worklog.author?.accountId ?? event.worklog.authorAccountId;
  const [config, existingMapping, authorMapping] = await Promise.all([
    getKimaiConfig(),
    getMappingByJiraWorklogId(event.worklog.id),
    authorAccountId ? getUserMapping(authorAccountId) : Promise.resolve(undefined),
  ]);
  const mappedOwner = existingMapping?.kimaiUserId
    ? await getUserMappingByKimaiUserId(existingMapping.kimaiUserId)
    : undefined;
  const userMapping = mappedOwner ?? authorMapping;
  const tokenAccountId = userMapping?.jiraAccountId;
  const apiToken = tokenAccountId ? await getPersonalKimaiApiToken(tokenAccountId) : undefined;

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

  if (userMapping && userMapping.kimaiBaseUrl !== config.url) {
    logger.warn({
      event: 'worklog.sync_skipped_reconnect_required', direction: 'jira-to-kimai',
      jiraWorklogId: event.worklog.id, result: 'failure',
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
    authorAccountId: userMapping?.jiraAccountId ?? authorAccountId,
    kimaiUserId: userMapping?.kimaiUserId ?? existingMapping?.kimaiUserId,
    kimaiProjectId: config.defaultProjectId,
    kimaiActivityId: config.defaultActivityId,
    started: event.worklog.started,
    updated: event.worklog.updated,
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

    const value = node as {
      type?: unknown;
      text?: unknown;
      content?: unknown;
      attrs?: { text?: unknown; shortName?: unknown; displayName?: unknown; id?: unknown };
    };
    if (typeof value.text === 'string') {
      return value.text;
    }
    if (value.type === 'hardBreak') {
      return '\n';
    }
    if (value.type === 'mention' && value.attrs) {
      const mentionText = value.attrs.text ?? value.attrs.displayName ?? value.attrs.id;
      return typeof mentionText === 'string' ? mentionText : '';
    }
    if (value.type === 'emoji' && value.attrs) {
      const emojiText = value.attrs.text ?? value.attrs.shortName;
      return typeof emojiText === 'string' ? emojiText : '';
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
