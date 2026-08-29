import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Button, Stack, Tabs, Tab, TabList, TabPanel } from '@forge/react';
import { invoke, view } from '@forge/bridge';

interface TimerState {
  configured: boolean;
  kimaiUrl?: string;
  defaultProjectId?: number;
  defaultActivityId?: number;
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

  useEffect(() => {
    Promise.all([invoke('getIssueTimerState'), view.getContext()])
      .then(([result, context]) => {
        setState(result as TimerState);
        const key = context.extension.issue?.key;
        setIssueKey(typeof key === 'string' ? key : undefined);
      })
      .catch(() => setError('Unable to load the Kimai timer status.'));
  }, []);

  const handleStart = async () => {
    if (!state?.defaultProjectId || !state?.defaultActivityId || !issueKey) {
      setError('Open a Jira issue after setting the default Kimai project and activity.');
      return;
    }

    try {
      const result = (await invoke('startTimer', {
        project: state.defaultProjectId,
        activity: state.defaultActivityId,
        description: `[${issueKey}] Jira issue timer`,
      })) as { ok?: boolean; error?: string };

      if (!result?.ok) {
        setError(result?.error ?? 'Unable to start the Kimai timer.');
        return;
      }

      setError(undefined);
    } catch (startError) {
      setError(`Unable to start the Kimai timer: ${String(startError)}`);
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
            <Text>00:00:00</Text>
            <Button appearance="primary" onClick={handleStart}>
              Start
            </Button>
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
