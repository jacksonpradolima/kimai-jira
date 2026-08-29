import * as crypto from 'crypto';
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
  return { config, sync };
});

resolver.define('saveConnectionSettings', async (request) => {
  const payload = request.payload as {
    url?: string;
    apiToken?: string;
    defaultProjectId?: number | string;
    defaultActivityId?: number | string;
  };

  const existing = await getKimaiConfig();
  const config: KimaiConfig = {
    url: payload.url ?? existing?.url ?? '',
    hasToken: Boolean(payload.apiToken) || Boolean(existing?.hasToken),
    defaultProjectId: coerceId(payload.defaultProjectId) ?? existing?.defaultProjectId,
    defaultActivityId: coerceId(payload.defaultActivityId) ?? existing?.defaultActivityId,
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

function coerceId(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const handler = resolver.getDefinitions();
