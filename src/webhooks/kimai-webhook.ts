import { WebTriggerRequest, WebTriggerResponse } from '@forge/api';
import { ForgeJiraClient } from '../jira/client';
import { getKimaiWebhookSecret } from '../storage/secrets';
import { verifyWebhookSignature } from './verify-signature';
import { handleTimesheetCreated, KimaiTimesheetPayload } from './handlers/timesheet-created';
import { handleTimesheetUpdated } from './handlers/timesheet-updated';
import { logger } from '../shared/logger';
import { toSafeUserMessage } from '../shared/errors';

interface KimaiWebhookEnvelope {
  event: 'timesheet.created' | 'timesheet.updated';
  payload: KimaiTimesheetPayload;
}

function firstHeader(headers: Record<string, string[]>, name: string): string | undefined {
  const key = Object.keys(headers).find((h) => h.toLowerCase() === name.toLowerCase());
  return key ? headers[key][0] : undefined;
}

/**
 * Forge web trigger entry point for incoming Kimai webhooks.
 *
 * Web trigger URLs are publicly reachable without Atlassian authentication,
 * so every request must be validated against the shared webhook secret
 * before any data is written.
 */
export async function handler(request: WebTriggerRequest): Promise<WebTriggerResponse> {
  const secret = await getKimaiWebhookSecret();
  const signature = firstHeader(request.headers, 'x-kimai-signature');

  if (!secret || !verifyWebhookSignature(request.body, signature, secret)) {
    logger.warn({ event: 'webhook.rejected', result: 'failure' });
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  try {
    const envelope = JSON.parse(request.body) as KimaiWebhookEnvelope;
    const client = new ForgeJiraClient();

    if (envelope.event === 'timesheet.created') {
      await handleTimesheetCreated(client, envelope.payload);
    } else if (envelope.event === 'timesheet.updated') {
      await handleTimesheetUpdated(client, envelope.payload);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    logger.error({ event: 'webhook.processing_failed', result: 'failure' });
    return { statusCode: 500, body: JSON.stringify({ error: toSafeUserMessage(error) }) };
  }
}
