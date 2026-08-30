const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();
const mockTransactionSet = jest.fn();
const mockTransactionDelete = jest.fn();
const mockTransactionExecute = jest.fn();
const mockTransact = jest.fn();

class MockForgeKvsAPIError extends Error {
  responseDetails = { status: 409 };
}

jest.mock('@forge/kvs', () => ({
  kvs: {
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
    transact: mockTransact,
  },
  ForgeKvsAPIError: MockForgeKvsAPIError,
}));

import { deleteUserMapping, saveUserMapping } from '../../src/storage/users';

describe('user mappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);
    mockTransactionSet.mockReturnThis();
    mockTransactionDelete.mockReturnThis();
    mockTransactionExecute.mockResolvedValue(undefined);
    mockTransact.mockReturnValue({
      set: mockTransactionSet,
      delete: mockTransactionDelete,
      execute: mockTransactionExecute,
    });
  });

  it('rejects connecting a Kimai user already owned by another Jira account', async () => {
    mockGet
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ jiraAccountId: 'other-account', kimaiUserId: 42, enabled: true });

    await expect(saveUserMapping({
      jiraAccountId: 'current-account', kimaiUserId: 42, enabled: true,
    })).rejects.toThrow('already connected to another Jira account');

    expect(mockTransactionExecute).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith('user:kimai:claim:42');
  });

  it('does not remove a reverse mapping that belongs to another account', async () => {
    mockGet
      .mockResolvedValueOnce({ jiraAccountId: 'old-account', kimaiUserId: 42, enabled: true })
      .mockResolvedValueOnce({ jiraAccountId: 'new-account', kimaiUserId: 42, enabled: true });

    await deleteUserMapping('old-account');

    expect(mockTransactionDelete).toHaveBeenCalledTimes(1);
    expect(mockTransactionDelete).toHaveBeenCalledWith('user:old-account');
  });
});
