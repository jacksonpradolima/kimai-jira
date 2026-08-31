import { logger } from '../../src/shared/logger';

describe('logger', () => {
  it('redacts sensitive values in nested objects and arrays', () => {
    const log = jest.spyOn(console, 'log').mockImplementation();

    logger.info({
      event: 'request.received',
      headers: { authorization: 'Bearer secret' },
      attempts: [{ apiToken: 'token-value' }],
    });

    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      headers: { authorization: '[REDACTED]' },
      attempts: [{ apiToken: '[REDACTED]' }],
    });
    log.mockRestore();
  });
});
