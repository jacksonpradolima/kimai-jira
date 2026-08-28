import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Button, Stack, Tabs, Tab, TabList, TabPanel } from '@forge/react';
import { invoke } from '@forge/bridge';

interface TimerState {
  configured: boolean;
  kimaiUrl?: string;
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

  useEffect(() => {
    invoke('getIssueTimerState').then((result) => setState(result as TimerState));
  }, []);

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
            <Button appearance="primary">Start</Button>
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
