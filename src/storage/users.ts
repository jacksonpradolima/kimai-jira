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
  const previous = await getUserMapping(mapping.jiraAccountId);
  const transaction = kvs.transact();
  if (previous && previous.kimaiUserId !== mapping.kimaiUserId) {
    transaction.delete(kimaiUserKey(previous.kimaiUserId));
  }
  await transaction
    .set(userKey(mapping.jiraAccountId), mapping)
    .set(kimaiUserKey(mapping.kimaiUserId), mapping)
    .execute();
}

export async function deleteUserMapping(jiraAccountId: string): Promise<void> {
  const previous = await getUserMapping(jiraAccountId);
  const transaction = kvs.transact().delete(userKey(jiraAccountId));
  if (previous) transaction.delete(kimaiUserKey(previous.kimaiUserId));
  await transaction.execute();
}
