/**
 * Minimal structured logger.
 *
 * Secrets such as API tokens, Authorization headers, and webhook secrets are
 * redacted recursively before fields are sent to the console.
 */

const REDACTED_KEYS = new Set([
  'token',
  'apitoken',
  'authorization',
  'secret',
  'webhooksecret',
  'password',
]);

function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return '[CIRCULAR]';
  }

  seen.add(value);
  const safe: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = redact(val, seen);
    }
  }
  return safe;
}

export interface LogFields {
  event: string;
  direction?: 'jira-to-kimai' | 'kimai-to-jira';
  jiraIssueKey?: string;
  jiraWorklogId?: string;
  kimaiTimesheetId?: number;
  correlationId?: string;
  result?: 'success' | 'failure';
  [key: string]: unknown;
}

function log(level: 'info' | 'warn' | 'error', fields: LogFields): void {
  const safeFields = redact(fields) as Record<string, unknown>;
  const line = JSON.stringify({ level, ...safeFields });
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export const logger = {
  info: (fields: LogFields): void => log('info', fields),
  warn: (fields: LogFields): void => log('warn', fields),
  error: (fields: LogFields): void => log('error', fields),
};
