import * as crypto from 'crypto';
import Resolver from '@forge/resolver';
import { getKimaiConfig, getSyncSettings, setKimaiConfig, setSyncSettings } from '../storage/config';
import { getKimaiApiToken, setKimaiApiToken, setKimaiWebhookSecret } from '../storage/secrets';
import { HttpKimaiClient } from '../kimai/client';
import { toSafeUserMessage } from '../shared/errors';
import { KimaiConfig, SyncSettings } from '../shared/types';

const resolver = new Resolver();

resolver.define('getConfiguration', async () => {
  const [config, sync] = await Promise.all([getKimaiConfig(), getSyncSettings()]);
  return { config, sync };
});

resolver.define('saveConnectionSettings', async (request) => {
  const { url, apiToken } = request.payload as { url: string; apiToken?: string };

  const existing = await getKimaiConfig();
  const config: KimaiConfig = {
    url,
    hasToken: Boolean(apiToken) || Boolean(existing?.hasToken),
  };

  if (apiToken) {
    await setKimaiApiToken(apiToken);
  }
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

export const handler = resolver.getDefinitions();
