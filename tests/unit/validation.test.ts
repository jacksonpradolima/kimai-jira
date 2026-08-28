import { parseDurationToSeconds, formatSecondsAsHHMM, addSecondsToIso, isValidIsoDate } from '../../src/shared/validation';

describe('parseDurationToSeconds', () => {
  it('parses HH:MM format', () => {
    expect(parseDurationToSeconds('01:30')).toBe(5400);
    expect(parseDurationToSeconds('00:05')).toBe(300);
  });

  it('parses "1h 30m" style durations', () => {
    expect(parseDurationToSeconds('1h 30m')).toBe(5400);
    expect(parseDurationToSeconds('90m')).toBe(5400);
    expect(parseDurationToSeconds('2h')).toBe(7200);
  });

  it('returns null for unparseable input', () => {
    expect(parseDurationToSeconds('')).toBeNull();
    expect(parseDurationToSeconds('not a duration')).toBeNull();
  });
});

describe('formatSecondsAsHHMM', () => {
  it('formats whole hours and minutes', () => {
    expect(formatSecondsAsHHMM(5400)).toBe('01:30');
    expect(formatSecondsAsHHMM(0)).toBe('00:00');
    expect(formatSecondsAsHHMM(3600)).toBe('01:00');
  });

  it('clamps negative values to zero', () => {
    expect(formatSecondsAsHHMM(-100)).toBe('00:00');
  });
});

describe('isValidIsoDate', () => {
  it('accepts valid ISO strings', () => {
    expect(isValidIsoDate('2026-08-27T23:40:00Z')).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(isValidIsoDate('not-a-date')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
  });
});

describe('addSecondsToIso', () => {
  it('adds seconds to an ISO timestamp', () => {
    expect(addSecondsToIso('2026-08-27T10:00:00.000Z', 3600)).toBe('2026-08-27T11:00:00.000Z');
  });

  it('throws for an invalid start date', () => {
    expect(() => addSecondsToIso('invalid', 60)).toThrow(RangeError);
  });
});
