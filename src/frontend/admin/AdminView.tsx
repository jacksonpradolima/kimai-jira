import { Button, FormSection, Label, Stack, Text, Textfield } from '@forge/react';

export interface ConfigurationState {
  config?: {
    url?: string;
    defaultProjectId?: number;
    defaultActivityId?: number;
  };
  webhookUrl?: string;
}

export interface AdminViewProps {
  state: ConfigurationState;
  url: string;
  defaultProjectId: string;
  defaultActivityId: string;
  saved: boolean;
  error?: string;
  webhookSecret?: string;
  onUrlChange: (value: string) => void;
  onDefaultProjectIdChange: (value: string) => void;
  onDefaultActivityIdChange: (value: string) => void;
  onSave: () => void;
  onGenerateWebhookSecret: () => void;
}

/** Shared production/admin documentation view. Personal tokens never enter this page. */
export const AdminView = ({
  state,
  url,
  defaultProjectId,
  defaultActivityId,
  saved,
  error,
  webhookSecret,
  onUrlChange,
  onDefaultProjectIdChange,
  onDefaultActivityIdChange,
  onSave,
  onGenerateWebhookSecret,
}: AdminViewProps) => (
  <Stack space="space.200">
    <Text>Kimai Integration</Text>
    <Text>Configure the shared Kimai endpoint and defaults. Each user connects their own personal API token from an issue.</Text>
    <FormSection>
      <Label labelFor="kimai-url">Kimai URL</Label>
      <Textfield id="kimai-url" value={url} onChange={(event: { target: { value?: unknown } }) => onUrlChange(String(event.target.value ?? ''))} />
    </FormSection>
    <FormSection>
      <Label labelFor="default-project-id">Default Kimai project ID</Label>
      <Textfield id="default-project-id" value={defaultProjectId} onChange={(event: { target: { value?: unknown } }) => onDefaultProjectIdChange(String(event.target.value ?? ''))} />
    </FormSection>
    <FormSection>
      <Label labelFor="default-activity-id">Default Kimai activity ID</Label>
      <Textfield id="default-activity-id" value={defaultActivityId} onChange={(event: { target: { value?: unknown } }) => onDefaultActivityIdChange(String(event.target.value ?? ''))} />
    </FormSection>
    <Button appearance="primary" onClick={onSave}>Save</Button>
    <Button onClick={onGenerateWebhookSecret}>Generate webhook secret</Button>
    {state.webhookUrl && <Text>{state.webhookUrl}</Text>}
    {error && <Text>{error}</Text>}
    {webhookSecret && <Text>{webhookSecret}</Text>}
    {saved && <Text>Saved.</Text>}
  </Stack>
);
