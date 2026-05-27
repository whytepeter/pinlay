import { computed, ref } from "vue";
import type { IntegrationKind } from "@pinlayer/shared";

export type IntegrationCategory =
  | "Issue Tracker"
  | "Messaging"
  | "Design"
  | "Documentation"
  | "Developer";

export interface IntegrationItem {
  id: IntegrationKind;
  name: string;
  icon: string;
  category: IntegrationCategory;
  blurb: string;
  connected: boolean;
  account?: string;
}

// Pragmatic v1 set (8). The full IntegrationKind enum has more — add later.
const initial: IntegrationItem[] = [
  {
    id: "linear",
    name: "Linear",
    icon: "git-branch",
    category: "Issue Tracker",
    blurb: "Push pins as Linear issues; sync status both ways.",
    connected: true,
    account: "acme",
  },
  {
    id: "jira",
    name: "Jira",
    icon: "square-kanban",
    category: "Issue Tracker",
    blurb: "Create Jira tickets from pins; mirror transitions.",
    connected: false,
  },
  {
    id: "github",
    name: "GitHub",
    icon: "git-merge",
    category: "Issue Tracker",
    blurb: "Open GitHub Issues from pins; link PRs.",
    connected: false,
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: "git-pull-request",
    category: "Issue Tracker",
    blurb: "Open GitLab Issues and link merge requests.",
    connected: false,
  },
  {
    id: "slack",
    name: "Slack",
    icon: "message-square",
    category: "Messaging",
    blurb: "Notify channels when a critical pin lands.",
    connected: true,
    account: "#bugs",
  },
  {
    id: "notion",
    name: "Notion",
    icon: "file-text",
    category: "Documentation",
    blurb: "Append pin write-ups to a Notion database.",
    connected: false,
  },
  {
    id: "figma",
    name: "Figma",
    icon: "pen-tool",
    category: "Design",
    blurb: "Attach Figma frames to pins for visual context.",
    connected: false,
  },
  {
    id: "webhook",
    name: "Webhook",
    icon: "webhook",
    category: "Developer",
    blurb: "Send pin events to a custom HTTPS endpoint.",
    connected: false,
  },
];

// Module-level state so the page can be navigated away from and back without resetting.
const integrations = ref<IntegrationItem[]>(initial);

export function useIntegrations() {
  function connect(id: IntegrationKind, account: string) {
    const it = integrations.value.find((x) => x.id === id);
    if (it) {
      it.connected = true;
      it.account = account.trim();
    }
  }
  function disconnect(id: IntegrationKind) {
    const it = integrations.value.find((x) => x.id === id);
    if (it) {
      it.connected = false;
      it.account = undefined;
    }
  }
  function updateAccount(id: IntegrationKind, account: string) {
    const it = integrations.value.find((x) => x.id === id);
    if (it && it.connected) it.account = account.trim();
  }

  const connectedCount = computed(
    () => integrations.value.filter((i) => i.connected).length,
  );

  return {
    integrations,
    connectedCount,
    connect,
    disconnect,
    updateAccount,
  };
}
