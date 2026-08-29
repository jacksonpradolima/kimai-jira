const mockDefinitions: Record<string, (request: { payload: unknown; context: Record<string, unknown> }) => unknown> = {};
const mockResolver = {
  define: jest.fn(),
  getDefinitions: jest.fn(() => mockDefinitions),
};
const mockGetKimaiConfig = jest.fn();
const mockGetKimaiApiToken = jest.fn();
const mockGetUserMapping = jest.fn();
const mockGetActiveTimesheets = jest.fn();
const mockGetTimesheet = jest.fn();
const mockStartTimer = jest.fn();
const mockStopTimer = jest.fn();

mockResolver.define.mockImplementation((key: string, callback) => {
  mockDefinitions[key] = callback;
  return mockResolver;
});

jest.mock('@forge/resolver', () => ({
  __esModule: true,
  default: jest.fn(() => mockResolver),
}));
jest.mock('../../src/storage/config', () => ({ getKimaiConfig: mockGetKimaiConfig }));
jest.mock('../../src/storage/secrets', () => ({ getKimaiApiToken: mockGetKimaiApiToken }));
jest.mock('../../src/storage/users', () => ({ getUserMapping: mockGetUserMapping }));
jest.mock('../../src/kimai/client', () => ({
  HttpKimaiClient: jest.fn(() => ({
    getActiveTimesheets: mockGetActiveTimesheets,
    getTimesheet: mockGetTimesheet,
    startTimer: mockStartTimer,
    stopTimer: mockStopTimer,
  })),
}));

import { handler } from '../../src/resolvers/issue-context';

describe('issue context resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKimaiConfig.mockResolvedValue({
      url: 'https://kimai.example.test',
      hasToken: true,
      defaultProjectId: 1,
      defaultActivityId: 2,
    });
    mockGetKimaiApiToken.mockResolvedValue('token');
    mockGetUserMapping.mockResolvedValue({ kimaiUserId: 42, enabled: true });
    mockGetActiveTimesheets.mockResolvedValue([]);
    mockGetTimesheet.mockResolvedValue({ id: 8291, user: 42 });
    mockStartTimer.mockResolvedValue({ id: 8291 });
    mockStopTimer.mockResolvedValue({ id: 8291, user: 42 });
  });

  it('starts issue timers for the invoking Jira user mapping', async () => {
    const startTimer = (handler as unknown as typeof mockDefinitions).startTimer;
    const result = await startTimer({
      context: { accountId: '712020:abc123', extension: { issue: { key: 'BA-3' } } },
      payload: { project: 99, activity: 88, description: '[BA-999] untrusted' },
    });

    expect(mockGetUserMapping).toHaveBeenCalledWith('712020:abc123');
    expect(mockStartTimer).toHaveBeenCalledWith({
      project: 1,
      activity: 2,
      description: '[BA-3] Jira issue timer',
      user: 42,
    });
    expect(result).toEqual({ ok: true, timesheet: { id: 8291 } });
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
});
