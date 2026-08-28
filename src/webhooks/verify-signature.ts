import * as crypto from 'crypto';

/**
 * Verifies an HMAC-SHA256 webhook signature using a constant-time
 * comparison to avoid timing attacks.
 *
 * Kimai webhooks (and most webhook providers) sign the raw request body
 * with a shared secret; the signature is expected in a header such as
 * `X-Kimai-Signature: sha256=<hex-digest>`.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  const providedSignature = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;

  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const providedBuffer = Buffer.from(providedSignature, 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
