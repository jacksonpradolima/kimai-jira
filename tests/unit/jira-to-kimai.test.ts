jest.mock('../../src/storage/mappings', () => ({
  saveWorklogMapping: jest.fn().mockResolvedValue(undefined),
  claimJiraWorklogSync: jest.fn().mockResolvedValue(true),
  claimMappingPairSync: jest.fn().mockResolvedValue(true),
  deletePendingKimaiTimesheetCreation: jest.fn().mockResolvedValue(undefined),
  getMappingByJiraWorklogId: jest.fn().mockResolvedValue(undefined),
  getMappingByKimaiTimesheetId: jest.fn().mockResolvedValue(undefined),
  getPendingKimaiTimesheetCreation: jest.fn().mockResolvedValue(undefined),
  releaseJiraWorklogSync: jest.fn().mockResolvedValue(undefined),
  releaseMappingPairSync: jest.fn().mockResolvedValue(undefined),
  savePendingKimaiTimesheetCreation: jest.fn().mockResolvedValue(undefined),
}));

import { KimaiClient } from '../../src/kimai/client';
import { syncJiraWorklogToKimai } from '../../src/sync/jira-to-kimai';
import { computeContentHash } from '../../src/sync/idempotency';
import * as mappingsStorage from '../../src/storage/mappings';

function buildClient(overrides: Partial<KimaiClient> = {}): KimaiClient {
  return {
    getCurrentUser: jest.fn(),
    getTimesheet: jest.fn(),
    getActiveTimesheets: jest.fn(),
    createTimesheet: jest.fn().mockResolvedValue({ id: 8291 }),
    updateTimesheet: jest.fn().mockResolvedValue({ id: 8291 }),
    deleteTimesheet: jest.fn(),
    startTimer: jest.fn(),
    stopTimer: jest.fn(),
    getCustomers: jest.fn(),
    getProjects: jest.fn(),
    getActivities: jest.fn(),
    createProject: jest.fn(),
    createActivity: jest.fn(),
    ...overrides,
  };
}

const baseChange = {
  jiraIssueId: '10001',
  jiraIssueKey: 'BA-3',
  jiraWorklogId: '100271',
  authorAccountId: '712020:abc123',
  kimaiUserId: 42,
  kimaiProjectId: 1,
  kimaiActivityId: 2,
  started: '2026-08-27T10:00:00.000Z',
  timeSpentSeconds: 3600,
  comment: '1-1 Meetings',
};

