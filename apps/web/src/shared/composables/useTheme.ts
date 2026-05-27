import { ref } from "vue";

export type ThemeMode = "light" | "dark" | "system";

const KEY = "pl-theme";
const mql =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

const stored =
  typeof localStorage !== "undefined"
    ? (localStorage.getItem(KEY) as ThemeMode | null)
    : null;

/** The user's preference (light/dark/system); system follows the OS. */
const mode = ref<ThemeMode>(stored ?? "system");

function resolve(m: ThemeMode): "light" | "dark" {
  if (m === "system") return mql?.matches ? "dark" : "light";
  return m;
}

function applyResolved() {
  document.documentElement.dataset.theme = resolve(mode.value);
}

function setMode(next: ThemeMode) {
  mode.value = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable — ignore */
  }
  applyResolved();
}

// Follow OS changes while in "system" mode.
mql?.addEventListener?.("change", () => {
  if (mode.value === "system") applyResolved();
});

const ORDER: ThemeMode[] = ["light", "dark", "system"];

/** Shared theme state + actions (singleton via module scope). */
export function useTheme() {
  return {
    mode,
    setMode,
    cycle: () => setMode(ORDER[(ORDER.indexOf(mode.value) + 1) % ORDER.length]!),
  };
}

/** Apply the persisted preference on boot (call before mount to avoid FOUC). */
export function initTheme() {
  applyResolved();
}
