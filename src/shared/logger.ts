/**
 * Minimal structured logger.
 *
 * Never log secrets: API tokens, Authorization headers or webhook secrets
 * must never be passed to these helpers.
 */

const REDACTED_KEYS = new Set([
  'token',
  'apitoken',
  'authorization',
  'secret',
  'webhooksecret',
  'password',
]);

function redact(value: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = val;
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
  const safeFields = redact(fields);
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
