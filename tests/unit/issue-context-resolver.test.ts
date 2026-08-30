const mockDefinitions: Record<string, (request: { payload: unknown; context: Record<string, unknown> }) => unknown> = {};
const mockResolver = {
  define: jest.fn(),
  getDefinitions: jest.fn(() => mockDefinitions),
};
const mockGetKimaiConfig = jest.fn();
const mockGetPersonalKimaiApiToken = jest.fn();
const mockSetPersonalKimaiApiToken = jest.fn();
const mockClearPersonalKimaiApiToken = jest.fn();
const mockGetUserMapping = jest.fn();
const mockSaveUserMapping = jest.fn();
const mockDeleteUserMapping = jest.fn();
const mockGetActiveTimesheets = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockGetTimesheet = jest.fn();
const mockGetCustomers = jest.fn();
const mockGetProjects = jest.fn();
const mockGetActivities = jest.fn();
const mockCreateProject = jest.fn();
const mockCreateActivity = jest.fn();
const mockCreateTimesheet = jest.fn();
const mockStartTimer = jest.fn();
const mockStopTimer = jest.fn();
const mockClaimTimerStart = jest.fn();
const mockReleaseTimerStart = jest.fn();
const mockGetJiraIssueKimaiTarget = jest.fn();
const mockGetJiraProjectCustomerMapping = jest.fn();
const mockSaveJiraIssueKimaiTarget = jest.fn();
const mockSaveJiraProjectCustomerMapping = jest.fn();
const mockGetIssueDetails = jest.fn();
const mockClaimJiraIssueKimaiTarget = jest.fn();
const mockReleaseJiraIssueKimaiTarget = jest.fn();

mockResolver.define.mockImplementation((key: string, callback) => {
  mockDefinitions[key] = callback;
  return mockResolver;
});

jest.mock('@forge/resolver', () => ({
  __esModule: true,
  default: jest.fn(() => mockResolver),
}));
jest.mock('../../src/storage/config', () => ({ getKimaiConfig: mockGetKimaiConfig }));
jest.mock('../../src/storage/secrets', () => ({
  getPersonalKimaiApiToken: mockGetPersonalKimaiApiToken,
  setPersonalKimaiApiToken: mockSetPersonalKimaiApiToken,
  clearPersonalKimaiApiToken: mockClearPersonalKimaiApiToken,
}));
jest.mock('../../src/storage/users', () => ({
  getUserMapping: mockGetUserMapping,
  saveUserMapping: mockSaveUserMapping,
  deleteUserMapping: mockDeleteUserMapping,
}));
jest.mock('../../src/storage/timers', () => ({
  claimTimerStart: mockClaimTimerStart,
  releaseTimerStart: mockReleaseTimerStart,
}));
jest.mock('../../src/storage/issue-targets', () => ({
  getJiraIssueKimaiTarget: mockGetJiraIssueKimaiTarget,
  getJiraProjectCustomerMapping: mockGetJiraProjectCustomerMapping,
  saveJiraIssueKimaiTarget: mockSaveJiraIssueKimaiTarget,
  saveJiraProjectCustomerMapping: mockSaveJiraProjectCustomerMapping,
  claimJiraIssueKimaiTarget: mockClaimJiraIssueKimaiTarget,
  releaseJiraIssueKimaiTarget: mockReleaseJiraIssueKimaiTarget,
}));
jest.mock('../../src/kimai/client', () => ({
  HttpKimaiClient: jest.fn(() => ({
    getActiveTimesheets: mockGetActiveTimesheets,
    getCurrentUser: mockGetCurrentUser,
    getTimesheet: mockGetTimesheet,
    getCustomers: mockGetCustomers,
    getProjects: mockGetProjects,
    getActivities: mockGetActivities,
    createProject: mockCreateProject,
    createActivity: mockCreateActivity,
    createTimesheet: mockCreateTimesheet,
    startTimer: mockStartTimer,
    stopTimer: mockStopTimer,
  })),
}));
jest.mock('../../src/jira/client', () => ({
  ForgeJiraClient: jest.fn(() => ({ getIssueDetails: mockGetIssueDetails })),
}));

