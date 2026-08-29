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
  webhookUrl?: string;
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
  const [jiraAccountId, setJiraAccountId] = useState('');
  const [kimaiUserId, setKimaiUserId] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [testResult, setTestResult] = useState<string | undefined>(undefined);
  const [webhookSecret, setWebhookSecret] = useState<string | undefined>(undefined);

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
      const connectionResult = (await invoke('saveConnectionSettings', {
        url,
        apiToken: apiToken || undefined,
        defaultProjectId: defaultProjectId === '' ? null : Number(defaultProjectId),
        defaultActivityId: defaultActivityId === '' ? null : Number(defaultActivityId),
      })) as { ok?: boolean; error?: string };

      if (!connectionResult.ok) {
        throw new Error(connectionResult.error ?? 'Unable to save the connection settings.');
      }

      if (jiraAccountId || kimaiUserId) {
        const mappingResult = (await invoke('saveUserMapping', {
          jiraAccountId,
          kimaiUserId: kimaiUserId === '' ? undefined : Number(kimaiUserId),
          enabled: true,
        })) as { ok?: boolean; error?: string };

        if (!mappingResult.ok) {
          throw new Error(mappingResult.error ?? 'Unable to save the user mapping.');
        }
      }

      setSaved(true);
      setError(undefined);
    } catch (saveError) {
      setSaved(false);
      setError(`Unable to save the Kimai configuration: ${String(saveError)}`);
    }
  };

  const onTestConnection = async () => {
    try {
      const result = (await invoke('testConnection')) as {
        ok?: boolean;
        error?: string;
        user?: { username?: string; email?: string };
      };

      setTestResult(
        result.ok
          ? `Connected${result.user?.username ? ` as ${result.user.username}` : ''}.`
          : result.error ?? 'Unable to connect to Kimai.',
      );
    } catch (testError) {
      setTestResult(`Unable to test the Kimai connection: ${String(testError)}`);
    }
  };

  const onGenerateWebhookSecret = async () => {
    try {
      const result = (await invoke('rotateWebhookSecret')) as {
        ok?: boolean;
        secret?: string;
      };

      if (!result.ok || !result.secret) {
        throw new Error('Unable to generate the Kimai webhook secret.');
      }

      setWebhookSecret(result.secret);
      setError(undefined);
    } catch (secretError) {
      setError(`Unable to generate the Kimai webhook secret: ${String(secretError)}`);
    }
  };

  if (!state) {
    return <Text>{error ?? 'Loading configuration...'}</Text>;
  }

  return (
    <Stack space="space.200">
      <Text>Kimai Integration</Text>
      <Text>Store the base URL, API token, defaults, and Jira user mappings.</Text>
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
      <FormSection>
        <Label labelFor="jira-account-id">Jira account ID</Label>
        <Textfield
          id="jira-account-id"
          value={jiraAccountId}
          onChange={(e: { target: { value?: unknown } }) =>
            setJiraAccountId(String(e.target.value ?? ''))
          }
        />
      </FormSection>
      <FormSection>
        <Label labelFor="kimai-user-id">Mapped Kimai user ID</Label>
        <Textfield
          id="kimai-user-id"
          value={kimaiUserId}
          onChange={(e: { target: { value?: unknown } }) =>
            setKimaiUserId(String(e.target.value ?? ''))
          }
        />
      </FormSection>
      <Button appearance="primary" onClick={onSave}>
        Save
      </Button>
      <Button onClick={onTestConnection}>Test connection</Button>
      <Button onClick={onGenerateWebhookSecret}>Generate webhook secret</Button>
      {state.webhookUrl && <Text>{state.webhookUrl}</Text>}
      {error && <Text>{error}</Text>}
      {testResult && <Text>{testResult}</Text>}
      {webhookSecret && <Text>{webhookSecret}</Text>}
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
