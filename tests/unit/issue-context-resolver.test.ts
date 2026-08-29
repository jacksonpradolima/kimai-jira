const mockDefinitions: Record<string, (request: { payload: unknown; context: Record<string, unknown> }) => unknown> = {};
const mockResolver = {
  define: jest.fn(),
  getDefinitions: jest.fn(() => mockDefinitions),
};
const mockGetKimaiConfig = jest.fn();
const mockGetKimaiApiToken = jest.fn();
const mockGetUserMapping = jest.fn();
const mockStartTimer = jest.fn();

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
  HttpKimaiClient: jest.fn(() => ({ startTimer: mockStartTimer })),
}));

import { handler } from '../../src/resolvers/issue-context';

describe('issue context resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKimaiConfig.mockResolvedValue({ url: 'https://kimai.example.test', hasToken: true });
    mockGetKimaiApiToken.mockResolvedValue('token');
    mockGetUserMapping.mockResolvedValue({ kimaiUserId: 42, enabled: true });
    mockStartTimer.mockResolvedValue({ id: 8291 });
  });

  it('starts issue timers for the invoking Jira user mapping', async () => {
    const startTimer = (handler as unknown as typeof mockDefinitions).startTimer;
    const result = await startTimer({
      context: { accountId: '712020:abc123' },
      payload: { project: 1, activity: 2, description: '[BA-3] Jira issue timer' },
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
});
