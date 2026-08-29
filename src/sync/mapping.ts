import {
  claimJiraWorklogCreation,
  getMappingByJiraWorklogId,
  getMappingByKimaiTimesheetId,
  releaseJiraWorklogCreation,
  saveWorklogMapping,
} from '../storage/mappings';
import { WorklogMapping } from '../shared/types';

export {
  claimJiraWorklogCreation,
  getMappingByJiraWorklogId,
  getMappingByKimaiTimesheetId,
  releaseJiraWorklogCreation,
};

/**
 * Records that a given Jira worklog is linked to a given Kimai timesheet,
 * overwriting any previous mapping for the same worklog.
 */
export async function recordMapping(mapping: WorklogMapping): Promise<void> {
  await saveWorklogMapping(mapping);
}
