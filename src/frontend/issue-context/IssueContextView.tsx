import {
  Button,
  Box,
  FormSection,
  Inline,
  Label,
  LoadingButton,
  Select,
  SectionMessage,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  TextArea,
  Textfield,
  Toggle,
  Tooltip,
  xcss,
} from '@forge/react';

export interface KimaiCustomer { id: number; name: string; }

export interface KimaiTarget {
  status: 'existing' | 'to-be-created';
  kimaiCustomerId?: number;
  projectId?: number;
  activityId?: number;
  projectName: string;
  activityName: string;
}

export interface Timesheet { id: number; begin?: string; }

export interface TimerState {
  configured: boolean;
  personalTokenConfigured?: boolean;
  connectedKimaiUser?: string;
  kimaiUrl?: string;
  issueKey?: string;
  issueSummary?: string;
  customers?: KimaiCustomer[];
  defaultKimaiCustomerId?: number;
  target?: KimaiTarget;
  runningTimesheet?: Timesheet;
  timerUnavailable?: boolean;
  timerSetupError?: string;
}

export interface IssueContextViewProps {
  state: TimerState;
  elapsedTime: string;
  selectedKimaiCustomerId?: number;
  isTimerActionPending: boolean;
  isManagingConnection: boolean;
  isPersonalConnectionPending: boolean;
  personalApiToken: string;
  personalConnectionMessage?: string;
  manualDescription: string;
  manualTotalDuration: string;
  manualDate: string;
  manualStartTime: string;
  manualEndTime: string;
  manualBillable: boolean;
  isManualEntryPending: boolean;
  manualEntryMessage?: string;
  error?: string;
  activeTab?: 'timer' | 'manual';
  onCustomerChange: (customerId: number | undefined) => void;
  onManageConnection: () => void;
  onConnectionBack: () => void;
  onPersonalApiTokenChange: (value: string) => void;
  onSavePersonalToken: () => void;
  onResetPersonalToken: () => void;
  onManualDescriptionChange: (value: string) => void;
  onManualDateChange: (value: string) => void;
  onManualStartTimeChange: (value: string) => void;
  onManualEndTimeChange: (value: string) => void;
  onManualBillableChange: (value: boolean) => void;
  onCreateManualEntry: () => void;
  onStart: () => void;
  onStop: () => void;
}

/**
 * Presentational UI Kit view shared by the Forge issue-context entry point and
 * deterministic documentation fixtures. Bridge and secret-store calls remain
 * in index.tsx and the resolver.
 */
export const IssueContextView = ({
  state,
  selectedKimaiCustomerId,
  isManagingConnection,
  isPersonalConnectionPending,
  personalApiToken,
  personalConnectionMessage,
  manualDescription,
  manualTotalDuration,
  manualDate,
  manualStartTime,
  manualEndTime,
  manualBillable,
  isManualEntryPending,
  manualEntryMessage,
  error,
  onCustomerChange,
  onManageConnection,
  onConnectionBack,
  onPersonalApiTokenChange,
  onSavePersonalToken,
  onResetPersonalToken,
  onManualDescriptionChange,
  onManualDateChange,
  onManualStartTimeChange,
  onManualEndTimeChange,
  onManualBillableChange,
  onCreateManualEntry,
}: IssueContextViewProps) => {
  if (!state.configured) {
    return <Text>Kimai is not configured yet. Ask a site administrator to set it up.</Text>;
  }

  const customerOptions = (state.customers ?? []).map((customer) => ({ label: customer.name, value: customer.id }));
  const selectedCustomer = customerOptions.find((option) => option.value === selectedKimaiCustomerId) ?? null;
  const connection = (
    <PersonalKimaiConnection
      hasPersonalToken={Boolean(state.personalTokenConfigured)}
      isManagingConnection={isManagingConnection}
      isPending={isPersonalConnectionPending}
      message={personalConnectionMessage}
      onManage={onManageConnection}
      onBack={onConnectionBack}
      onReset={onResetPersonalToken}
      onSave={onSavePersonalToken}
      onTokenChange={onPersonalApiTokenChange}
      token={personalApiToken}
    />
  );

  if (isManagingConnection) {
    return <Stack space="space.100">{connection}</Stack>;
  }

  return (
    <Stack space="space.100">
      <Tabs defaultSelected={0} id="kimai-tabs">
        <TabList><Tab>Manual</Tab></TabList>
        <TabPanel>
          <ManualTimeEntry
            customerOptions={customerOptions}
            isPending={isManualEntryPending}
            message={manualEntryMessage}
            onBillableChange={onManualBillableChange}
            onCreate={onCreateManualEntry}
            onCustomerChange={onCustomerChange}
            onDateChange={onManualDateChange}
            onDescriptionChange={onManualDescriptionChange}
            onEndTimeChange={onManualEndTimeChange}
            onStartTimeChange={onManualStartTimeChange}
            onManageConnection={onManageConnection}
            selectedCustomer={selectedCustomer}
            state={state}
            billable={manualBillable}
            date={manualDate}
            description={manualDescription}
            totalDuration={manualTotalDuration}
            endTime={manualEndTime}
            startTime={manualStartTime}
          />
        </TabPanel>
      </Tabs>
      {error && <Text>{error}</Text>}
    </Stack>
  );
};

