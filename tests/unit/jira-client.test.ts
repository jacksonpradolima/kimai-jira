const mockRequestJira = jest.fn();

jest.mock('@forge/api', () => ({
  asApp: () => ({ requestJira: mockRequestJira }),
  route: (strings: TemplateStringsArray, ...values: string[]) =>
    strings.reduce((path, segment, index) => path + (values[index - 1] ?? '') + segment),
}));

import { ForgeJiraClient } from '../../src/jira/client';

function successfulResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn(),
  };
}

describe('ForgeJiraClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('encodes Kimai comments as Atlassian Document Format', async () => {
    mockRequestJira.mockResolvedValue(
      successfulResponse({ id: '100271', issueId: '10001', started: '', timeSpentSeconds: 60 }),
    );

    await new ForgeJiraClient().createWorklog({
      issueIdOrKey: 'BA-3',
      started: '2026-08-27T10:00:00.000Z',
      timeSpentSeconds: 60,
      comment: 'Investigated incident',
    });

    const request = mockRequestJira.mock.calls[0][1] as { body: string };
    expect(JSON.parse(request.body)).toMatchObject({
      comment: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Investigated incident' }],
          },
        ],
      },
    });
  });

  it('resolves an issue key from a worklog issue ID', async () => {
    mockRequestJira.mockResolvedValue(successfulResponse({ key: 'BA-3' }));

    await expect(new ForgeJiraClient().getIssueKey('10001')).resolves.toBe('BA-3');
  });

  it('loads issue details required for timer target provisioning', async () => {
    mockRequestJira.mockResolvedValue(successfulResponse({
      id: '10001',
      key: 'BA-3',
      fields: {
        summary: 'Improve billing',
        project: { id: '10000', key: 'BA', name: 'Billing' },
      },
    }));

    await expect(new ForgeJiraClient().getIssueDetails('BA-3')).resolves.toEqual({
      id: '10001',
      key: 'BA-3',
      summary: 'Improve billing',
      project: { id: '10000', key: 'BA', name: 'Billing' },
    });
  });

  it('sends an empty ADF document when an update clears a worklog comment', async () => {
    mockRequestJira.mockResolvedValue(
      successfulResponse({ id: '100271', issueId: '10001', started: '', timeSpentSeconds: 60 }),
    );

    await new ForgeJiraClient().updateWorklog('BA-3', '100271', { comment: '' });

    const request = mockRequestJira.mock.calls[0][1] as { body: string };
    expect(JSON.parse(request.body)).toMatchObject({
      comment: { type: 'doc', version: 1, content: [] },
    });
  });
});
