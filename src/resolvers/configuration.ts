import * as crypto from 'crypto';
import { webTrigger } from '@forge/api';
import Resolver from '@forge/resolver';
import { getKimaiConfig, getSyncSettings, setKimaiConfig, setSyncSettings } from '../storage/config';
import { getKimaiApiToken, setKimaiApiToken, setKimaiWebhookSecret } from '../storage/secrets';
import { saveUserMapping } from '../storage/users';
import { HttpKimaiClient } from '../kimai/client';
import { toSafeUserMessage } from '../shared/errors';
import { KimaiConfig, SyncSettings, UserMapping } from '../shared/types';

const resolver = new Resolver();

resolver.define('getConfiguration', async () => {
  const [config, sync] = await Promise.all([getKimaiConfig(), getSyncSettings()]);
  let webhookUrl: string | undefined;

  try {
    webhookUrl = await webTrigger.getUrl('kimai-webhook');
  } catch {
    // Connection settings remain usable if Forge cannot provision the URL yet.
  }

  return { config, sync, webhookUrl };
});

resolver.define('saveConnectionSettings', async (request) => {
  const payload = request.payload as {
    url?: string;
    apiToken?: string;
    defaultProjectId?: number | string | null;
    defaultActivityId?: number | string | null;
  };

  const existing = await getKimaiConfig();
  const url = normalizeKimaiUrl(payload.url ?? existing?.url);
  if (!url) {
    return { ok: false, error: 'A valid Kimai URL is required.' };
  }
  const config: KimaiConfig = {
    url,
    hasToken: Boolean(payload.apiToken) || Boolean(existing?.hasToken),
    defaultProjectId: resolveDefaultId(payload, 'defaultProjectId', existing?.defaultProjectId),
    defaultActivityId: resolveDefaultId(payload, 'defaultActivityId', existing?.defaultActivityId),
  };

  if (payload.apiToken) {
    await setKimaiApiToken(payload.apiToken);
  }
  await setKimaiConfig(config);

  return { ok: true, config };
});

resolver.define('saveUserMapping', async (request) => {
  const payload = request.payload as UserMapping;
  const kimaiUserId = coerceId(payload.kimaiUserId);

  if (!payload.jiraAccountId || kimaiUserId === undefined) {
    return { ok: false, error: 'Jira account ID and Kimai user ID are required.' };
  }

  const mapping: UserMapping = {
    jiraAccountId: payload.jiraAccountId,
    kimaiUserId,
    enabled: payload.enabled ?? true,
  };

  await saveUserMapping(mapping);
  return { ok: true, mapping };
});

resolver.define('saveSyncSettings', async (request) => {
  const settings = request.payload as SyncSettings;
  await setSyncSettings(settings);
  return { ok: true, settings };
});

resolver.define('rotateWebhookSecret', async () => {
  const secret = generateSecret();
  await setKimaiWebhookSecret(secret);
  return { ok: true, secret };
});

resolver.define('testConnection', async () => {
  const config = await getKimaiConfig();
  const apiToken = await getKimaiApiToken();

  if (!config || !apiToken) {
    return { ok: false, error: 'Kimai connection is not configured yet.' };
  }

  try {
    const client = new HttpKimaiClient({ baseUrl: config.url, apiToken });
    const user = await client.getCurrentUser();
    return { ok: true, user };
  } catch (error) {
    return { ok: false, error: toSafeUserMessage(error) };
  }
});

function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

function coerceId(value: number | string | null | undefined): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveDefaultId(
  payload: {
    defaultProjectId?: number | string | null;
    defaultActivityId?: number | string | null;
  },
  key: 'defaultProjectId' | 'defaultActivityId',
  existingValue: number | undefined,
): number | undefined {
  return Object.prototype.hasOwnProperty.call(payload, key)
    ? coerceId(payload[key])
    : existingValue;
}

function normalizeKimaiUrl(value: string | undefined): string | undefined {
  const url = value?.trim();
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export const handler = resolver.getDefinitions();
