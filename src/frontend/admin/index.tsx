import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text } from '@forge/react';
import { invoke } from '@forge/bridge';
import { AdminView, ConfigurationState } from './AdminView';

/** Forge integration for site-wide Kimai settings. Personal tokens are managed in issue context. */
const App = () => {
  const [state, setState] = useState<ConfigurationState | undefined>(undefined);
  const [url, setUrl] = useState('');
  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [defaultActivityId, setDefaultActivityId] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [webhookSecret, setWebhookSecret] = useState<string | undefined>(undefined);

  useEffect(() => {
    invoke('getConfiguration').then((result) => {
      const typed = result as ConfigurationState;
      setState(typed);
      setUrl(typed.config?.url ?? '');
      setDefaultProjectId(typed.config?.defaultProjectId === undefined ? '' : String(typed.config.defaultProjectId));
      setDefaultActivityId(typed.config?.defaultActivityId === undefined ? '' : String(typed.config.defaultActivityId));
      setError(undefined);
    }).catch(() => setError('Unable to load the current Kimai configuration.'));
  }, []);

  const onSave = async () => {
    try {
      const result = (await invoke('saveConnectionSettings', {
        url,
        defaultProjectId: defaultProjectId === '' ? null : Number(defaultProjectId),
        defaultActivityId: defaultActivityId === '' ? null : Number(defaultActivityId),
      })) as { ok?: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? 'Unable to save the connection settings.');
      setSaved(true);
      setError(undefined);
    } catch (saveError) {
      setSaved(false);
      setError(`Unable to save the Kimai configuration: ${String(saveError)}`);
    }
  };

  const onGenerateWebhookSecret = async () => {
    try {
      const result = (await invoke('rotateWebhookSecret')) as { ok?: boolean; secret?: string };
      if (!result.ok || !result.secret) throw new Error('Unable to generate the Kimai webhook secret.');
      setWebhookSecret(result.secret);
      setError(undefined);
    } catch (secretError) {
      setError(`Unable to generate the Kimai webhook secret: ${String(secretError)}`);
    }
  };

  if (!state) return <Text>{error ?? 'Loading configuration...'}</Text>;
  return <AdminView
    defaultActivityId={defaultActivityId}
    defaultProjectId={defaultProjectId}
    error={error}
    onDefaultActivityIdChange={setDefaultActivityId}
    onDefaultProjectIdChange={setDefaultProjectId}
    onGenerateWebhookSecret={onGenerateWebhookSecret}
    onSave={onSave}
    onUrlChange={setUrl}
    saved={saved}
    state={state}
    url={url}
    webhookSecret={webhookSecret}
  />;
};

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);

export default App;
