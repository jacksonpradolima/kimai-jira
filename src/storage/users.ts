import { kvs } from '@forge/kvs';
import { UserMapping } from '../shared/types';

function userKey(jiraAccountId: string): string {
  return `user:${jiraAccountId}`;
}

function kimaiUserKey(kimaiUserId: number): string {
  return `user:kimai:${kimaiUserId}`;
}

export async function getUserMapping(jiraAccountId: string): Promise<UserMapping | undefined> {
  return kvs.get<UserMapping>(userKey(jiraAccountId));
}

export async function getUserMappingByKimaiUserId(kimaiUserId: number): Promise<UserMapping | undefined> {
  return kvs.get<UserMapping>(kimaiUserKey(kimaiUserId));
}

export async function saveUserMapping(mapping: UserMapping): Promise<void> {
  await Promise.all([
    kvs.set(userKey(mapping.jiraAccountId), mapping),
    kvs.set(kimaiUserKey(mapping.kimaiUserId), mapping),
  ]);
}

export async function deleteUserMapping(jiraAccountId: string): Promise<void> {
  const mapping = await getUserMapping(jiraAccountId);
  await Promise.all([
    kvs.delete(userKey(jiraAccountId)),
    mapping ? kvs.delete(kimaiUserKey(mapping.kimaiUserId)) : Promise.resolve(),
  ]);
}
