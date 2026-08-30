const JIRA_WORKLOG_MARKER = 'kimai-jira-worklog';
const KIMAI_TIMESHEET_MARKER = 'kimai-jira-timesheet';

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

/** Correlates a Jira worklog created from a Kimai timesheet before its mapping is persisted. */
export function formatKimaiTimesheetCorrelation(kimaiTimesheetId: number): string {
  return `[${KIMAI_TIMESHEET_MARKER}:${kimaiTimesheetId}]`;
}

export function getKimaiTimesheetCorrelation(comment: string | undefined): number | undefined {
  if (!comment) return undefined;
  const match = new RegExp(`^\\s*\\[${KIMAI_TIMESHEET_MARKER}:(\\d+)\\]`).exec(comment);
  const id = match ? Number(match[1]) : undefined;
  return Number.isInteger(id) && id! > 0 ? id : undefined;
}

export function stripKimaiTimesheetCorrelation(comment: string): string {
  return comment.replace(
    new RegExp(`^\\s*\\[${KIMAI_TIMESHEET_MARKER}:\\d+\\]\\s*`),
    '',
  );
}
