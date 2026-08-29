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
  config?: {
    url?: string;
    hasToken?: boolean;
    defaultProjectId?: number;
    defaultActivityId?: number;
  };
}

/**
 * Admin configuration page ("jira:adminPage") entry point.
 *
 * Lets a site administrator point the app at their self-hosted Kimai
 * instance and store the required API token/default IDs. The token is
 * written to the Forge Secret Store by the configuration resolver; it is
 * never persisted in plain storage or exposed back to the browser.
 */
const App = () => {
  const [state, setState] = useState<ConfigurationState | undefined>(undefined);
  const [url, setUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [defaultActivityId, setDefaultActivityId] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    invoke('getConfiguration')
      .then((result) => {
        const typed = result as ConfigurationState;
        setState(typed);
        setUrl(typed.config?.url ?? '');
        setDefaultProjectId(
          typed.config?.defaultProjectId !== undefined ? String(typed.config.defaultProjectId) : '',
        );
        setDefaultActivityId(
          typed.config?.defaultActivityId !== undefined ? String(typed.config.defaultActivityId) : '',
        );
        setApiToken('');
        setError(undefined);
      })
      .catch(() => setError('Unable to load the current Kimai configuration.'));
  }, []);

  const onSave = async () => {
    try {
      await invoke('saveConnectionSettings', {
        url,
        apiToken: apiToken || undefined,
        defaultProjectId: defaultProjectId === '' ? undefined : Number(defaultProjectId),
        defaultActivityId: defaultActivityId === '' ? undefined : Number(defaultActivityId),
      });
      setSaved(true);
      setError(undefined);
    } catch (saveError) {
      setSaved(false);
      setError(`Unable to save the Kimai configuration: ${String(saveError)}`);
    }
  };

  if (!state) {
    return <Text>Loading configuration...</Text>;
  }

  return (
    <Stack space="space.200">
      <Text>Kimai Integration</Text>
      <Text>Store the base URL and API token for this Jira site’s Kimai connection.</Text>
      <FormSection>
        <Label labelFor="kimai-url">Kimai URL</Label>
        <Textfield
          id="kimai-url"
          value={url}
          onChange={(e: { target: { value?: unknown } }) => setUrl(String(e.target.value ?? ''))}
        />
      </FormSection>
      <FormSection>
        <Label labelFor="kimai-token">Kimai API token</Label>
        <Textfield
          id="kimai-token"
          type="password"
          value={apiToken}
          onChange={(e: { target: { value?: unknown } }) => setApiToken(String(e.target.value ?? ''))}
        />
      </FormSection>
      <FormSection>
        <Label labelFor="default-project-id">Default Kimai project ID</Label>
        <Textfield
          id="default-project-id"
          value={defaultProjectId}
          onChange={(e: { target: { value?: unknown } }) =>
            setDefaultProjectId(String(e.target.value ?? ''))
          }
        />
      </FormSection>
      <FormSection>
        <Label labelFor="default-activity-id">Default Kimai activity ID</Label>
        <Textfield
          id="default-activity-id"
          value={defaultActivityId}
          onChange={(e: { target: { value?: unknown } }) =>
            setDefaultActivityId(String(e.target.value ?? ''))
          }
        />
      </FormSection>
      <Button appearance="primary" onClick={onSave}>
        Save
      </Button>
      {error && <Text>{error}</Text>}
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
