import { ForgeKvsAPIError, kvs } from '@forge/kvs';

function timerStartReservationKey(kimaiUserId: number): string {
  return `timer:start:${kimaiUserId}`;
}

export async function claimTimerStart(kimaiUserId: number): Promise<boolean> {
  try {
    await kvs.set(
      timerStartReservationKey(kimaiUserId),
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

export async function releaseTimerStart(kimaiUserId: number): Promise<void> {
  await kvs.delete(timerStartReservationKey(kimaiUserId));
}
