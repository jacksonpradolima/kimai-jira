import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Text,
  Button,
  Stack,
  Textfield,
  FormSection,
  Label,
} from '@forge/react';
import { invoke } from '@forge/bridge';

interface ConfigurationState {
  config?: { url: string; hasToken: boolean };
}

/**
 * Admin configuration page ("jira:adminPage") entry point.
 *
 * Lets a site administrator point the app at their self-hosted Kimai
 * instance. Credentials entered here are written straight to the Forge
 * Secret Store by the `configuration-resolver` function; they are never
 * persisted in plain storage or exposed back to the browser.
 */
const App = () => {
  const [state, setState] = useState<ConfigurationState | undefined>(undefined);
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    invoke('getConfiguration').then((result) => {
      const typed = result as ConfigurationState;
      setState(typed);
      setUrl(typed.config?.url ?? '');
    });
  }, []);

  const onSave = async () => {
    await invoke('saveConnectionSettings', { url });
    setSaved(true);
  };

  if (!state) {
    return <Text>Loading configuration...</Text>;
  }

  return (
    <Stack space="space.200">
      <Text>Kimai Integration</Text>
      <FormSection>
        <Label labelFor="kimai-url">Kimai URL</Label>
        <Textfield
          id="kimai-url"
          value={url}
          onChange={(e: { target: { value?: unknown } }) => setUrl(String(e.target.value ?? ''))}
        />
      </FormSection>
      <Button appearance="primary" onClick={onSave}>
        Save
      </Button>
      {saved && <Text>Saved.</Text>}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

export default App;
