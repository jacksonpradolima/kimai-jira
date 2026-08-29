import { HttpKimaiClient } from '../../src/kimai/client';

describe('HttpKimaiClient', () => {
  it('filters active timesheets by the mapped Kimai user', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue([{ id: 8291 }]),
    });
    const client = new HttpKimaiClient({
      baseUrl: 'https://kimai.example.test/',
      apiToken: 'token',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await expect(client.getActiveTimesheets(42)).resolves.toEqual([{ id: 8291 }]);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://kimai.example.test/api/timesheets?user=42&active=1',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    );
  });
});
