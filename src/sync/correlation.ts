const JIRA_WORKLOG_MARKER = 'kimai-jira-worklog';

export function formatJiraWorklogCorrelation(jiraWorklogId: string): string {
  return `[${JIRA_WORKLOG_MARKER}:${jiraWorklogId}]`;
}

export function getJiraWorklogCorrelation(description: string | undefined): string | undefined {
  if (!description) {
    return undefined;
  }

  const match = new RegExp(`^\\s*\\[${JIRA_WORKLOG_MARKER}:([^\\]\\s]+)\\]`).exec(description);
  return match ? match[1] : undefined;
}

export function stripJiraWorklogCorrelation(description: string): string {
  return description.replace(
    new RegExp(`^\\s*\\[${JIRA_WORKLOG_MARKER}:[^\\]\\s]+\\]\\s*`),
    '',
  );
}
