import { computeContentHash, mergeMapping, shouldSkipSyncEvent } from '../../src/sync/idempotency';
import { WorklogMapping } from '../../src/shared/types';

const baseMapping: WorklogMapping = {
  jiraIssueId: '10001',
  jiraIssueKey: 'BA-3',
  jiraWorklogId: '100271',
  kimaiTimesheetId: 8291,
  origin: 'jira',
  lastSyncedAt: '2026-08-27T23:40:00Z',
  lastHash: 'abc123',
};

describe('computeContentHash', () => {
  it('is stable regardless of key order', () => {
    const a = computeContentHash({ started: '2026-01-01', duration: 60 });
    const b = computeContentHash({ duration: 60, started: '2026-01-01' });
    expect(a).toBe(b);
  });

  it('changes when values change', () => {
    const a = computeContentHash({ started: '2026-01-01', duration: 60 });
    const b = computeContentHash({ started: '2026-01-01', duration: 120 });
    expect(a).not.toBe(b);
  });
});

describe('shouldSkipSyncEvent', () => {
  it('does not skip when there is no existing mapping', () => {
    expect(shouldSkipSyncEvent(undefined, { hash: 'xyz' })).toBe(false);
  });

  it('skips a replayed event with the same content hash (idempotency)', () => {
    expect(shouldSkipSyncEvent(baseMapping, { hash: 'abc123' })).toBe(true);
  });

  it('does not skip when the content hash differs (a real change)', () => {
    expect(shouldSkipSyncEvent(baseMapping, { hash: 'different' })).toBe(false);
  });
});

describe('mergeMapping', () => {
  it('creates a new mapping merged with defaults when none exists', () => {
    const merged = mergeMapping(undefined, {
      jiraWorklogId: '100271',
      kimaiTimesheetId: 8291,
      jiraIssueKey: 'BA-3',
    });

    expect(merged.jiraWorklogId).toBe('100271');
    expect(merged.kimaiTimesheetId).toBe(8291);
    expect(merged.origin).toBe('jira');
    expect(merged.lastSyncedAt).toBeDefined();
  });

  it('preserves existing fields not present in the update', () => {
    const merged = mergeMapping(baseMapping, {
      jiraWorklogId: baseMapping.jiraWorklogId,
      kimaiTimesheetId: baseMapping.kimaiTimesheetId,
      lastHash: 'new-hash',
    });

    expect(merged.jiraIssueKey).toBe('BA-3');
    expect(merged.lastHash).toBe('new-hash');
  });
});
