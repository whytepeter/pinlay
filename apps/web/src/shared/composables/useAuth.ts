/**
 * Auth state — module-level singleton (same pattern as useTheme/useSettings;
 * the project doesn't use Pinia). Holds the JWT + current user, persists to
 * localStorage, and keeps the api client's token in sync.
 *
 * Hydrate once before mount via `hydrateAuth()` so the router guard sees a
 * stable initial state and there's no auth flicker.
 */
import { computed, ref } from "vue";
import { apiClient, setApiToken, type AuthResult, type Me } from "@/shared/lib/api";

const TOKEN_KEY = "pl_token";
const USER_KEY = "pl_user";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  orgId: string;
  role: string;
}

const token = ref<string | null>(null);
const user = ref<SessionUser | null>(null);
const ready = ref(false);

const isAuthenticated = computed(() => !!token.value);

function persist() {
  try {
    if (token.value) localStorage.setItem(TOKEN_KEY, token.value);
    else localStorage.removeItem(TOKEN_KEY);
    if (user.value) localStorage.setItem(USER_KEY, JSON.stringify(user.value));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable — keep in-memory only */
  }
}

function adoptAuthResult(res: AuthResult) {
  token.value = res.token;
  user.value = {
    id: res.user.id,
    email: res.user.email,
    name: res.user.name,
    avatarUrl: res.user.avatarUrl,
    orgId: res.workspace.id,
    role: res.workspace.role,
  };
  setApiToken(res.token);
  persist();
}

/** Read persisted auth on boot. Verifies the token against /auth/me; if it's
 *  expired/invalid the session is cleared so the guard routes to /login. */
async function hydrateAuth(): Promise<void> {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      token.value = t;
      setApiToken(t);
      const raw = localStorage.getItem(USER_KEY);
      if (raw) user.value = JSON.parse(raw) as SessionUser;
      // Revalidate in the background — don't block boot on the network.
      apiClient
        .me()
        .then((me: Me) => applyMe(me))
        .catch(() => clear());
    }
  } catch {
    /* ignore */
  } finally {
    ready.value = true;
  }
}

function clear() {
  token.value = null;
  user.value = null;
  setApiToken(null);
  persist();
}

/**
 * Replace the bearer token without re-running login (e.g. after
 * `/workspaces/:id/switch` returns a fresh JWT bound to the new workspace).
 * Optionally accepts a workspace patch so `user.orgId` / `user.role` stay in
 * sync with the new token.
 */
function setToken(
  next: string,
  workspace?: { id: string; role: string },
): void {
  token.value = next;
  setApiToken(next);
  if (workspace && user.value) {
    user.value = {
      ...user.value,
      orgId: workspace.id,
      role: workspace.role,
    };
  }
  persist();
}

/**
 * Replace the cached profile after a server confirmation (PATCH /auth/me,
 * background revalidate, …). Persists so the next mount sees the new state
 * without waiting on a network round-trip.
 */
function applyMe(me: Me): void {
  user.value = {
    id: me.id,
    email: me.email,
    name: me.name,
    avatarUrl: me.avatarUrl,
    orgId: me.orgId,
    role: me.role,
  };
  persist();
}

export function useAuth() {
  return {
    token,
    user,
    ready,
    isAuthenticated,
    async login(email: string, password: string) {
      adoptAuthResult(await apiClient.login(email, password));
    },
    async signup(input: {
      email: string;
      name: string;
      password: string;
      workspaceName?: string;
    }) {
      adoptAuthResult(await apiClient.signup(input));
    },
    setToken,
    applyMe,
    logout: clear,
  };
}

export { hydrateAuth };