interface PersonalKimaiConnectionProps {
  hasPersonalToken: boolean;
  isManagingConnection: boolean;
  isPending: boolean;
  message?: string;
  token: string;
  onManage: () => void;
  onBack: () => void;
  onTokenChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
}

interface ManualTimeEntryProps {
  state: TimerState;
  customerOptions: Array<{ label: string; value: number }>;
  selectedCustomer: { label: string; value: number } | null;
  description: string;
  totalDuration: string;
  date: string;
  startTime: string;
  endTime: string;
  billable: boolean;
  isPending: boolean;
  message?: string;
  onCustomerChange: (customerId: number | undefined) => void;
  onDescriptionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onManageConnection: () => void;
  onBillableChange: (value: boolean) => void;
  onCreate: () => void;
}

function ManualTimeEntry({
  state, customerOptions, selectedCustomer, description, totalDuration, date, startTime, endTime, billable,
  isPending, message, onCustomerChange, onDescriptionChange, onDateChange,
  onStartTimeChange, onEndTimeChange, onManageConnection, onBillableChange, onCreate,
}: ManualTimeEntryProps) {
  const blockingReason = !state.personalTokenConfigured
    ? 'Add your personal Kimai API token before adding time.'
    : state.timerSetupError
      ? state.timerSetupError
      : state.timerUnavailable
        ? 'Kimai could not be reached. Try again shortly.'
        : customerOptions.length === 0
          ? 'No Kimai customers are available.'
          : !selectedCustomer
            ? 'Select a Kimai customer.'
            : totalDuration === '—'
              ? 'End time must be after start time.'
              : undefined;
  const isCreateDisabled = isPending || Boolean(blockingReason);
  return (
    <Stack space="space.100">
      <FormSection>
        <Label labelFor="manual-description">Description</Label>
        <TextArea id="manual-description" value={description} onChange={(event: { target: { value?: unknown } }) => onDescriptionChange(String(event.target.value ?? ''))} />
      </FormSection>
      <Inline alignBlock="start" grow="fill" shouldWrap={false} space="space.100">
        <FormSection>
          <Label labelFor="manual-date">Date</Label>
          <Textfield id="manual-date" type="date" value={date} onChange={(event: { target: { value?: unknown } }) => onDateChange(String(event.target.value ?? ''))} />
        </FormSection>
        <FormSection>
          <Label labelFor="manual-start-time">Start time</Label>
          <Textfield id="manual-start-time" type="time" value={startTime} onChange={(event: { target: { value?: unknown } }) => onStartTimeChange(String(event.target.value ?? ''))} />
        </FormSection>
        <FormSection>
          <Label labelFor="manual-end-time">End time</Label>
          <Textfield id="manual-end-time" type="time" value={endTime} onChange={(event: { target: { value?: unknown } }) => onEndTimeChange(String(event.target.value ?? ''))} />
        </FormSection>
      </Inline>
      <FormSection>
        <Label labelFor="manual-total-duration">Total duration</Label>
        <Textfield id="manual-total-duration" isDisabled value={totalDuration} />
      </FormSection>
      {!state.personalTokenConfigured && (
        <SectionMessage appearance="warning" title="Connect Kimai before adding time">
          Add your personal Kimai API token to enable manual time entries.
          <Button appearance="subtle" onClick={onManageConnection}>Connect Kimai</Button>
        </SectionMessage>
      )}
      <Tooltip content={blockingReason ?? 'Add this time entry to Kimai.'}>
        <Box>
          <LoadingButton
            appearance="primary"
            isDisabled={isCreateDisabled}
            isLoading={isPending}
            onClick={onCreate}
            shouldFitContainer
          >Add time</LoadingButton>
        </Box>
      </Tooltip>
      {message && <SectionMessage appearance={message === 'Time added' ? 'success' : 'error'}>{message}</SectionMessage>}
      <Box xcss={xcss({
        borderBlockStartColor: 'color.border',
        borderBlockStartWidth: 'border.width',
        paddingBlockStart: 'space.150',
      })}>
        <Stack space="space.100">
          <FormSection>
            <Label labelFor="manual-customer">Customer</Label>
            <Select
              inputId="manual-customer"
              name="manual-customer"
              onChange={(option) => {
                const selected = option as { value?: unknown } | null;
                onCustomerChange(typeof selected?.value === 'number' ? selected.value : undefined);
              }}
              options={customerOptions}
              placeholder="Select a customer"
              value={selectedCustomer}
            />
          </FormSection>
          <FormSection>
            <Label labelFor="manual-project">Project</Label>
            <Textfield id="manual-project" isDisabled value={state.target?.projectName ?? ''} />
          </FormSection>
          <FormSection>
            <Label labelFor="manual-issue">Issue (Kimai activity)</Label>
            <Textfield id="manual-issue" isDisabled value={state.target?.activityName ?? ''} />
          </FormSection>
          <FormSection>
            <Label labelFor="manual-billable">Billable</Label>
            <Toggle
              id="manual-billable"
              isChecked={billable}
              label="Billable"
              name="manual-billable"
              onChange={() => onBillableChange(!billable)}
              size="large"
            />
          </FormSection>
          {/* Tags are temporarily disabled while we verify Kimai timesheet creation. */}
          <Button onClick={onManageConnection}>Manage Kimai connection</Button>
        </Stack>
      </Box>
    </Stack>
  );
}

