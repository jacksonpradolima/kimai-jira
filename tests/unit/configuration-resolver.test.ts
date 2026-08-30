const mockDefinitions: Record<string, (request: { payload: unknown }) => unknown> = {};
const mockResolver = {
  define: jest.fn(),
  getDefinitions: jest.fn(() => mockDefinitions),
};
const mockGetKimaiConfig = jest.fn();
const mockGetSyncSettings = jest.fn();
const mockSetKimaiConfig = jest.fn();

mockResolver.define.mockImplementation((key: string, callback) => {
  mockDefinitions[key] = callback;
  return mockResolver;
});

jest.mock('@forge/resolver', () => ({
  __esModule: true,
  default: jest.fn(() => mockResolver),
}));
jest.mock('@forge/api', () => ({ webTrigger: { getUrl: jest.fn() } }));
jest.mock('../../src/storage/config', () => ({
  getKimaiConfig: mockGetKimaiConfig,
  getSyncSettings: mockGetSyncSettings,
  setKimaiConfig: mockSetKimaiConfig,
  setSyncSettings: jest.fn(),
}));
jest.mock('../../src/storage/secrets', () => ({
  setKimaiWebhookSecret: jest.fn(),
}));
jest.mock('../../src/kimai/client', () => ({ HttpKimaiClient: jest.fn() }));

import { handler } from '../../src/resolvers/configuration';

describe('configuration resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKimaiConfig.mockResolvedValue(undefined);
  });

  it('rejects empty Kimai URLs instead of persisting an unusable configuration', async () => {
    const saveConnectionSettings = (handler as unknown as typeof mockDefinitions).saveConnectionSettings;
    const result = await saveConnectionSettings({ payload: { url: '   ' } });

    expect(result).toEqual({ ok: false, error: 'A valid Kimai URL is required.' });
    expect(mockSetKimaiConfig).not.toHaveBeenCalled();
  });

  it('clears stored defaults when the payload explicitly supplies null', async () => {
    mockGetKimaiConfig.mockResolvedValue({
      url: 'https://kimai.example.test',
      defaultProjectId: 1,
      defaultActivityId: 2,
    });
    const saveConnectionSettings = (handler as unknown as typeof mockDefinitions).saveConnectionSettings;

    await saveConnectionSettings({
      payload: {
        defaultProjectId: null,
        defaultActivityId: null,
      },
    });

    expect(mockSetKimaiConfig).toHaveBeenCalledWith(expect.objectContaining({
      defaultProjectId: undefined,
      defaultActivityId: undefined,
    }));
  });
});
