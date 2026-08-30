jest.mock('../../src/storage/mappings', () => ({
  saveWorklogMapping: jest.fn().mockResolvedValue(undefined),
  claimKimaiTimesheetSync: jest.fn().mockResolvedValue(true),
  claimMappingPairSync: jest.fn().mockResolvedValue(true),
  deletePendingJiraWorklogCreation: jest.fn().mockResolvedValue(undefined),
  getMappingByJiraWorklogId: jest.fn().mockResolvedValue(undefined),
  getMappingByKimaiTimesheetId: jest.fn().mockResolvedValue(undefined),
  getPendingJiraWorklogCreation: jest.fn().mockResolvedValue(undefined),
  releaseKimaiTimesheetSync: jest.fn().mockResolvedValue(undefined),
  releaseMappingPairSync: jest.fn().mockResolvedValue(undefined),
  savePendingJiraWorklogCreation: jest.fn().mockResolvedValue(undefined),
}));

import { JiraClient } from '../../src/jira/client';
import { computeContentHash } from '../../src/sync/idempotency';
import {
  normalizeKimaiDescription,
  syncKimaiTimesheetToJira,
} from '../../src/sync/kimai-to-jira';
import * as mappingsStorage from '../../src/storage/mappings';

function buildClient(overrides: Partial<JiraClient> = {}): JiraClient {
  return {
    createWorklog: jest.fn().mockResolvedValue({
      id: '100271',
      issueId: '10001',
      started: '2026-08-27T10:00:00.000Z',
      timeSpentSeconds: 3600,
      comment: '1-1 Meetings',
    }),
    updateWorklog: jest.fn().mockResolvedValue({
      id: '100271',
      issueId: '10001',
      started: '2026-08-27T10:00:00.000Z',
      timeSpentSeconds: 3600,
      comment: '1-1 Meetings',
    }),
    getWorklog: jest.fn(),
    deleteWorklog: jest.fn(),
    ...overrides,
  };
}

const baseChange = {
  kimaiTimesheetId: 8291,
  jiraIssueKey: 'BA-3',
  begin: '2026-08-27T10:00:00.000Z',
  end: '2026-08-27T11:00:00.000Z',
  description: '[BA-3] 1-1 Meetings',
};

describe('normalizeKimaiDescription', () => {
  it('removes a leading Jira issue marker from Kimai descriptions', () => {
    expect(normalizeKimaiDescription('[BA-3] 1-1 Meetings', 'BA-3')).toBe('1-1 Meetings');
  });

  it('leaves descriptions for other issues unchanged', () => {
    expect(normalizeKimaiDescription('[BA-4] 1-1 Meetings', 'BA-3')).toBe(
      '[BA-4] 1-1 Meetings',
    );
  });

  it('removes Jira worklog correlations before syncing a description back to Jira', () => {
    expect(
      normalizeKimaiDescription('[kimai-jira-worklog:100271] [BA-3] 1-1 Meetings', 'BA-3'),
    ).toBe('1-1 Meetings');
  });
});

