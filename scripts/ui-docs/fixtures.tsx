import React from 'react';
import { AdminView, AdminViewProps } from '../../src/frontend/admin/AdminView';
import { IssueContextView, TimerState } from '../../src/frontend/issue-context/IssueContextView';

export interface UiDocumentationFixture {
  fileName: string;
  kind: 'issue' | 'admin';
  fullPage?: boolean;
  element: React.ReactElement;
}

const noop = () => undefined;

const issueState: TimerState = {
  configured: true,
  personalTokenConfigured: true,
  connectedKimaiUser: 'documentation-user',
  customers: [{ id: 21, name: 'Acme Studio' }],
  defaultKimaiCustomerId: 21,
  target: {
    status: 'existing',
    kimaiCustomerId: 21,
    projectId: 301,
    activityId: 402,
    projectName: 'KJ - Kimai for Jira',
    activityName: '[KJ-142] Implement Jira/Kimai synchronization',
  },
};

function issueFixture(
  fileName: string,
  state: TimerState,
  elapsedTime: string,
  isManagingConnection = false,
): UiDocumentationFixture {
  return {
    fileName,
    kind: 'issue',
    fullPage: true,
    // Documentation fixture. Uses the same IssueContextView as the Forge runtime.
    element: (
      <IssueContextView
        elapsedTime={elapsedTime}
        isManagingConnection={isManagingConnection}
        isManualEntryPending={false}
        isPersonalConnectionPending={false}
        isTimerActionPending={false}
        onConnectionBack={noop}
        onCustomerChange={noop}
        onManageConnection={noop}
        onCreateManualEntry={noop}
        onManualBillableChange={noop}
        onManualDateChange={noop}
        onManualDescriptionChange={noop}
        onManualEndTimeChange={noop}
        onManualStartTimeChange={noop}
        onPersonalApiTokenChange={noop}
        onResetPersonalToken={noop}
        onSavePersonalToken={noop}
        onStart={noop}
        onStop={noop}
        personalApiToken={isManagingConnection ? 'docs-personal-token' : ''}
        manualBillable={true}
        manualDate="2026-08-30"
        manualDescription="[KJ-142] Implement Jira/Kimai synchronization"
        manualEndTime="10:30"
        manualStartTime="09:00"
        manualTotalDuration="01:30:00"
        selectedKimaiCustomerId={21}
        state={state}
      />
    ),
  };
}

const adminBase = {
  state: {
    config: {
      url: 'https://kimai.example.test/',
      defaultProjectId: 301,
      defaultActivityId: 402,
    },
    webhookUrl: 'https://forge.example.test/webtrigger/kimai-webhook',
  },
  url: 'https://kimai.example.test/',
  defaultProjectId: '301',
  defaultActivityId: '402',
  saved: false,
  onUrlChange: noop,
  onDefaultProjectIdChange: noop,
  onDefaultActivityIdChange: noop,
  onSave: noop,
  onGenerateWebhookSecret: noop,
};

function adminFixture(fileName: string, overrides: Partial<AdminViewProps>): UiDocumentationFixture {
  return {
    fileName,
    kind: 'admin',
    // Documentation fixture. Uses the same AdminView as the Forge runtime.
    element: <AdminView {...adminBase} {...overrides} />,
  };
}

export const uiDocumentationFixtures: UiDocumentationFixture[] = [
  issueFixture('issue-not-configured.png', { configured: false }, '00:00:00'),
  issueFixture('manual-entry-current.png', issueState, '00:00:00'),
  issueFixture('issue-personal-connection.png', { configured: true, personalTokenConfigured: false }, '00:00:00', true),
  adminFixture('admin-configuration.png', { saved: true }),
  adminFixture('admin-webhook.png', {
    webhookSecret: 'docs-only-secret-********',
  }),
];
