const mockGetMappingByKimaiTimesheetId = jest.fn();
const mockSyncKimaiTimesheetToJira = jest.fn();

jest.mock('../../src/sync/mapping', () => ({
  getMappingByKimaiTimesheetId: mockGetMappingByKimaiTimesheetId,
}));
jest.mock('../../src/sync/kimai-to-jira', () => ({
  syncKimaiTimesheetToJira: mockSyncKimaiTimesheetToJira,
}));

import { handleTimesheetUpdated } from '../../src/webhooks/handlers/timesheet-updated';

describe('handleTimesheetUpdated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the stored issue key when an existing timesheet marker is removed', async () => {
    mockGetMappingByKimaiTimesheetId.mockResolvedValue({ jiraIssueKey: 'BA-3' });
    const client = {};

    await handleTimesheetUpdated(client as never, {
      id: 8291,
      begin: '2026-08-27T10:00:00.000Z',
      end: '2026-08-27T11:00:00.000Z',
      description: '',
    });

    expect(mockSyncKimaiTimesheetToJira).toHaveBeenCalledWith(client, {
      kimaiTimesheetId: 8291,
      jiraIssueKey: 'BA-3',
      begin: '2026-08-27T10:00:00.000Z',
      end: '2026-08-27T11:00:00.000Z',
      description: '',
    });
  });
});
