import React, { useEffect, useRef, useState } from 'react';
import ForgeReconciler, { Text } from '@forge/react';
import { invoke, view } from '@forge/bridge';
import { IssueContextView, TimerState, Timesheet } from './IssueContextView';

function formatElapsedTime(startedAt: string | undefined, now: number): string {
  const startMilliseconds = startedAt ? new Date(startedAt).getTime() : now;
  const elapsedSeconds = Number.isNaN(startMilliseconds)
    ? 0
    : Math.max(0, Math.floor((now - startMilliseconds) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function localDateInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function defaultManualDescription(timerState: TimerState | undefined): string {
  if (!timerState?.issueKey || !timerState.issueSummary) return '';
  return `[${timerState.issueKey}] ${timerState.issueSummary}`;
}

function manualTotalDuration(startTime: string, endTime: string): string {
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return '—';
  }
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const totalMinutes = minutes(endTime) - minutes(startTime);
  if (totalMinutes <= 0) return '—';
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:00`;
}

function timezoneOffsetForManualStart(date: string, time: string): number {
  // An ISO timestamp without a zone is interpreted in the browser's local timezone.
  // Reading the offset from this selected date (rather than "now") handles DST changes.
  const selectedLocalTime = new Date(`${date}T${time}:00`);
  return Number.isNaN(selectedLocalTime.getTime())
    ? new Date().getTimezoneOffset()
    : selectedLocalTime.getTimezoneOffset();
}

/** Forge integration for the issue-context panel. */
const App = () => {
  const [state, setState] = useState<TimerState | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [issueKey, setIssueKey] = useState<string | undefined>(undefined);
  const [runningTimesheet, setRunningTimesheet] = useState<Timesheet | undefined>(undefined);
  const [isTimerActionPending, setIsTimerActionPending] = useState(false);
  const [isManagingConnection, setIsManagingConnection] = useState(false);
  const [activeTab, setActiveTab] = useState<'timer' | 'manual'>('manual');
  const [isPersonalConnectionPending, setIsPersonalConnectionPending] = useState(false);
  const [personalApiToken, setPersonalApiToken] = useState('');
  const [personalConnectionMessage, setPersonalConnectionMessage] = useState<string | undefined>(undefined);
  const [selectedKimaiCustomerId, setSelectedKimaiCustomerId] = useState<number | undefined>(undefined);
  const [manualDescription, setManualDescription] = useState('');
  const [manualDate, setManualDate] = useState(localDateInputValue);
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('10:00');
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [manualTagInput, setManualTagInput] = useState('');
  const [manualBillable, setManualBillable] = useState(false);
  const [isManualEntryPending, setIsManualEntryPending] = useState(false);
  const [manualEntryMessage, setManualEntryMessage] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  const timerActionInFlight = useRef(false);
  const manualEntryInFlight = useRef(false);
  const totalManualDuration = manualTotalDuration(manualStartTime, manualEndTime);

  useEffect(() => {
    view.getContext()
      .then((context) => {
        const key = context.extension.issue?.key;
        setIssueKey(typeof key === 'string' ? key : undefined);
        return invoke('getIssueTimerState', {});
      })
      .then((result) => {
        const timerState = result as TimerState;
        setState(timerState);
        setRunningTimesheet(timerState.runningTimesheet);
        setSelectedKimaiCustomerId(timerState.defaultKimaiCustomerId);
        setManualDescription(defaultManualDescription(timerState));
      })
      .catch(() => setError('Unable to load the Kimai timer status.'));
  }, []);

  useEffect(() => {
    if (!runningTimesheet) {
      return undefined;
    }
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [runningTimesheet]);

  const handleStart = async () => {
    if (timerActionInFlight.current) return;
    if (!issueKey) {
      setError('Open a Jira issue before starting a timer.');
      return;
    }
    if (!selectedKimaiCustomerId) {
      setError('Select a Kimai customer before starting a timer.');
      return;
    }
    timerActionInFlight.current = true;
    setIsTimerActionPending(true);
    try {
      const result = (await invoke('startTimer', { customerId: selectedKimaiCustomerId })) as {
        ok?: boolean; error?: string; timesheet?: Timesheet;
      };
      if (!result?.ok || !result.timesheet) {
        setError(result?.error ?? 'Unable to start the Kimai timer.');
        return;
      }
      setRunningTimesheet(result.timesheet);
      setError(undefined);
    } catch (startError) {
      setError(`Unable to start the Kimai timer: ${String(startError)}`);
    } finally {
      timerActionInFlight.current = false;
      setIsTimerActionPending(false);
    }
  };

  const handleStop = async () => {
    if (!runningTimesheet || timerActionInFlight.current) return;
    timerActionInFlight.current = true;
    setIsTimerActionPending(true);
    try {
      const result = (await invoke('stopTimer', { timesheetId: runningTimesheet.id })) as {
        ok?: boolean; error?: string;
      };
      if (!result?.ok) {
        setError(result?.error ?? 'Unable to stop the Kimai timer.');
        return;
      }
      setRunningTimesheet(undefined);
      setError(undefined);
    } catch (stopError) {
      setError(`Unable to stop the Kimai timer: ${String(stopError)}`);
    } finally {
      timerActionInFlight.current = false;
      setIsTimerActionPending(false);
    }
  };

  const handleSavePersonalToken = async () => {
    if (!personalApiToken || isPersonalConnectionPending) return;
    setIsPersonalConnectionPending(true);
    try {
      const result = (await invoke('savePersonalKimaiToken', { apiToken: personalApiToken })) as {
        ok?: boolean;
        error?: string;
        user?: { username?: string };
      };
      if (!result.ok) {
        setPersonalConnectionMessage(result.error ?? 'Unable to save your Kimai API token.');
        return;
      }
      const nextState = (await invoke('getIssueTimerState', {})) as TimerState;
      setState(nextState);
      setRunningTimesheet(nextState.runningTimesheet);
      setSelectedKimaiCustomerId(nextState.defaultKimaiCustomerId);
      setManualDescription(defaultManualDescription(nextState));
      setPersonalApiToken('');
      setIsManagingConnection(false);
      setPersonalConnectionMessage(`Connected to Kimai as ${result.user?.username ?? 'your user'}.`);
    } catch (connectionError) {
      setPersonalConnectionMessage(`Unable to save your Kimai API token: ${String(connectionError)}`);
    } finally {
      setIsPersonalConnectionPending(false);
    }
  };

  const handleResetPersonalToken = async () => {
    if (isPersonalConnectionPending) return;
    setIsPersonalConnectionPending(true);
    try {
      const result = (await invoke('clearPersonalKimaiToken', {})) as { ok?: boolean; error?: string };
      if (!result.ok) {
        setPersonalConnectionMessage(result.error ?? 'Unable to reset your Kimai API token.');
        return;
      }
      setState((current) => current && {
        ...current,
        personalTokenConfigured: false,
        connectedKimaiUser: undefined,
      });
      setRunningTimesheet(undefined);
      setPersonalApiToken('');
      setIsManagingConnection(false);
      setPersonalConnectionMessage('Your personal Kimai API token has been reset.');
    } catch (connectionError) {
      setPersonalConnectionMessage(`Unable to reset your Kimai API token: ${String(connectionError)}`);
    } finally {
      setIsPersonalConnectionPending(false);
    }
  };

  const handleCreateManualEntry = async () => {
    if (manualEntryInFlight.current || !selectedKimaiCustomerId || totalManualDuration === '—') return;
    manualEntryInFlight.current = true;
    setIsManualEntryPending(true);
    try {
      const result = (await invoke('createManualTimeEntry', {
        customerId: selectedKimaiCustomerId,
        description: manualDescription,
        duration: totalManualDuration,
        date: manualDate,
        startTime: manualStartTime,
        endTime: manualEndTime,
        timezoneOffsetMinutes: timezoneOffsetForManualStart(manualDate, manualStartTime),
        tags: manualTags,
        billable: manualBillable,
      })) as { ok?: boolean; error?: string; timesheet?: { id?: number } };
      if (!result.ok) {
        setManualEntryMessage(result.error ?? 'Unable to add time to Kimai.');
        return;
      }
      setManualDescription(defaultManualDescription(state));
      setManualTags([]);
      setManualTagInput('');
      setManualEntryMessage(`Time entry ${result.timesheet?.id ?? ''} added to Kimai.`.trim());
    } catch (manualError) {
      setManualEntryMessage(`Unable to add time to Kimai: ${String(manualError)}`);
    } finally {
      manualEntryInFlight.current = false;
      setIsManualEntryPending(false);
    }
  };

  if (!state) {
    return <Text>{error ?? 'Loading Kimai...'}</Text>;
  }

  return (
    <IssueContextView
      elapsedTime={formatElapsedTime(runningTimesheet?.begin, now)}
      error={error}
      isManagingConnection={isManagingConnection}
      isManualEntryPending={isManualEntryPending}
      isPersonalConnectionPending={isPersonalConnectionPending}
      isTimerActionPending={isTimerActionPending}
      onCustomerChange={setSelectedKimaiCustomerId}
      onManageConnection={() => {
        setIsManagingConnection(true);
        setActiveTab('timer');
        setPersonalConnectionMessage(undefined);
      }}
      onConnectionBack={() => {
        setIsManagingConnection(false);
        setActiveTab('manual');
      }}
      onCreateManualEntry={handleCreateManualEntry}
      onManualBillableChange={setManualBillable}
      onManualDateChange={setManualDate}
      onManualDescriptionChange={setManualDescription}
      onManualEndTimeChange={setManualEndTime}
      onManualStartTimeChange={setManualStartTime}
      onManualTagInputChange={setManualTagInput}
      onAddManualTag={() => {
        const tag = manualTagInput.trim();
        if (!tag) return;
        setManualTags((current) => current.some((value) => value.toLocaleLowerCase() === tag.toLocaleLowerCase())
          ? current
          : [...current, tag]);
        setManualTagInput('');
      }}
      onRemoveManualTag={(tag) => setManualTags((current) => current.filter((value) => value !== tag))}
      onPersonalApiTokenChange={setPersonalApiToken}
      onResetPersonalToken={handleResetPersonalToken}
      onSavePersonalToken={handleSavePersonalToken}
      onStart={handleStart}
      onStop={handleStop}
      personalApiToken={personalApiToken}
      personalConnectionMessage={personalConnectionMessage}
      manualBillable={manualBillable}
      manualDate={manualDate}
      manualDescription={manualDescription}
      manualEndTime={manualEndTime}
      manualEntryMessage={manualEntryMessage}
      manualStartTime={manualStartTime}
      manualTags={manualTags}
      manualTagInput={manualTagInput}
      manualTotalDuration={totalManualDuration}
      selectedKimaiCustomerId={selectedKimaiCustomerId}
      activeTab={activeTab}
      state={{ ...state, runningTimesheet }}
    />
  );
};

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);

export default App;
