import { kvs } from '@forge/kvs';
import { UserMapping } from '../shared/types';

function userKey(jiraAccountId: string): string {
  return `user:${jiraAccountId}`;
}

export async function getUserMapping(jiraAccountId: string): Promise<UserMapping | undefined> {
  return kvs.get<UserMapping>(userKey(jiraAccountId));
}

export async function saveUserMapping(mapping: UserMapping): Promise<void> {
  await kvs.set(userKey(mapping.jiraAccountId), mapping);
}

export async function deleteUserMapping(jiraAccountId: string): Promise<void> {
  await kvs.delete(userKey(jiraAccountId));
}