import { handler } from '../../src/resolvers/issue-context';

describe('issue context resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKimaiConfig.mockResolvedValue({
      url: 'https://kimai.example.test',
      defaultProjectId: 1,
      defaultActivityId: 2,
    });
    mockGetPersonalKimaiApiToken.mockResolvedValue('token');
    mockGetCurrentUser.mockResolvedValue({ id: 42, username: 'kimai-user' });
    mockGetUserMapping.mockResolvedValue({ kimaiUserId: 42, kimaiBaseUrl: 'https://kimai.example.test', enabled: true });
    mockGetActiveTimesheets.mockResolvedValue([]);
    mockGetTimesheet.mockResolvedValue({ id: 8291, user: 42 });
    mockGetCustomers.mockResolvedValue([{ id: 1, name: 'Acme' }]);
    mockGetProjects.mockResolvedValue([{ id: 10, name: 'BA - Billing', customer: 1 }]);
    mockGetActivities.mockResolvedValue([{ id: 20, name: '[BA-3] Improve billing', project: 10 }]);
    mockCreateProject.mockResolvedValue({ id: 10, name: 'BA - Billing', customer: 1 });
    mockCreateActivity.mockResolvedValue({ id: 20, name: '[BA-3] Improve billing', project: 10 });
    mockCreateTimesheet.mockResolvedValue({ id: 8300 });
    mockStartTimer.mockResolvedValue({ id: 8291 });
    mockStopTimer.mockResolvedValue({ id: 8291, user: 42 });
    mockClaimTimerStart.mockResolvedValue(true);
    mockReleaseTimerStart.mockResolvedValue(undefined);
    mockClaimJiraIssueKimaiTarget.mockResolvedValue(true);
    mockReleaseJiraIssueKimaiTarget.mockResolvedValue(undefined);
    mockGetJiraIssueKimaiTarget.mockResolvedValue(undefined);
    mockGetJiraProjectCustomerMapping.mockResolvedValue(undefined);
    mockSaveJiraIssueKimaiTarget.mockResolvedValue(undefined);
    mockSaveJiraProjectCustomerMapping.mockResolvedValue(undefined);
    mockGetIssueDetails.mockResolvedValue({
      id: '10001',
      key: 'BA-3',
      summary: 'Improve billing',
      project: { id: '10000', key: 'BA', name: 'Billing' },
    });
  });

  it('starts issue timers for the invoking Jira user mapping', async () => {
    const startTimer = (handler as unknown as typeof mockDefinitions).startTimer;
    const result = await startTimer({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: { customerId: 1 },
    });

    expect(mockGetUserMapping).toHaveBeenCalledWith('712020:abc123');
    expect(mockStartTimer).toHaveBeenCalledWith({
      project: 10,
      activity: 20,
      description: '[BA-3] Jira issue timer',
      user: 42,
    });
    expect(result).toEqual({ ok: true, timesheet: { id: 8291 } });
    expect(mockReleaseTimerStart).toHaveBeenCalledWith(42);
  });

  it('does not start a duplicate timer while another start owns the claim', async () => {
    mockClaimTimerStart.mockResolvedValue(false);
    const startTimer = (handler as unknown as typeof mockDefinitions).startTimer;

    const result = await startTimer({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: { customerId: 1 },
    });

    expect(mockStartTimer).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: 'A timer start is already in progress for your Kimai account.' });
  });

  it('returns an existing active timer instead of starting another one', async () => {
    mockGetActiveTimesheets.mockResolvedValue([
      { id: 8291, begin: '2026-08-29T10:00:00.000Z', description: '[BA-3] Jira issue timer' },
    ]);
    const startTimer = (handler as unknown as typeof mockDefinitions).startTimer;

    const result = await startTimer({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: { customerId: 1 },
    });

    expect(mockStartTimer).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      ok: true,
      timesheet: expect.objectContaining({ id: 8291 }),
    }));
  });

  it('restores the active timer for the current issue', async () => {
    mockGetActiveTimesheets.mockResolvedValue([
      { id: 8290, description: '[BA-2] Jira issue timer' },
      { id: 8291, begin: '2026-08-29T10:00:00.000Z', description: '[BA-3] Jira issue timer' },
    ]);
    const getIssueTimerState = (handler as unknown as typeof mockDefinitions).getIssueTimerState;

    const result = await getIssueTimerState({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: { issueKey: 'BA-999' },
    });

    expect(mockGetActiveTimesheets).toHaveBeenCalledWith(42);
    expect(result).toEqual(expect.objectContaining({
      runningTimesheet: { id: 8291, begin: '2026-08-29T10:00:00.000Z' },
    }));
  });

  it('marks the timer unavailable when active-timesheet lookup fails', async () => {
    mockGetActiveTimesheets.mockRejectedValue(new Error('Kimai unavailable'));
    const getIssueTimerState = (handler as unknown as typeof mockDefinitions).getIssueTimerState;

    const result = await getIssueTimerState({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: {},
    });

    expect(result).toEqual(expect.objectContaining({ timerUnavailable: true }));
  });

  it('refuses to start a timer when Kimai has no customers', async () => {
    mockGetCustomers.mockResolvedValue([]);
    const startTimer = (handler as unknown as typeof mockDefinitions).startTimer;

    const result = await startTimer({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: { customerId: 1 },
    });

    expect(result).toEqual({
      ok: false,
      error: 'No Kimai customers are available. Create a customer in Kimai before starting a timer.',
    });
    expect(mockStartTimer).not.toHaveBeenCalled();
  });

  it('creates missing targets and saves the customer as the project default', async () => {
    mockGetProjects.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
    const startTimer = (handler as unknown as typeof mockDefinitions).startTimer;

    await startTimer({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: { customerId: 1 },
    });

    expect(mockCreateProject).toHaveBeenCalledWith({ name: 'BA - Billing', customer: 1, visible: true });
    expect(mockCreateActivity).toHaveBeenCalledWith({
      name: '[BA-3] Improve billing',
      project: 10,
      visible: true,
    });
    expect(mockSaveJiraProjectCustomerMapping).toHaveBeenCalledWith(expect.objectContaining({
      jiraProjectId: '10000',
      kimaiCustomerId: 1,
    }));
    expect(mockSaveJiraIssueKimaiTarget).toHaveBeenCalledWith(expect.objectContaining({
      jiraIssueId: '10001',
      kimaiProjectId: 10,
      kimaiActivityId: 20,
    }));
  });

  it('uses the saved Jira project customer when no customer is supplied', async () => {
    mockGetJiraProjectCustomerMapping.mockResolvedValue({
      jiraProjectId: '10000',
      jiraProjectKey: 'BA',
      jiraProjectName: 'Billing',
      kimaiCustomerId: 1,
    });
    const startTimer = (handler as unknown as typeof mockDefinitions).startTimer;

    await startTimer({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: {},
    });

    expect(mockStartTimer).toHaveBeenCalledWith(expect.objectContaining({ project: 10, activity: 20 }));
  });

  it('stops only a timer owned by the invoking Jira user mapping', async () => {
    const stopTimer = (handler as unknown as typeof mockDefinitions).stopTimer;
    const result = await stopTimer({
      context: { accountId: '712020:abc123' },
      payload: { timesheetId: 8291 },
    });

    expect(mockGetTimesheet).toHaveBeenCalledWith(8291);
    expect(mockStopTimer).toHaveBeenCalledWith(8291);
    expect(result).toEqual({ ok: true, timesheet: { id: 8291, user: 42 } });
  });

  it('refuses to stop a timer owned by another Kimai user', async () => {
    mockGetTimesheet.mockResolvedValue({ id: 8291, user: 99 });
    const stopTimer = (handler as unknown as typeof mockDefinitions).stopTimer;

    const result = await stopTimer({
      context: { accountId: '712020:abc123' },
      payload: { timesheetId: 8291 },
    });

    expect(mockStopTimer).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: 'You can only stop your own Kimai timer.' });
  });

  it('validates a personal token and derives the Kimai user mapping from it', async () => {
    const savePersonalKimaiToken = (handler as unknown as typeof mockDefinitions).savePersonalKimaiToken;
    const result = await savePersonalKimaiToken({
      context: { accountId: '712020:abc123' },
      payload: { apiToken: 'personal-token' },
    });

    expect(mockSetPersonalKimaiApiToken).toHaveBeenCalledWith('712020:abc123', 'personal-token');
    expect(mockSaveUserMapping).toHaveBeenCalledWith({
      jiraAccountId: '712020:abc123', kimaiUserId: 42, kimaiUsername: 'kimai-user', kimaiBaseUrl: 'https://kimai.example.test', enabled: true,
    });
    expect(result).toEqual(expect.objectContaining({ ok: true, user: { id: 42, username: 'kimai-user' } }));
  });

  it('clears only the invoking user\'s personal token and mapping', async () => {
    const clearPersonalKimaiToken = (handler as unknown as typeof mockDefinitions).clearPersonalKimaiToken;
    await clearPersonalKimaiToken({ context: { accountId: '712020:abc123' }, payload: {} });

    expect(mockClearPersonalKimaiApiToken).toHaveBeenCalledWith('712020:abc123');
    expect(mockDeleteUserMapping).toHaveBeenCalledWith('712020:abc123');
  });

  it('does not store an invalid personal token', async () => {
    mockGetCurrentUser.mockRejectedValue(new Error('Unauthorized'));
    const savePersonalKimaiToken = (handler as unknown as typeof mockDefinitions).savePersonalKimaiToken;
    const result = await savePersonalKimaiToken({
      context: { accountId: '712020:abc123' },
      payload: { apiToken: 'invalid-token' },
    });

    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect(mockSetPersonalKimaiApiToken).not.toHaveBeenCalled();
    expect(mockSaveUserMapping).not.toHaveBeenCalled();
  });

  it('creates a billable manual entry with the issue-derived target and personal Kimai user', async () => {
    const createManualTimeEntry = (handler as unknown as typeof mockDefinitions).createManualTimeEntry;
    const result = await createManualTimeEntry({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: {
        customerId: 1,
        description: 'Investigate billing synchronization',
        date: '2026-08-30',
        startTime: '09:00',
        duration: '01:30:00',
        timezoneOffsetMinutes: 0,
        tags: ['Routine', 'Billing', 'Routine'],
        billable: true,
      },
    });

    expect(mockCreateTimesheet).toHaveBeenCalledWith({
      begin: '2026-08-30T09:00:00',
      end: '2026-08-30T10:30:00',
      project: 10,
      activity: 20,
      user: 42,
      description: '[BA-3] Investigate billing synchronization',
      tags: ['Routine', 'Billing'],
      billable: true,
    });
    expect(result).toEqual({ ok: true, timesheet: { id: 8300 } });
  });

  it('converts a local manual-entry time to UTC using Date#getTimezoneOffset semantics', async () => {
    const createManualTimeEntry = (handler as unknown as typeof mockDefinitions).createManualTimeEntry;

    await createManualTimeEntry({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: {
        customerId: 1, date: '2026-08-30', startTime: '09:00', duration: '01:00:00',
        // UTC-4: Date#getTimezoneOffset() returns +240 minutes.
        timezoneOffsetMinutes: 240,
      },
    });

    expect(mockCreateTimesheet).toHaveBeenCalledWith(expect.objectContaining({
      begin: '2026-08-30T13:00:00', end: '2026-08-30T14:00:00',
    }));
  });
});
