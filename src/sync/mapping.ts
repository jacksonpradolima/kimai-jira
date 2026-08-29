import {
  claimJiraWorklogCreation,
  claimJiraWorklogSync,
  claimKimaiTimesheetCreation,
  claimKimaiTimesheetSync,
  deletePendingJiraWorklogCreation,
  getMappingByJiraWorklogId,
  getMappingByKimaiTimesheetId,
  getPendingJiraWorklogCreation,
  releaseJiraWorklogCreation,
  releaseJiraWorklogSync,
  releaseKimaiTimesheetCreation,
  releaseKimaiTimesheetSync,
  savePendingJiraWorklogCreation,
  saveWorklogMapping,
} from '../storage/mappings';
import { WorklogMapping } from '../shared/types';

export {
  claimJiraWorklogCreation,
  claimJiraWorklogSync,
  claimKimaiTimesheetCreation,
  claimKimaiTimesheetSync,
  deletePendingJiraWorklogCreation,
  getMappingByJiraWorklogId,
  getMappingByKimaiTimesheetId,
  getPendingJiraWorklogCreation,
  releaseJiraWorklogCreation,
  releaseJiraWorklogSync,
  releaseKimaiTimesheetCreation,
  releaseKimaiTimesheetSync,
  savePendingJiraWorklogCreation,
};

/**
 * Records that a given Jira worklog is linked to a given Kimai timesheet,
 * overwriting any previous mapping for the same worklog.
 */
export async function recordMapping(mapping: WorklogMapping): Promise<void> {
  await saveWorklogMapping(mapping);
}