function PersonalKimaiConnection({
  hasPersonalToken, isManagingConnection, isPending, message, token, onManage, onBack, onTokenChange, onSave, onReset,
}: PersonalKimaiConnectionProps) {
  if (!isManagingConnection) {
    return <><Button onClick={onManage}>Manage Kimai connection</Button>{message && <SectionMessage appearance="error">{message}</SectionMessage>}</>;
  }
  return (
    <Stack space="space.100">
      <Box xcss={xcss({ paddingBlockStart: 'space.200' })}>
        <Text>Your Kimai API token is personal. It is encrypted and only used for your timers and worklogs.</Text>
      </Box>
      <FormSection>
        <Label labelFor="personal-kimai-token">Kimai API token</Label>
        <Textfield
          id="personal-kimai-token"
          placeholder={hasPersonalToken ? '••••••••••••' : 'Enter your Kimai API token'}
          type="password"
          value={token}
          onChange={(event: { target: { value?: unknown } }) => onTokenChange(String(event.target.value ?? ''))}
        />
      </FormSection>
      <Inline space="space.100">
        <Button appearance="subtle" isDisabled={isPending} onClick={onBack}>Back</Button>
        <LoadingButton appearance="primary" isDisabled={isPending || !token} isLoading={isPending} onClick={onSave}>Save</LoadingButton>
        {hasPersonalToken && <Button appearance="subtle" isDisabled={isPending} onClick={onReset}>Reset</Button>}
      </Inline>
      {message && <SectionMessage appearance={message.startsWith('Connected') ? 'success' : 'error'} title={message.startsWith('Connected') ? 'Kimai connected' : 'Kimai connection error'}>{message}</SectionMessage>}
    </Stack>
  );
}
