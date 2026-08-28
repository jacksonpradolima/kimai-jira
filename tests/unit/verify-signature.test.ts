import * as crypto from 'crypto';
import { verifyWebhookSignature } from '../../src/webhooks/verify-signature';

const secret = 'test-webhook-secret';
const body = JSON.stringify({ event: 'timesheet.created', payload: { id: 1 } });

function sign(payload: string, key: string): string {
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

describe('verifyWebhookSignature', () => {
  it('accepts a valid signature', () => {
    const signature = `sha256=${sign(body, secret)}`;
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it('accepts a valid signature without the sha256= prefix', () => {
    const signature = sign(body, secret);
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const signature = `sha256=${sign(body, secret)}`;
    expect(verifyWebhookSignature(`${body}tampered`, signature, secret)).toBe(false);
  });

  it('rejects a signature generated with the wrong secret', () => {
    const signature = `sha256=${sign(body, 'wrong-secret')}`;
    expect(verifyWebhookSignature(body, signature, secret)).toBe(false);
  });

  it('rejects when no signature header is present', () => {
    expect(verifyWebhookSignature(body, undefined, secret)).toBe(false);
  });

  it('rejects when no secret is configured', () => {
    const signature = `sha256=${sign(body, secret)}`;
    expect(verifyWebhookSignature(body, signature, '')).toBe(false);
  });
});
