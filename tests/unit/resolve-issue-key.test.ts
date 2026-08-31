import { resolveIssueKey } from '../../src/webhooks/handlers/timesheet-created';

describe('resolveIssueKey', () => {
  it('prefers explicit meta.jiraIssueKey', () => {
    expect(
      resolveIssueKey({
        id: 1,
        begin: '2026-08-27T10:00:00Z',
        end: null,
        meta: { jiraIssueKey: 'BA-3' },
      }),
    ).toBe('BA-3');
  });

  it('falls back to parsing the description', () => {
    expect(
      resolveIssueKey({
        id: 1,
        begin: '2026-08-27T10:00:00Z',
        end: null,
        description: '[BA-3] 1-1 Meetings',
      }),
    ).toBe('BA-3');
  });

  it('parses issue keys from single-letter Jira projects', () => {
    expect(
      resolveIssueKey({
        id: 1,
        begin: '2026-08-27T10:00:00Z',
        end: null,
        description: '[A-1] Single-letter project',
      }),
    ).toBe('A-1');
  });

  it('returns undefined when no issue key can be resolved', () => {
    expect(
      resolveIssueKey({
        id: 1,
        begin: '2026-08-27T10:00:00Z',
        end: null,
        description: 'no issue key here',
      }),
    ).toBeUndefined();
  });
});
