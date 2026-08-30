import { kvs } from '@forge/kvs';

const KIMAI_WEBHOOK_SECRET_KEY = 'secret:kimai-webhook';

function personalKimaiTokenKey(jiraAccountId: string): string {
  return `secret:kimai-token:${jiraAccountId}`;
}

/**
 * Credentials are always stored via the Forge encrypted Secret Store
 * (`kvs.setSecret` / `kvs.getSecret`), never in plain KVS, environment
 * variables committed to Git, or in the app's frontend bundle.
 */
export async function getPersonalKimaiApiToken(jiraAccountId: string): Promise<string | undefined> {
  return kvs.getSecret<string>(personalKimaiTokenKey(jiraAccountId));
}

export async function setPersonalKimaiApiToken(jiraAccountId: string, token: string): Promise<void> {
  await kvs.setSecret(personalKimaiTokenKey(jiraAccountId), token);
}

export async function clearPersonalKimaiApiToken(jiraAccountId: string): Promise<void> {
  await kvs.deleteSecret(personalKimaiTokenKey(jiraAccountId));
}

export async function getKimaiWebhookSecret(): Promise<string | undefined> {
  return kvs.getSecret<string>(KIMAI_WEBHOOK_SECRET_KEY);
}

export async function setKimaiWebhookSecret(secret: string): Promise<void> {
  await kvs.setSecret(KIMAI_WEBHOOK_SECRET_KEY, secret);
}
