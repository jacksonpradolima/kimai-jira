const mockGetIssueKey = jest.fn();
const mockGetKimaiConfig = jest.fn();
const mockGetKimaiApiToken = jest.fn();
const mockGetUserMapping = jest.fn();
const mockSyncJiraWorklogToKimai = jest.fn();

jest.mock('../../src/jira/client', () => ({
  ForgeJiraClient: jest.fn(() => ({ getIssueKey: mockGetIssueKey })),
}));
jest.mock('../../src/storage/config', () => ({ getKimaiConfig: mockGetKimaiConfig }));
jest.mock('../../src/storage/secrets', () => ({ getKimaiApiToken: mockGetKimaiApiToken }));
jest.mock('../../src/storage/users', () => ({ getUserMapping: mockGetUserMapping }));
jest.mock('../../src/sync/jira-to-kimai', () => ({
  syncJiraWorklogToKimai: mockSyncJiraWorklogToKimai,
}));

import { handler, jiraCommentToText } from '../../src/jira/worklog-events';

describe('Jira worklog event handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIssueKey.mockResolvedValue('BA-3');
    mockGetKimaiConfig.mockResolvedValue({
      url: 'https://kimai.example.test',
      hasToken: true,
      defaultProjectId: 1,
      defaultActivityId: 2,
    });
    mockGetKimaiApiToken.mockResolvedValue('token');
    mockGetUserMapping.mockResolvedValue({ kimaiUserId: 42, enabled: true });
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
});
