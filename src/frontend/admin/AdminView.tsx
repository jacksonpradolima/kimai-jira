import { Button, FormSection, Inline, Label, SectionMessage, Stack, Text, Textfield } from '@forge/react';

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
  saved: boolean;
  error?: string;
  webhookSecret?: string;
  onUrlChange: (value: string) => void;
  onSave: () => void;
  onGenerateWebhookSecret: () => void;
}

/** Shared production/admin documentation view. Personal tokens never enter this page. */
export const AdminView = ({
  state,
  url,
  saved,
  error,
  webhookSecret,
  onUrlChange,
  onSave,
  onGenerateWebhookSecret,
}: AdminViewProps) => (
  <Stack space="space.200">
    <Text>Kimai Integration</Text>
    <Text>Configure the shared Kimai endpoint. Each user connects their own personal API token from an issue.</Text>
    <FormSection>
      <Label labelFor="kimai-url">Kimai URL</Label>
      <Textfield id="kimai-url" value={url} onChange={(event: { target: { value?: unknown } }) => onUrlChange(String(event.target.value ?? ''))} />
    </FormSection>
    <Inline space="space.100"><Button appearance="primary" onClick={onSave}>Save</Button><Button onClick={onGenerateWebhookSecret}>Generate webhook secret</Button></Inline>
    {state.webhookUrl && <Text>{state.webhookUrl}</Text>}
    {error && <SectionMessage appearance="error" title="Kimai configuration error">{error}</SectionMessage>}
    {webhookSecret && <SectionMessage appearance="information" title="New webhook secret">{webhookSecret}</SectionMessage>}
    {saved && <SectionMessage appearance="success" title="Saved">Kimai configuration saved.</SectionMessage>}
  </Stack>
);
