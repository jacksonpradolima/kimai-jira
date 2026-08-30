const mockGetMappingByJiraWorklogId = jest.fn();
const mockSyncKimaiTimesheetToJira = jest.fn();
const mockGetUserMappingByKimaiUserId = jest.fn();

jest.mock('../../src/sync/mapping', () => ({
  getMappingByJiraWorklogId: mockGetMappingByJiraWorklogId,
}));
jest.mock('../../src/sync/kimai-to-jira', () => ({
  syncKimaiTimesheetToJira: mockSyncKimaiTimesheetToJira,
}));
jest.mock('../../src/storage/users', () => ({
  getUserMappingByKimaiUserId: mockGetUserMappingByKimaiUserId,
}));

import { handleTimesheetCreated } from '../../src/webhooks/handlers/timesheet-created';

describe('handleTimesheetCreated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMappingByKimaiUserId.mockResolvedValue({ jiraAccountId: 'account', enabled: true });
  });

  it('ignores a correlated create webhook until the Jira-originated mapping exists', async () => {
    mockGetMappingByJiraWorklogId.mockResolvedValue(undefined);
    const client = {};

    await handleTimesheetCreated(client as never, {
      id: 8291,
      user: 42,
      begin: '2026-08-27T10:00:00.000Z',
      end: '2026-08-27T11:00:00.000Z',
      description: '[kimai-jira-worklog:100271] [BA-3] 1-1 Meetings',
    });

    expect(mockGetMappingByJiraWorklogId).toHaveBeenCalledWith('100271');
    expect(mockSyncKimaiTimesheetToJira).not.toHaveBeenCalled();
  });

  it('rejects a completed timesheet whose owner has no enabled mapping', async () => {
    mockGetUserMappingByKimaiUserId.mockResolvedValue(undefined);

    await handleTimesheetCreated({} as never, {
      id: 8291, user: 99, begin: '2026-08-27T10:00:00.000Z', end: '2026-08-27T11:00:00.000Z',
      description: '[BA-3] Unmapped time',
    });

    expect(mockSyncKimaiTimesheetToJira).not.toHaveBeenCalled();
  });
});
