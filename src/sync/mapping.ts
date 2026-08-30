import {
  claimJiraWorklogCreation,
  claimJiraWorklogSync,
  claimKimaiTimesheetCreation,
  claimKimaiTimesheetSync,
  claimMappingPairSync,
  deletePendingJiraWorklogCreation,
  deletePendingKimaiTimesheetCreation,
  getMappingByJiraWorklogId,
  getMappingByKimaiTimesheetId,
  getPendingJiraWorklogCreation,
  getPendingKimaiTimesheetCreation,
  releaseJiraWorklogCreation,
  releaseJiraWorklogSync,
  releaseKimaiTimesheetCreation,
  releaseKimaiTimesheetSync,
  releaseMappingPairSync,
  savePendingJiraWorklogCreation,
  savePendingKimaiTimesheetCreation,
  saveWorklogMapping,
} from '../storage/mappings';
import { WorklogMapping } from '../shared/types';

export {
  claimJiraWorklogCreation,
  claimJiraWorklogSync,
  claimKimaiTimesheetCreation,
  claimKimaiTimesheetSync,
  claimMappingPairSync,
  deletePendingJiraWorklogCreation,
  deletePendingKimaiTimesheetCreation,
  getMappingByJiraWorklogId,
  getMappingByKimaiTimesheetId,
  getPendingJiraWorklogCreation,
  getPendingKimaiTimesheetCreation,
  releaseJiraWorklogCreation,
  releaseJiraWorklogSync,
  releaseKimaiTimesheetCreation,
  releaseKimaiTimesheetSync,
  releaseMappingPairSync,
  savePendingJiraWorklogCreation,
  savePendingKimaiTimesheetCreation,
};

/**
 * Records that a given Jira worklog is linked to a given Kimai timesheet,
 * overwriting any previous mapping for the same worklog.
 */
export async function recordMapping(mapping: WorklogMapping): Promise<void> {
  await saveWorklogMapping(mapping);
}
