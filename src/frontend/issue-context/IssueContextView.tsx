import {
  Button,
  Box,
  Checkbox,
  FormSection,
  Inline,
  Label,
  LoadingButton,
  Select,
  Stack,
  Tag,
  TagGroup,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  TextArea,
  Textfield,
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
  manualTags: string[];
  manualTagInput: string;
  manualBillable: boolean;
  isManualEntryPending: boolean;
  manualEntryMessage?: string;
  error?: string;
  activeTab?: 'timer' | 'manual';
  onCustomerChange: (customerId: number | undefined) => void;
  onManageConnection: () => void;
  onPersonalApiTokenChange: (value: string) => void;
  onSavePersonalToken: () => void;
  onResetPersonalToken: () => void;
  onManualDescriptionChange: (value: string) => void;
  onManualDateChange: (value: string) => void;
  onManualStartTimeChange: (value: string) => void;
  onManualEndTimeChange: (value: string) => void;
  onManualTagInputChange: (value: string) => void;
  onAddManualTag: () => void;
  onRemoveManualTag: (tag: string) => void;
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
  elapsedTime,
  selectedKimaiCustomerId,
  isTimerActionPending,
  isManagingConnection,
  isPersonalConnectionPending,
  personalApiToken,
  personalConnectionMessage,
  manualDescription,
  manualTotalDuration,
  manualDate,
  manualStartTime,
  manualEndTime,
  manualTags,
  manualTagInput,
  manualBillable,
  isManualEntryPending,
  manualEntryMessage,
  error,
  activeTab = 'manual',
  onCustomerChange,
  onManageConnection,
  onPersonalApiTokenChange,
  onSavePersonalToken,
  onResetPersonalToken,
  onManualDescriptionChange,
  onManualDateChange,
  onManualStartTimeChange,
  onManualEndTimeChange,
  onManualTagInputChange,
  onAddManualTag,
  onRemoveManualTag,
  onManualBillableChange,
  onCreateManualEntry,
  onStart,
  onStop,
}: IssueContextViewProps) => {
  if (!state.configured) {
    return <Text>Kimai is not configured yet. Ask a site administrator to set it up.</Text>;
  }

  const customerOptions = (state.customers ?? []).map((customer) => ({ label: customer.name, value: customer.id }));
  const selectedCustomer = customerOptions.find((option) => option.value === selectedKimaiCustomerId) ?? null;
  const connection = (
    <PersonalKimaiConnection
      connectedUser={state.connectedKimaiUser}
      hasPersonalToken={Boolean(state.personalTokenConfigured)}
      isManagingConnection={isManagingConnection}
      isPending={isPersonalConnectionPending}
      message={personalConnectionMessage}
      onManage={onManageConnection}
      onReset={onResetPersonalToken}
      onSave={onSavePersonalToken}
      onTokenChange={onPersonalApiTokenChange}
      token={personalApiToken}
    />
  );

  return (
    <Stack space="space.100">
      <Tabs defaultSelected={activeTab === 'timer' ? 1 : 0} id="kimai-tabs">
        <TabList><Tab>Manual</Tab><Tab>Timer</Tab></TabList>
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
            onTagInputChange={onManualTagInputChange}
            onAddTag={onAddManualTag}
            onRemoveTag={onRemoveManualTag}
            onManageConnection={onManageConnection}
            selectedCustomer={selectedCustomer}
            state={state}
            billable={manualBillable}
            date={manualDate}
            description={manualDescription}
            totalDuration={manualTotalDuration}
            endTime={manualEndTime}
            startTime={manualStartTime}
            tags={manualTags}
            tagInput={manualTagInput}
          />
        </TabPanel>
        <TabPanel>
          <Stack space="space.100">
            {!state.personalTokenConfigured ? (
              <PersonalKimaiConnection
                hasPersonalToken={false}
                isManagingConnection={isManagingConnection}
                isPending={isPersonalConnectionPending}
                message={personalConnectionMessage ?? 'Add your personal Kimai API token to start tracking time.'}
                onManage={onManageConnection}
                onReset={onResetPersonalToken}
                onSave={onSavePersonalToken}
                onTokenChange={onPersonalApiTokenChange}
                token={personalApiToken}
              />
            ) : state.timerUnavailable ? (
              <><Text>Unable to verify the active Kimai timer. Try again shortly.</Text>{connection}</>
            ) : state.timerSetupError ? (
              <><Text>{state.timerSetupError}</Text>{connection}</>
            ) : (
              <Stack space="space.100">
                {customerOptions.length === 0 ? (
                  <Text>No Kimai customers are available. Create a customer in Kimai before starting a timer.</Text>
                ) : (
                  <FormSection>
                    <Label labelFor="kimai-customer">Customer</Label>
                    <Select
                      inputId="kimai-customer"
                      isDisabled={Boolean(state.runningTimesheet) || isTimerActionPending}
                      name="kimai-customer"
                      onChange={(option) => {
                        const selected = option as { value?: unknown } | null;
                        onCustomerChange(typeof selected?.value === 'number' ? selected.value : undefined);
                      }}
                      options={customerOptions}
                      placeholder="Select a customer"
                      value={selectedCustomer}
                    />
                  </FormSection>
                )}
                <FormSection>
                  <Label labelFor="timer-project">Project</Label>
                  <Textfield id="timer-project" isReadOnly value={state.target?.projectName ?? ''} />
                </FormSection>
                <FormSection>
                  <Label labelFor="timer-issue">Issue (Kimai activity)</Label>
                  <Textfield id="timer-issue" isReadOnly value={state.target?.activityName ?? ''} />
                </FormSection>
                <FormSection>
                  <Label labelFor="timer-elapsed">Elapsed time</Label>
                  <Textfield id="timer-elapsed" isReadOnly value={elapsedTime} />
                </FormSection>
                {state.runningTimesheet ? (
                  <LoadingButton appearance="primary" isDisabled={isTimerActionPending} isLoading={isTimerActionPending} onClick={onStop} shouldFitContainer>Stop</LoadingButton>
                ) : (
                  <LoadingButton
                    appearance="primary"
                    isDisabled={isTimerActionPending || customerOptions.length === 0 || !selectedKimaiCustomerId}
                    isLoading={isTimerActionPending}
                    onClick={onStart}
                    shouldFitContainer
                  >Start</LoadingButton>
                )}
                <Box xcss={xcss({
                  borderBlockStartColor: 'color.border',
                  borderBlockStartWidth: 'border.width',
                  paddingBlockStart: 'space.150',
                })}>{connection}</Box>
              </Stack>
            )}
            {error && <Text>{error}</Text>}
          </Stack>
        </TabPanel>
      </Tabs>
    </Stack>
  );
};

