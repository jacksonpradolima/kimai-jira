const mockGetIssueKey = jest.fn();
const mockGetKimaiConfig = jest.fn();
const mockGetPersonalKimaiApiToken = jest.fn();
const mockGetUserMapping = jest.fn();
const mockGetUserMappingByKimaiUserId = jest.fn();
const mockGetSyncSettings = jest.fn();
const mockGetMappingByJiraWorklogId = jest.fn();
const mockSyncJiraWorklogToKimai = jest.fn();

jest.mock('../../src/jira/client', () => ({
  ForgeJiraClient: jest.fn(() => ({ getIssueKey: mockGetIssueKey })),
}));
jest.mock('../../src/storage/config', () => ({
  getKimaiConfig: mockGetKimaiConfig,
  getSyncSettings: mockGetSyncSettings,
}));
jest.mock('../../src/storage/secrets', () => ({ getPersonalKimaiApiToken: mockGetPersonalKimaiApiToken }));
jest.mock('../../src/storage/users', () => ({
  getUserMapping: mockGetUserMapping,
  getUserMappingByKimaiUserId: mockGetUserMappingByKimaiUserId,
}));
jest.mock('../../src/sync/jira-to-kimai', () => ({
  syncJiraWorklogToKimai: mockSyncJiraWorklogToKimai,
}));
jest.mock('../../src/sync/mapping', () => ({
  getMappingByJiraWorklogId: mockGetMappingByJiraWorklogId,
}));

import { handler, jiraCommentToText } from '../../src/jira/worklog-events';

describe('Jira worklog event handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIssueKey.mockResolvedValue('BA-3');
    mockGetKimaiConfig.mockResolvedValue({
      url: 'https://kimai.example.test',
      defaultProjectId: 1,
      defaultActivityId: 2,
    });
    mockGetPersonalKimaiApiToken.mockResolvedValue('token');
    mockGetUserMapping.mockResolvedValue({
      jiraAccountId: '712020:abc123', kimaiUserId: 42,
      kimaiBaseUrl: 'https://kimai.example.test', enabled: true,
    });
    mockGetUserMappingByKimaiUserId.mockResolvedValue(undefined);
    mockGetSyncSettings.mockResolvedValue({
      jiraToKimai: true, kimaiToJira: true, allowCreate: true, allowUpdate: true, allowDelete: false,
    });
    mockGetMappingByJiraWorklogId.mockResolvedValue(undefined);
  });

  it('uses the Forge event author and resolves the issue key from issueId', async () => {
    await handler({
      eventType: 'avi:jira:created:worklog',
      worklog: {
        id: '100271',
        issueId: '10001',
        author: { accountId: '712020:abc123' },
        started: '2026-08-27T10:00:00.000Z',
        timeSpentSeconds: 3600,
        comment: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Investigation' }] }],
        },
      },
    });

    expect(mockGetIssueKey).toHaveBeenCalledWith('10001');
    expect(mockGetUserMapping).toHaveBeenCalledWith('712020:abc123');
    expect(mockSyncJiraWorklogToKimai).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        jiraIssueKey: 'BA-3',
        authorAccountId: '712020:abc123',
        comment: 'Investigation',
      }),
    );
  });

  it('preserves paragraph and hard-break boundaries in ADF comments', () => {
    expect(
      jiraCommentToText({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Second' },
              { type: 'hardBreak' },
              { type: 'text', text: 'Third' },
            ],
          },
        ],
      }),
    ).toBe('First\nSecond\nThird');
  });

  it('preserves visible mention and emoji nodes in ADF comments', () => {
    expect(jiraCommentToText({
      type: 'doc', content: [{ type: 'paragraph', content: [
        { type: 'text', text: 'Worked with ' },
        { type: 'mention', attrs: { text: '@Alice' } },
        { type: 'text', text: ' ' },
        { type: 'emoji', attrs: { shortName: ':wave:' } },
      ] }],
    })).toBe('Worked with @Alice :wave:');
  });

  it('uses the mapped owner token when Jira reports the app as the author', async () => {
    mockGetUserMapping.mockResolvedValue(undefined);
    mockGetUserMappingByKimaiUserId.mockResolvedValue({
      jiraAccountId: '712020:source', kimaiUserId: 42,
      kimaiBaseUrl: 'https://kimai.example.test', enabled: true,
    });
    mockGetMappingByJiraWorklogId.mockResolvedValue({
      jiraIssueId: '10001',
      jiraIssueKey: 'BA-3',
      jiraWorklogId: '100271',
      kimaiTimesheetId: 8291,
      kimaiUserId: 42,
      origin: 'kimai',
      lastSyncedAt: '2026-08-27T09:00:00.000Z',
    });

    await handler({
      eventType: 'avi:jira:updated:worklog',
      issue: { key: 'BA-3' },
      worklog: {
        id: '100271',
        issueId: '10001',
        author: { accountId: 'forge-app-account' },
        started: '2026-08-27T10:00:00.000Z',
        timeSpentSeconds: 3600,
        comment: 'Updated by Jira administrator',
      },
    });

    expect(mockSyncJiraWorklogToKimai).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        jiraWorklogId: '100271',
        authorAccountId: '712020:source',
        kimaiUserId: 42,
        comment: 'Updated by Jira administrator',
      }),
    );
    expect(mockGetPersonalKimaiApiToken).toHaveBeenCalledWith('712020:source');
  });

  it('does not invoke Jira-to-Kimai sync when the direction is disabled', async () => {
    mockGetSyncSettings.mockResolvedValue({
      jiraToKimai: false, kimaiToJira: true, allowCreate: true, allowUpdate: true, allowDelete: false,
    });

    await handler({
      eventType: 'avi:jira:created:worklog',
      worklog: {
        id: '100271', issueId: '10001', started: '2026-08-27T10:00:00.000Z', timeSpentSeconds: 3600,
      },
    });

    expect(mockSyncJiraWorklogToKimai).not.toHaveBeenCalled();
  });
});
