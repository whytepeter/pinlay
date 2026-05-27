# Integrations Spec

Pins route to the tools teams already live in. The Integrations hub is where
connectors are added, mapped, and monitored. Keep the UI simple: a grid of cards
by category, a slide-over to configure.

## 1. Supported connectors

| Kind | Name | Category | MVP state |
|---|---|---|---|
| `linear` | Linear | Issue Tracker | `[MVP]` connect + create |
| `jira` | Jira | Issue Tracker | `[MVP]` connect + create |
| `github` | GitHub Issues | Issue Tracker | `[MVP]` connect + create |
| `gitlab` | GitLab | Issue Tracker | `[v1]` |
| `azure` | Azure DevOps | Issue Tracker | `[later]` |
| `shortcut` | Shortcut | Issue Tracker | `[later]` |
| `slack` | Slack | Messaging | `[v1]` thread per session |
| `teams` | Microsoft Teams | Messaging | `[later]` |
| `discord` | Discord | Messaging | `[later]` |
| `figma` | Figma | Design | `[v1]` cross-link frames |
| `storybook` | Storybook | Design | `[later]` |
| `notion` | Notion | Documentation | `[later]` digests |
| `confluence` | Confluence | Documentation | `[later]` |
| `webhook` | Custom webhook | Developer | `[v1]` JSON events |

## 2. Card & states

`IntegrationCard`: gradient glyph tile · name · category label · status row.
- **Not connected:** gray dot + "Connect" (accent). Click → OAuth / token flow.
- **Connected:** green dot + account label (e.g. `northwind / Design`) + "Configure".
- Hover: subtle lift. Cards group under category headers.

## 3. Connection flow

1. "Connect" → `POST /integrations/:kind/connect` starts OAuth (or shows a token/
   webhook form for `webhook`).
2. Provider callback → `GET /integrations/:kind/callback` stores tokens server-side,
   sets `connected=true`, captures the account label.
3. Card flips to connected; "Configure" opens the config panel.

## 4. Configure panel (`IntegrationConfigPanel`, right slide-over) `[v1]`

- **Target:** project / repo / channel / space (provider-specific picker).
- **Field mapping:**
  - severity → priority (e.g. critical→Urgent, high→High, medium→Medium, low→Low).
  - issue type → label/tag (visual_bug→`visual`, a11y→`accessibility`, …).
  - assignee → provider user (optional).
- **Sync direction:** one-way (pinLayer → tool) `[MVP]` or two-way (mirror status &
  comments back) `[v1+]`.
- **Attach:** include screenshot + anchor selector + page URL in the created issue.
- **Last sync** info + count; **Test** button; **Disconnect** (red, bottom).

## 5. Sync behaviour

- On pin submit (and on relevant `PATCH`), enqueue `integration_sync`.
- The worker creates/updates the external item, writes a `sync_record`
  (`externalKey`, `state`), and emits an `activity_event` of kind `sync`
  (e.g. _"created PL-0142-1 in Linear · NW-WEB · Urgent"_).
- The dashboard `SyncChip` reflects `state`: green ok · amber pending · red failed,
  with the synced count. Failed syncs are retryable from the pin and the bulk bar.
- Two-way `[v1+]`: provider webhooks update pin status; conflicts resolve
  last-write-wins with an activity note.

## 6. Custom webhook `[v1]`

A developer connector: configure a URL + secret; pinLayer POSTs every event
(`pin.created`, `pin.updated`, `session.submitted`, `pin.resolved`) as signed JSON.
Shown as a card with a `{}` glyph and a payload preview.

## 7. Suggestions `[suggestion]`

- **Routing rules:** auto-pick an integration/project by URL pattern or pinboard
  (e.g. `/checkout/*` → Linear `NW-WEB`).
- **Digest:** scheduled Slack/Notion summary of a session ("14 pins, 2 critical")
  without merging issues.
- **Dedup link-out:** when AI flags a duplicate, link the existing external item
  instead of creating a new one.
- **Health surface:** an integrations status tile on the Overview page showing
  recent sync failures.

## 8. Acceptance criteria

- Connecting Linear/Jira/GitHub stores credentials server-side and flips the card.
- A submitted pin appears in the mapped project with severity→priority applied and
  the anchor selector + screenshot attached.
- `SyncChip` on the session card matches the real sync state.
- Disconnect revokes tokens and stops future syncs without deleting past records.
