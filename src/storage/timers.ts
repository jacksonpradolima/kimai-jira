import { ForgeKvsAPIError, kvs } from '@forge/kvs';

function timerStartReservationKey(kimaiUserId: number, jiraIssueKey: string): string {
  return `timer:start:${kimaiUserId}:${jiraIssueKey}`;
}

export async function claimTimerStart(kimaiUserId: number, jiraIssueKey: string): Promise<boolean> {
  try {
    await kvs.set(
      timerStartReservationKey(kimaiUserId, jiraIssueKey),
      { claimedAt: new Date().toISOString() },
      {
        keyPolicy: 'FAIL_IF_EXISTS',
        ttl: { value: 1, unit: 'MINUTES' },
      },
    );
    return true;
  } catch (error) {
    if (error instanceof ForgeKvsAPIError && error.responseDetails.status === 409) {
      return false;
    }
    throw error;
  }
}

export async function releaseTimerStart(kimaiUserId: number, jiraIssueKey: string): Promise<void> {
  await kvs.delete(timerStartReservationKey(kimaiUserId, jiraIssueKey));
}
