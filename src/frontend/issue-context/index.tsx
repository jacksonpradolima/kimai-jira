import React, { useEffect, useRef, useState } from 'react';
import ForgeReconciler, {
  Text,
  LoadingButton,
  Select,
  Stack,
  Tabs,
  Tab,
  TabList,
  TabPanel,
} from '@forge/react';
import { invoke, view } from '@forge/bridge';

interface TimerState {
  configured: boolean;
  kimaiUrl?: string;
  customers?: KimaiCustomer[];
  defaultKimaiCustomerId?: number;
  target?: KimaiTarget;
  runningTimesheet?: Timesheet;
  timerUnavailable?: boolean;
  timerSetupError?: string;
}

interface KimaiCustomer {
  id: number;
  name: string;
}

interface KimaiTarget {
  status: 'existing' | 'to-be-created';
  kimaiCustomerId?: number;
  projectId?: number;
  activityId?: number;
  projectName: string;
  activityName: string;
}

interface Timesheet {
  id: number;
  begin?: string;
}

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

/**
 * Issue-context panel entry point ("jira:issueContext").
 *
 * This is an intentionally small MVP UI: a Timer/Manual tab pair backed by
 * the `issue-context-resolver` Forge function. See docs/architecture.md for
 * the full synchronization design.
 */
const App = () => {
  const [state, setState] = useState<TimerState | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [issueKey, setIssueKey] = useState<string | undefined>(undefined);
  const [runningTimesheet, setRunningTimesheet] = useState<Timesheet | undefined>(undefined);
  const [isTimerActionPending, setIsTimerActionPending] = useState(false);
  const [selectedKimaiCustomerId, setSelectedKimaiCustomerId] = useState<number | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  const timerActionInFlight = useRef(false);

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
    if (timerActionInFlight.current) {
      return;
    }
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
        ok?: boolean;
        error?: string;
        timesheet?: Timesheet;
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
    if (!runningTimesheet || timerActionInFlight.current) {
      return;
    }

    timerActionInFlight.current = true;
    setIsTimerActionPending(true);
    try {
      const result = (await invoke('stopTimer', {
        timesheetId: runningTimesheet.id,
      })) as { ok?: boolean; error?: string };

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

  if (!state) {
    return <Text>{error ?? 'Loading Kimai...'}</Text>;
  }

  if (!state.configured) {
    return <Text>Kimai is not configured yet. Ask a site administrator to set it up.</Text>;
  }

  const customerOptions = (state.customers ?? []).map((customer) => ({
    label: customer.name,
    value: customer.id,
  }));
  const selectedCustomer = customerOptions.find((option) => option.value === selectedKimaiCustomerId) ?? null;
  const targetWillBeCreated = state.target?.status === 'to-be-created'
    || state.target?.kimaiCustomerId !== selectedKimaiCustomerId;

  return (
    <Stack space="space.100">
      <Tabs id="kimai-tabs">
        <TabList>
          <Tab>Timer</Tab>
          <Tab>Manual</Tab>
        </TabList>
        <TabPanel>
          <Stack space="space.100">
            {state.timerUnavailable ? (
              <Text>Unable to verify the active Kimai timer. Try again shortly.</Text>
            ) : state.timerSetupError ? (
              <Text>{state.timerSetupError}</Text>
            ) : (
              <>
                {customerOptions.length === 0 ? (
                  <Text>No Kimai customers are available. Create a customer in Kimai before starting a timer.</Text>
                ) : (
                  <Select
                    inputId="kimai-customer"
                    isDisabled={Boolean(runningTimesheet) || isTimerActionPending}
                    name="kimai-customer"
                    onChange={(option) => {
                      const selected = option as { value?: unknown } | null;
                      setSelectedKimaiCustomerId(
                        typeof selected?.value === 'number' ? selected.value : undefined,
                      );
                    }}
                    options={customerOptions}
                    placeholder="Select a Kimai customer"
                    value={selectedCustomer}
                  />
                )}
                {state.target && selectedKimaiCustomerId && (
                  <Text>
                    {targetWillBeCreated
                      ? `Kimai target: ${state.target.projectName} / ${state.target.activityName} (to be created)`
                      : `Kimai target: ${state.target.projectName} / ${state.target.activityName}`}
                  </Text>
                )}
                <Text>{formatElapsedTime(runningTimesheet?.begin, now)}</Text>
                {runningTimesheet ? (
                  <LoadingButton
                    appearance="primary"
                    isDisabled={isTimerActionPending}
                    isLoading={isTimerActionPending}
                    onClick={handleStop}
                  >
                    Stop
                  </LoadingButton>
                ) : (
                  <LoadingButton
                    appearance="primary"
                    isDisabled={isTimerActionPending || customerOptions.length === 0 || !selectedKimaiCustomerId}
                    isLoading={isTimerActionPending}
                    onClick={handleStart}
                  >
                    Start
                  </LoadingButton>
                )}
              </>
            )}
            {error && <Text>{error}</Text>}
          </Stack>
        </TabPanel>
        <TabPanel>
          <Text>Manual time entry coming soon.</Text>
        </TabPanel>
      </Tabs>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

export default App;