describe('syncJiraWorklogToKimai', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mappingsStorage.claimJiraWorklogSync as jest.Mock).mockReset().mockResolvedValue(true);
    (mappingsStorage.deletePendingKimaiTimesheetCreation as jest.Mock).mockReset().mockResolvedValue(undefined);
    (mappingsStorage.getMappingByJiraWorklogId as jest.Mock).mockReset().mockResolvedValue(undefined);
    (mappingsStorage.getPendingKimaiTimesheetCreation as jest.Mock).mockReset().mockResolvedValue(undefined);
    (mappingsStorage.releaseJiraWorklogSync as jest.Mock).mockReset().mockResolvedValue(undefined);
    (mappingsStorage.savePendingKimaiTimesheetCreation as jest.Mock).mockReset().mockResolvedValue(undefined);
    (mappingsStorage.saveWorklogMapping as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  it('creates a Kimai timesheet for a new worklog', async () => {
    const client = buildClient();
    const mapping = await syncJiraWorklogToKimai(client, baseChange);

    expect(client.createTimesheet).toHaveBeenCalledTimes(1);
    expect(client.createTimesheet).toHaveBeenCalledWith(
      expect.objectContaining({
        user: baseChange.kimaiUserId,
        description: '[kimai-jira-worklog:100271] [BA-3] 1-1 Meetings',
      }),
    );
    expect(mapping?.kimaiTimesheetId).toBe(8291);
    expect(mapping?.jiraWorklogId).toBe('100271');
  });

  it('waits for an existing sync claim before applying the worklog', async () => {
    (mappingsStorage.claimJiraWorklogSync as jest.Mock).mockResolvedValueOnce(false);

    const client = buildClient();
    const mapping = await syncJiraWorklogToKimai(client, baseChange);

    expect(mappingsStorage.claimJiraWorklogSync).toHaveBeenCalledTimes(2);
    expect(client.createTimesheet).toHaveBeenCalledTimes(1);
    expect(mapping?.kimaiTimesheetId).toBe(8291);
    expect(mappingsStorage.releaseJiraWorklogSync).toHaveBeenCalledWith('100271');
  });

  it('skips self-generated events to prevent sync loops', async () => {
    const client = buildClient();
    const mapping = await syncJiraWorklogToKimai(client, {
      ...baseChange,
      selfGenerated: true,
    });

    expect(client.createTimesheet).not.toHaveBeenCalled();
    expect(client.updateTimesheet).not.toHaveBeenCalled();
    expect(mapping).toBeUndefined();
  });

  it('updates the existing timesheet instead of creating a duplicate', async () => {
    (mappingsStorage.getMappingByJiraWorklogId as jest.Mock).mockResolvedValueOnce({
      jiraIssueId: '10001',
      jiraIssueKey: 'BA-3',
      jiraWorklogId: '100271',
      kimaiTimesheetId: 8291,
      origin: 'jira',
      lastSyncedAt: '2026-08-27T09:00:00.000Z',
      lastHash: 'stale-hash',
    });

    const client = buildClient();
    await syncJiraWorklogToKimai(client, baseChange);

    expect(client.createTimesheet).not.toHaveBeenCalled();
    expect(client.updateTimesheet).toHaveBeenCalledWith(8291, expect.any(Object));
  });

  it('is idempotent for a replayed event with an unchanged hash', async () => {
    const change = baseChange;
    (mappingsStorage.getMappingByJiraWorklogId as jest.Mock).mockResolvedValue({
      jiraIssueId: change.jiraIssueId,
      jiraIssueKey: change.jiraIssueKey,
      jiraWorklogId: change.jiraWorklogId,
      kimaiTimesheetId: 8291,
      origin: 'jira',
      lastSyncedAt: '2026-08-27T09:00:00.000Z',
      lastHash: computeContentHash({
        jiraIssueKey: change.jiraIssueKey,
        started: '2026-08-27T10:00:00.000Z',
        duration: change.timeSpentSeconds,
        comment: change.comment,
      }),
    });

    const client = buildClient();
    await syncJiraWorklogToKimai(client, change);

    expect(client.createTimesheet).not.toHaveBeenCalled();
    expect(client.updateTimesheet).not.toHaveBeenCalled();
  });

  it('ignores an older Jira worklog revision after a newer revision was recorded', async () => {
    (mappingsStorage.getMappingByJiraWorklogId as jest.Mock).mockResolvedValueOnce({
      jiraIssueId: '10001', jiraIssueKey: 'BA-3', jiraWorklogId: '100271', kimaiTimesheetId: 8291,
      origin: 'jira', lastSyncedAt: '2026-08-27T09:00:00.000Z',
      lastJiraUpdatedAt: '2026-08-27T12:00:00.000Z',
    });
    const client = buildClient();

    const mapping = await syncJiraWorklogToKimai(client, {
      ...baseChange,
      updated: '2026-08-27T11:00:00.000Z',
      comment: 'Delayed change',
    });

    expect(client.updateTimesheet).not.toHaveBeenCalled();
    expect(mapping).toEqual(expect.objectContaining({ kimaiTimesheetId: 8291 }));
  });

  it('recovers a created timesheet when mapping persistence fails', async () => {
    const hash = computeContentHash({
      jiraIssueKey: baseChange.jiraIssueKey,
      started: baseChange.started,
      duration: baseChange.timeSpentSeconds,
      comment: baseChange.comment,
    });
    const pendingMapping = {
      jiraIssueId: baseChange.jiraIssueId,
      jiraIssueKey: baseChange.jiraIssueKey,
      jiraWorklogId: baseChange.jiraWorklogId,
      kimaiTimesheetId: 8291,
      origin: 'jira' as const,
      lastSyncedAt: '2026-08-27T09:00:00.000Z',
      lastHash: hash,
    };
    (mappingsStorage.getPendingKimaiTimesheetCreation as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(pendingMapping);
    (mappingsStorage.saveWorklogMapping as jest.Mock)
      .mockRejectedValueOnce(new Error('KVS unavailable'))
      .mockResolvedValueOnce(undefined);
    const client = buildClient();

    await expect(syncJiraWorklogToKimai(client, baseChange)).rejects.toThrow('KVS unavailable');
    const mapping = await syncJiraWorklogToKimai(client, baseChange);

    expect(client.createTimesheet).toHaveBeenCalledTimes(1);
    expect(mappingsStorage.savePendingKimaiTimesheetCreation).toHaveBeenCalledWith(
      baseChange.jiraWorklogId,
      expect.objectContaining({ kimaiTimesheetId: 8291, lastHash: hash }),
    );
    expect(mappingsStorage.deletePendingKimaiTimesheetCreation).toHaveBeenCalledWith(
      baseChange.jiraWorklogId,
    );
    expect(mapping).toEqual(pendingMapping);
  });
});
