import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Button, Stack, Tabs, Tab, TabList, TabPanel } from '@forge/react';
import { invoke, view } from '@forge/bridge';

interface TimerState {
  configured: boolean;
  kimaiUrl?: string;
  defaultProjectId?: number;
  defaultActivityId?: number;
  runningTimesheet?: Timesheet;
  timerUnavailable?: boolean;
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
  const [now, setNow] = useState(() => Date.now());

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
    if (!state?.defaultProjectId || !state?.defaultActivityId || !issueKey) {
      setError('Open a Jira issue after setting the default Kimai project and activity.');
      return;
    }

    try {
      const result = (await invoke('startTimer', {})) as {
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
    }
  };

  const handleStop = async () => {
    if (!runningTimesheet) {
      return;
    }

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
    }
  };

  if (!state) {
    return <Text>Loading Kimai...</Text>;
  }

  if (!state.configured) {
    return <Text>Kimai is not configured yet. Ask a site administrator to set it up.</Text>;
  }

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
            ) : (
              <>
                <Text>{formatElapsedTime(runningTimesheet?.begin, now)}</Text>
                {runningTimesheet ? (
                  <Button appearance="primary" onClick={handleStop}>
                    Stop
                  </Button>
                ) : (
                  <Button appearance="primary" onClick={handleStart}>
                    Start
                  </Button>
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
