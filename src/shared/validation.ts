/**
 * Validation and conversion helpers shared across the sync engine.
 */

/**
 * Converts a Jira-style duration string (e.g. "1h 30m", "90m", "2h") into
 * whole seconds. Returns `null` when the input cannot be parsed.
 */
export function parseDurationToSeconds(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length === 0) {
    return null;
  }

  // Support plain "HH:MM" as well as "1h 30m" style tokens.
  const hhmm = /^(\d{1,3}):([0-5]?\d)$/.exec(trimmed);
  if (hhmm) {
    const hours = Number(hhmm[1]);
    const minutes = Number(hhmm[2]);
    return hours * 3600 + minutes * 60;
  }

  const tokenPattern = /(\d+(?:\.\d+)?)\s*(h|m|s)/g;
  let match: RegExpExecArray | null;
  let totalSeconds = 0;
  let matched = false;

  while ((match = tokenPattern.exec(trimmed)) !== null) {
    matched = true;
    const value = Number(match[1]);
    const unit = match[2];
    if (unit === 'h') {
      totalSeconds += value * 3600;
    } else if (unit === 'm') {
      totalSeconds += value * 60;
    } else {
      totalSeconds += value;
    }
  }

  return matched ? Math.round(totalSeconds) : null;
}

/**
 * Converts a number of seconds into an "HH:MM" string.
 */
export function formatSecondsAsHHMM(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Validates that a string is a valid ISO-8601 timestamp.
 */
export function isValidIsoDate(value: string): boolean {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/**
 * Computes the ISO-8601 end timestamp given a start timestamp and a
 * duration in seconds.
 */
export function addSecondsToIso(startIso: string, seconds: number): string {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    throw new RangeError(`Invalid ISO date: ${startIso}`);
  }
  return new Date(start.getTime() + seconds * 1000).toISOString();
}
