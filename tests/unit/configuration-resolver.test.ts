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

  it.each([
    'http://kimai.example.test',
    'https://user:password@kimai.example.test',
    'https://kimai.example.test?tenant=one',
    'https://kimai.example.test#fragment',
  ])('rejects unsafe Kimai base URLs: %s', async (url) => {
    const saveConnectionSettings = (handler as unknown as typeof mockDefinitions).saveConnectionSettings;

    await expect(saveConnectionSettings({ payload: { url } })).resolves.toEqual({
      ok: false, error: 'A valid Kimai URL is required.',
    });
    expect(mockSetKimaiConfig).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, 'not-a-number'])('rejects invalid default resource IDs: %s', async (defaultProjectId) => {
    const saveConnectionSettings = (handler as unknown as typeof mockDefinitions).saveConnectionSettings;

    await expect(saveConnectionSettings({
      payload: { url: 'https://kimai.example.test', defaultProjectId },
    })).resolves.toEqual({
      ok: false, error: 'The default Kimai project ID must be a positive integer.',
    });
    expect(mockSetKimaiConfig).not.toHaveBeenCalled();
  });

  it('allows a Kimai URL migration and marks personal connections for reconnection', async () => {
    mockGetKimaiConfig.mockResolvedValue({ url: 'https://old-kimai.example.test' });
    const saveConnectionSettings = (handler as unknown as typeof mockDefinitions).saveConnectionSettings;

    await expect(saveConnectionSettings({
      payload: { url: 'https://new-kimai.example.test/base/' },
    })).resolves.toEqual({
      ok: true,
      config: { url: 'https://new-kimai.example.test/base' },
      credentialsNeedReconnect: true,
    });
    expect(mockSetKimaiConfig).toHaveBeenCalledWith({ url: 'https://new-kimai.example.test/base' });
  });
});
