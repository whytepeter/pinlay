import { ref } from "vue";

/** Mobile: off-canvas drawer open. (Desktop sidebar is hover-expand, no state.) */
const mobileOpen = ref(false);

/** Shared app-shell state (singleton via module scope). */
export function useShell() {
  return {
    mobileOpen,
    toggleMobile() {
      mobileOpen.value = !mobileOpen.value;
    },
    closeMobile() {
      mobileOpen.value = false;
    },
  };
}
