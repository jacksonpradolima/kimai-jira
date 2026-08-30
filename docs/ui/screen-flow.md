# UI screen flow

## Issue context

```mermaid
flowchart TD
  issue[Jira Issue] --> context[Kimai Issue Context]
  context --> timer[Timer]
  timer --> personal[Personal API connection]
  personal --> token[Save or reset API token]
  token --> identity[Kimai /api/users/me identity]
  timer --> stopped[Stopped]
  timer --> running[Running]
  timer --> unavailable[Unavailable]
  context --> manual[Manual]
  manual --> manualForm[Manual entry form]
  manualForm --> saved[Kimai timesheet created]
```

## Administration

```mermaid
flowchart TD
  admin[Jira Administration] --> integration[Kimai Integration]
  integration --> connection[Connection Settings]
  integration --> defaults[Defaults]
  integration --> webhook[Webhook]
```

All nodes correspond to current production UI states captured in the [UI gallery](README.md).
