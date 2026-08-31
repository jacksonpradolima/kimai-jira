import { kvs } from '@forge/kvs';
import { KimaiConfig, SyncSettings } from '../shared/types';

const CONFIG_KEY = 'config:kimai';
const SYNC_SETTINGS_KEY = 'config:sync';

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  jiraToKimai: true,
  kimaiToJira: true,
  allowCreate: true,
  allowUpdate: true,
  allowDelete: false,
};

/**
 * Public (non-secret) Kimai connection configuration. Each Jira user stores
 * their own Kimai API token in the Forge Secret Store; see `storage/secrets.ts`.
 */
export async function getKimaiConfig(): Promise<KimaiConfig | undefined> {
  return kvs.get<KimaiConfig>(CONFIG_KEY);
}

export async function setKimaiConfig(config: KimaiConfig): Promise<void> {
  await kvs.set(CONFIG_KEY, config);
}

export async function getSyncSettings(): Promise<SyncSettings> {
  const stored = await kvs.get<SyncSettings>(SYNC_SETTINGS_KEY);
  return { ...DEFAULT_SYNC_SETTINGS, ...stored };
}

export async function setSyncSettings(settings: SyncSettings): Promise<void> {
  await kvs.set(SYNC_SETTINGS_KEY, settings);
}
