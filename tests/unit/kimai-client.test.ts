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

  it('creates projects and activities with the selected customer target', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 10 }),
    });
    const client = new HttpKimaiClient({
      baseUrl: 'https://kimai.example.test',
      apiToken: 'token',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await client.createProject({ name: 'BA - Billing', customer: 1, visible: true });
    await client.createActivity({ name: '[BA-3] Improve billing', project: 10, visible: true });

    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      'https://kimai.example.test/api/projects',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'BA - Billing', customer: 1, visible: true }) }),
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      'https://kimai.example.test/api/activities',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: '[BA-3] Improve billing', project: 10, visible: true }),
      }),
    );
  });

  it('loads available Kimai customers', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue([{ id: 1, name: 'Acme' }]),
    });
    const client = new HttpKimaiClient({
      baseUrl: 'https://kimai.example.test',
      apiToken: 'token',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await expect(client.getCustomers()).resolves.toEqual([{ id: 1, name: 'Acme' }]);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://kimai.example.test/api/customers',
      expect.any(Object),
    );
  });

  it('accepts a Kimai API URL without duplicating the API path', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, status: 200, json: jest.fn().mockResolvedValue({ id: 42 }) });
    const client = new HttpKimaiClient({ baseUrl: 'https://kimai.example.test/api', apiToken: 'token', fetchFn: fetchFn as unknown as typeof fetch });

    await client.getCurrentUser();

    expect(fetchFn).toHaveBeenCalledWith('https://kimai.example.test/api/users/me', expect.any(Object));
  });

  it('includes the Kimai HTTP status in a safe request error', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false, status: 422, text: jest.fn().mockResolvedValue(JSON.stringify({ message: 'Invalid tag' })),
    });
    const client = new HttpKimaiClient({
      baseUrl: 'https://kimai.example.test', apiToken: 'token', fetchFn: fetchFn as unknown as typeof fetch,
    });

    await expect(client.createTimesheet({
      begin: '2026-08-30T09:00:00', end: '2026-08-30T10:00:00', project: 1, activity: 2,
    })).rejects.toThrow('Kimai API request to /api/timesheets failed (HTTP 422): Invalid tag');
  });
});