interface PersonalKimaiConnectionProps {
  connectedUser?: string;
  hasPersonalToken: boolean;
  isManagingConnection: boolean;
  isPending: boolean;
  message?: string;
  token: string;
  onManage: () => void;
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
  tags: string[];
  tagInput: string;
  billable: boolean;
  isPending: boolean;
  message?: string;
  onCustomerChange: (customerId: number | undefined) => void;
  onDescriptionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onManageConnection: () => void;
  onBillableChange: (value: boolean) => void;
  onCreate: () => void;
}

function ManualTimeEntry({
  state, customerOptions, selectedCustomer, description, totalDuration, date, startTime, endTime, tags, tagInput, billable,
  isPending, message, onCustomerChange, onDescriptionChange, onDateChange,
  onStartTimeChange, onEndTimeChange, onTagInputChange, onAddTag, onRemoveTag, onManageConnection, onBillableChange, onCreate,
}: ManualTimeEntryProps) {
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
        <Textfield id="manual-total-duration" isReadOnly value={totalDuration} />
      </FormSection>
      <LoadingButton
        appearance="primary"
        isDisabled={isPending || !selectedCustomer || totalDuration === '—'}
        isLoading={isPending}
        onClick={onCreate}
        shouldFitContainer
      >Add time</LoadingButton>
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
            <Textfield id="manual-project" isReadOnly value={state.target?.projectName ?? ''} />
          </FormSection>
          <FormSection>
            <Label labelFor="manual-issue">Issue (Kimai activity)</Label>
            <Textfield id="manual-issue" isReadOnly value={state.target?.activityName ?? ''} />
          </FormSection>
          <FormSection>
            <Label labelFor="manual-tags">Tags</Label>
            <Inline alignBlock="end" grow="fill" space="space.100">
              <Textfield id="manual-tags" placeholder="Type a tag" value={tagInput} onChange={(event: { target: { value?: unknown } }) => onTagInputChange(String(event.target.value ?? ''))} />
              <Button isDisabled={!tagInput.trim()} onClick={onAddTag}>Add tag</Button>
            </Inline>
            {tags.length > 0 && (
              <TagGroup>
                {tags.map((tag) => (
                  <Inline key={tag} alignBlock="center" space="space.050">
                    <Tag text={tag} />
                    <Button onClick={() => onRemoveTag(tag)}>Remove {tag}</Button>
                  </Inline>
                ))}
              </TagGroup>
            )}
          </FormSection>
          <Checkbox label="Billable" isChecked={billable} onChange={(event: { target: { checked?: unknown } }) => onBillableChange(event.target.checked === true)} />
          <Button onClick={onManageConnection}>Manage Kimai connection</Button>
        </Stack>
      </Box>
      {message && <Text>{message}</Text>}
    </Stack>
  );
}

function PersonalKimaiConnection({
  connectedUser, hasPersonalToken, isManagingConnection, isPending, message, token, onManage, onTokenChange, onSave, onReset,
}: PersonalKimaiConnectionProps) {
  if (!isManagingConnection) {
    return <><Text>{connectedUser ? `Connected to Kimai as ${connectedUser}.` : message ?? ''}</Text><Button onClick={onManage}>Manage Kimai connection</Button></>;
  }
  return (
    <Stack space="space.100">
      <Text>Your Kimai API token is personal. It is encrypted and only used for your timers and worklogs.</Text>
      <FormSection>
        <Label labelFor="personal-kimai-token">Kimai API token</Label>
        <Textfield
          id="personal-kimai-token"
          type="password"
          value={token}
          onChange={(event: { target: { value?: unknown } }) => onTokenChange(String(event.target.value ?? ''))}
        />
      </FormSection>
      <LoadingButton appearance="primary" isDisabled={isPending || !token} isLoading={isPending} onClick={onSave}>Save personal API token</LoadingButton>
      {hasPersonalToken && <Button isDisabled={isPending} onClick={onReset}>Reset API key</Button>}
      {message && <Text>{message}</Text>}
    </Stack>
  );
}