describe('syncKimaiTimesheetToJira', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates Jira worklogs with the canonical comment and issue ID mapping', async () => {
    const client = buildClient();
    const mapping = await syncKimaiTimesheetToJira(client, baseChange);

    expect(client.createWorklog).toHaveBeenCalledWith({
      issueIdOrKey: 'BA-3',
      started: '2026-08-27T10:00:00.000Z',
      timeSpentSeconds: 3600,
      comment: '[kimai-jira-timesheet:8291] 1-1 Meetings',
    });
    expect(mapping?.jiraIssueId).toBe('10001');
    expect(mapping?.lastHash).toBe(
      computeContentHash({
        jiraIssueKey: 'BA-3',
        started: baseChange.begin,
        duration: 3600,
        comment: '1-1 Meetings',
      }),
    );
  });

  it('skips Jira-originated Kimai webhook echoes with unchanged canonical content', async () => {
    (mappingsStorage.getMappingByKimaiTimesheetId as jest.Mock).mockResolvedValueOnce({
      jiraIssueId: '10001',
      jiraIssueKey: 'BA-3',
      jiraWorklogId: '100271',
      kimaiTimesheetId: 8291,
      origin: 'jira',
      lastSyncedAt: '2026-08-27T09:00:00.000Z',
      lastHash: computeContentHash({
        jiraIssueKey: 'BA-3',
        started: baseChange.begin,
        duration: 3600,
        comment: '1-1 Meetings',
      }),
    });

    const client = buildClient();
    await syncKimaiTimesheetToJira(client, baseChange);

    expect(client.createWorklog).not.toHaveBeenCalled();
    expect(client.updateWorklog).not.toHaveBeenCalled();
  });

  it('advances the Kimai revision watermark for a duplicate echo', async () => {
    const hash = computeContentHash({
      jiraIssueKey: 'BA-3', started: baseChange.begin, duration: 3600, comment: '1-1 Meetings',
    });
    (mappingsStorage.getMappingByKimaiTimesheetId as jest.Mock).mockResolvedValueOnce({
      jiraIssueId: '10001', jiraIssueKey: 'BA-3', jiraWorklogId: '100271', kimaiTimesheetId: 8291,
      origin: 'jira', lastSyncedAt: '2026-08-27T09:00:00.000Z', lastHash: hash,
      lastKimaiModifiedAt: '2026-08-27T10:00:00.000Z',
    });
    const client = buildClient();

    await syncKimaiTimesheetToJira(client, {
      ...baseChange, modifiedAt: '2026-08-27T12:00:00.000Z',
    });

    expect(client.updateWorklog).not.toHaveBeenCalled();
    expect(mappingsStorage.saveWorklogMapping).toHaveBeenCalledWith(expect.objectContaining({
      lastKimaiModifiedAt: '2026-08-27T12:00:00.000Z',
    }));
  });

  it('rejects invalid timestamps before sending to Jira', async () => {
    const client = buildClient();

    await expect(
      syncKimaiTimesheetToJira(client, { ...baseChange, begin: 'invalid' }),
    ).rejects.toThrow(RangeError);
    expect(client.createWorklog).not.toHaveBeenCalled();
    expect(client.updateWorklog).not.toHaveBeenCalled();
  });

  it('ignores a delayed Kimai revision after a newer one was applied', async () => {
    (mappingsStorage.getMappingByKimaiTimesheetId as jest.Mock).mockResolvedValueOnce({
      jiraIssueId: '10001', jiraIssueKey: 'BA-3', jiraWorklogId: '100271', kimaiTimesheetId: 8291,
      origin: 'kimai', lastSyncedAt: '2026-08-27T09:00:00.000Z', lastHash: 'newer',
      lastKimaiModifiedAt: '2026-08-27T12:00:00.000Z',
    });
    const client = buildClient();

    await syncKimaiTimesheetToJira(client, { ...baseChange, modifiedAt: '2026-08-27T11:00:00.000Z' });

    expect(client.updateWorklog).not.toHaveBeenCalled();
  });

  it('waits for an existing sync claim before applying the timesheet', async () => {
    (mappingsStorage.claimKimaiTimesheetSync as jest.Mock).mockResolvedValueOnce(false);

    const client = buildClient();
    const mapping = await syncKimaiTimesheetToJira(client, baseChange);

    expect(mappingsStorage.claimKimaiTimesheetSync).toHaveBeenCalledTimes(2);
    expect(client.createWorklog).toHaveBeenCalledTimes(1);
    expect(mapping?.jiraWorklogId).toBe('100271');
    expect(mappingsStorage.releaseKimaiTimesheetSync).toHaveBeenCalledWith(8291);
  });

  it('recreates the worklog when the Kimai issue marker changes', async () => {
    (mappingsStorage.getMappingByKimaiTimesheetId as jest.Mock).mockResolvedValueOnce({
      jiraIssueId: '10001',
      jiraIssueKey: 'BA-3',
      jiraWorklogId: '100271',
      kimaiTimesheetId: 8291,
      origin: 'kimai',
      lastSyncedAt: '2026-08-27T09:00:00.000Z',
      lastHash: 'stale-hash',
    });
    const client = buildClient({
      createWorklog: jest.fn().mockResolvedValue({
        id: '100272',
        issueId: '10002',
        started: baseChange.begin,
        timeSpentSeconds: 3600,
      }),
    });

    const mapping = await syncKimaiTimesheetToJira(client, {
      ...baseChange,
      jiraIssueKey: 'BA-4',
      description: '[BA-4] 1-1 Meetings',
    });

    expect(client.deleteWorklog).toHaveBeenCalledWith('BA-3', '100271');
    expect(client.createWorklog).toHaveBeenCalledWith(
      expect.objectContaining({ issueIdOrKey: 'BA-4' }),
    );
    expect(client.updateWorklog).not.toHaveBeenCalled();
    expect(mapping).toEqual(expect.objectContaining({ jiraIssueKey: 'BA-4', jiraWorklogId: '100272' }));
  });

  it('keeps the old worklog when replacement creation fails', async () => {
    (mappingsStorage.getMappingByKimaiTimesheetId as jest.Mock).mockResolvedValueOnce({
      jiraIssueId: '10001',
      jiraIssueKey: 'BA-3',
      jiraWorklogId: '100271',
      kimaiTimesheetId: 8291,
      origin: 'kimai',
      lastSyncedAt: '2026-08-27T09:00:00.000Z',
      lastHash: 'stale-hash',
    });
    const client = buildClient({ createWorklog: jest.fn().mockRejectedValue(new Error('Jira unavailable')) });

    await expect(
      syncKimaiTimesheetToJira(client, {
        ...baseChange,
        jiraIssueKey: 'BA-4',
        description: '[BA-4] 1-1 Meetings',
      }),
    ).rejects.toThrow('Jira unavailable');

    expect(client.deleteWorklog).not.toHaveBeenCalled();
  });

  it('persists replacement cleanup before deleting the obsolete worklog', async () => {
    const oldMapping = {
      jiraIssueId: '10001',
      jiraIssueKey: 'BA-3',
      jiraWorklogId: '100271',
      kimaiTimesheetId: 8291,
      origin: 'kimai' as const,
      lastSyncedAt: '2026-08-27T09:00:00.000Z',
      lastHash: 'stale-hash',
    };
    const replacementHash = computeContentHash({
      jiraIssueKey: 'BA-4',
      started: baseChange.begin,
      duration: 3600,
      comment: '1-1 Meetings',
    });
    const pendingCleanupMapping = {
      ...oldMapping,
      jiraIssueId: '10002',
      jiraIssueKey: 'BA-4',
      jiraWorklogId: '100272',
      lastHash: replacementHash,
      pendingJiraWorklogDeletion: { jiraIssueKey: 'BA-3', jiraWorklogId: '100271' },
    };
    (mappingsStorage.getMappingByKimaiTimesheetId as jest.Mock)
      .mockResolvedValueOnce(oldMapping)
      .mockResolvedValueOnce(pendingCleanupMapping);
    const deleteWorklog = jest.fn()
      .mockRejectedValueOnce(new Error('Jira unavailable'))
      .mockResolvedValueOnce(undefined);
    const client = buildClient({
      createWorklog: jest.fn().mockResolvedValue({
        id: '100272',
        issueId: '10002',
        started: baseChange.begin,
        timeSpentSeconds: 3600,
      }),
      deleteWorklog,
    });
    const replacement = { ...baseChange, jiraIssueKey: 'BA-4', description: '[BA-4] 1-1 Meetings' };

    await expect(syncKimaiTimesheetToJira(client, replacement)).rejects.toThrow('Jira unavailable');
    await syncKimaiTimesheetToJira(client, replacement);

    expect(client.createWorklog).toHaveBeenCalledTimes(1);
    expect(deleteWorklog).toHaveBeenCalledTimes(2);
    expect(mappingsStorage.saveWorklogMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        jiraWorklogId: '100272',
        pendingJiraWorklogDeletion: { jiraIssueKey: 'BA-3', jiraWorklogId: '100271' },
      }),
    );
  });

  it('recovers a created worklog when mapping persistence fails', async () => {
    const hash = computeContentHash({
      jiraIssueKey: 'BA-3',
      started: baseChange.begin,
      duration: 3600,
      comment: '1-1 Meetings',
    });
    const pendingMapping = {
      jiraIssueId: '10001',
      jiraIssueKey: 'BA-3',
      jiraWorklogId: '100271',
      kimaiTimesheetId: 8291,
      origin: 'kimai' as const,
      lastSyncedAt: '2026-08-27T09:00:00.000Z',
      lastHash: hash,
    };
    (mappingsStorage.getPendingJiraWorklogCreation as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(pendingMapping);
    (mappingsStorage.saveWorklogMapping as jest.Mock)
      .mockRejectedValueOnce(new Error('KVS unavailable'))
      .mockResolvedValueOnce(undefined);
    const client = buildClient();

    await expect(syncKimaiTimesheetToJira(client, baseChange)).rejects.toThrow('KVS unavailable');
    const mapping = await syncKimaiTimesheetToJira(client, baseChange);

    expect(client.createWorklog).toHaveBeenCalledTimes(1);
    expect(mappingsStorage.savePendingJiraWorklogCreation).toHaveBeenCalledWith(
      8291,
      expect.objectContaining({
        jiraWorklogId: '100271',
        kimaiTimesheetId: 8291,
        lastHash: hash,
      }),
    );
    expect(mappingsStorage.deletePendingJiraWorklogCreation).toHaveBeenCalledWith(8291);
    expect(mapping).toEqual(pendingMapping);
  });

  it('clears pending cleanup when Jira reports the obsolete worklog is missing', async () => {
    (mappingsStorage.getMappingByKimaiTimesheetId as jest.Mock).mockResolvedValueOnce({
      jiraIssueId: '10002',
      jiraIssueKey: 'BA-4',
      jiraWorklogId: '100272',
      kimaiTimesheetId: 8291,
      origin: 'kimai',
      lastSyncedAt: '2026-08-27T09:00:00.000Z',
      lastHash: 'stale-hash',
      pendingJiraWorklogDeletion: { jiraIssueKey: 'BA-3', jiraWorklogId: '100271' },
    });
    const client = buildClient({
      deleteWorklog: jest.fn().mockRejectedValue(new Error('Jira worklog delete failed (404 Not Found)')),
    });

    await syncKimaiTimesheetToJira(client, {
      ...baseChange,
      jiraIssueKey: 'BA-4',
      description: '[BA-4] 1-1 Meetings',
    });

    expect(client.updateWorklog).toHaveBeenCalledWith('BA-4', '100272', expect.any(Object));
    expect(mappingsStorage.saveWorklogMapping).toHaveBeenCalledWith(
      expect.objectContaining({ pendingJiraWorklogDeletion: undefined }),
    );
  });
});
