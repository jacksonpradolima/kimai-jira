import { ForgeKvsAPIError, kvs } from '@forge/kvs';
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
  const claimed = await claimKimaiUserMapping(mapping.kimaiUserId);
  if (!claimed) {
    throw new Error('Another Kimai connection is being saved. Try again.');
  }

  try {
    const [previous, owner] = await Promise.all([
      getUserMapping(mapping.jiraAccountId),
      getUserMappingByKimaiUserId(mapping.kimaiUserId),
    ]);
    if (owner && owner.jiraAccountId !== mapping.jiraAccountId) {
      throw new Error('This Kimai user is already connected to another Jira account.');
    }

    const transaction = kvs.transact();
    if (previous && previous.kimaiUserId !== mapping.kimaiUserId) {
      transaction.delete(kimaiUserKey(previous.kimaiUserId));
    }
    await transaction
      .set(userKey(mapping.jiraAccountId), mapping)
      .set(kimaiUserKey(mapping.kimaiUserId), mapping)
      .execute();
  } finally {
    await releaseKimaiUserMapping(mapping.kimaiUserId);
  }
}

export async function deleteUserMapping(jiraAccountId: string): Promise<void> {
  const previous = await getUserMapping(jiraAccountId);
  const reverseMapping = previous
    ? await getUserMappingByKimaiUserId(previous.kimaiUserId)
    : undefined;
  const transaction = kvs.transact().delete(userKey(jiraAccountId));
  if (previous && reverseMapping?.jiraAccountId === jiraAccountId) {
    transaction.delete(kimaiUserKey(previous.kimaiUserId));
  }
  await transaction.execute();
}

function kimaiUserMappingClaimKey(kimaiUserId: number): string {
  return `user:kimai:claim:${kimaiUserId}`;
}

async function claimKimaiUserMapping(kimaiUserId: number): Promise<boolean> {
  try {
    await kvs.set(
      kimaiUserMappingClaimKey(kimaiUserId),
      { claimedAt: new Date().toISOString() },
      { keyPolicy: 'FAIL_IF_EXISTS', ttl: { value: 1, unit: 'MINUTES' } },
    );
    return true;
  } catch (error) {
    if (error instanceof ForgeKvsAPIError && error.responseDetails.status === 409) {
      return false;
    }
    throw error;
  }
}

async function releaseKimaiUserMapping(kimaiUserId: number): Promise<void> {
  await kvs.delete(kimaiUserMappingClaimKey(kimaiUserId));
}
