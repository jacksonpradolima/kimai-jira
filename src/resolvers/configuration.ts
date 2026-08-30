import * as crypto from 'crypto';
import { webTrigger } from '@forge/api';
import Resolver from '@forge/resolver';
import { getKimaiConfig, getSyncSettings, setKimaiConfig, setSyncSettings } from '../storage/config';
import { setKimaiWebhookSecret } from '../storage/secrets';
import { KimaiConfig, SyncSettings } from '../shared/types';

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
    defaultProjectId?: number | string | null;
    defaultActivityId?: number | string | null;
  };

  const existing = await getKimaiConfig();
  const url = normalizeKimaiUrl(payload.url ?? existing?.url);
  if (!url) {
    return { ok: false, error: 'A valid Kimai URL is required.' };
  }
  if (existing?.url && existing.url !== url) {
    return {
      ok: false,
      error: 'Changing the Kimai URL requires reconnecting the personal Kimai token for each user.',
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, 'defaultProjectId')
    && payload.defaultProjectId !== null
    && payload.defaultProjectId !== undefined
    && payload.defaultProjectId !== ''
    && coerceId(payload.defaultProjectId) === undefined
  ) {
    return { ok: false, error: 'The default Kimai project ID must be a positive integer.' };
  }
  if (
    Object.prototype.hasOwnProperty.call(payload, 'defaultActivityId')
    && payload.defaultActivityId !== null
    && payload.defaultActivityId !== undefined
    && payload.defaultActivityId !== ''
    && coerceId(payload.defaultActivityId) === undefined
  ) {
    return { ok: false, error: 'The default Kimai activity ID must be a positive integer.' };
  }

  const defaultProjectId = resolveDefaultId(payload, 'defaultProjectId', existing?.defaultProjectId);
  const defaultActivityId = resolveDefaultId(payload, 'defaultActivityId', existing?.defaultActivityId);

  const config: KimaiConfig = {
    url,
    defaultProjectId,
    defaultActivityId,
  };
  await setKimaiConfig(config);

  return { ok: true, config };
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

function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

function coerceId(value: number | string | null | undefined): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
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
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
      return undefined;
    }
    return parsed.origin.replace(/\/$/, '') + parsed.pathname.replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

export const handler = resolver.getDefinitions();
