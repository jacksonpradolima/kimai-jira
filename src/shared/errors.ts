/**
 * Application-level error types.
 *
 * These are safe to surface to end users; raw stack traces / provider error
 * bodies must never be forwarded directly to the Jira UI.
 */

export class AppError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export class KimaiApiError extends AppError {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super('KIMAI_API_ERROR', message);
    this.name = 'KimaiApiError';
    this.status = status;
  }
}

export class WebhookVerificationError extends AppError {
  constructor(message = 'Invalid webhook signature') {
    super('WEBHOOK_VERIFICATION_FAILED', message);
    this.name = 'WebhookVerificationError';
  }
}

export class MappingNotFoundError extends AppError {
  constructor(message = 'No mapping found for the given entity') {
    super('MAPPING_NOT_FOUND', message);
    this.name = 'MappingNotFoundError';
  }
}

/**
 * Converts an unknown error into a message safe to show to end users,
 * without leaking stack traces or provider internals.
 */
export function toSafeUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  return 'An unexpected error occurred. Please contact your administrator.';
}
