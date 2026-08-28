import { kvs } from '@forge/kvs';

const KIMAI_TOKEN_KEY = 'secret:kimai-token';
const KIMAI_WEBHOOK_SECRET_KEY = 'secret:kimai-webhook';

/**
 * Credentials are always stored via the Forge encrypted Secret Store
 * (`kvs.setSecret` / `kvs.getSecret`), never in plain KVS, environment
 * variables committed to Git, or in the app's frontend bundle.
 */
export async function getKimaiApiToken(): Promise<string | undefined> {
  return kvs.getSecret<string>(KIMAI_TOKEN_KEY);
}

export async function setKimaiApiToken(token: string): Promise<void> {
  await kvs.setSecret(KIMAI_TOKEN_KEY, token);
}

export async function clearKimaiApiToken(): Promise<void> {
  await kvs.deleteSecret(KIMAI_TOKEN_KEY);
}

export async function getKimaiWebhookSecret(): Promise<string | undefined> {
  return kvs.getSecret<string>(KIMAI_WEBHOOK_SECRET_KEY);
}

export async function setKimaiWebhookSecret(secret: string): Promise<void> {
  await kvs.setSecret(KIMAI_WEBHOOK_SECRET_KEY, secret);
}
