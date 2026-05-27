// @pinlayer/design — reusable shadcn-vue primitives + Tailwind v4.
// Import "@pinlayer/design/tokens.css" once in the host app. Components are
// styled with Tailwind utilities and read the shadcn/pinLayer CSS variables, so
// theme + accent swap at runtime. Domain components are composed from these in
// the app's feature folders.

// Icon (lucide-vue-next wrapper)
export { default as Icon } from "./components/Icon.vue";

// Utility
export { cn } from "./lib/utils";
export { lighten, darken, mix, withAlpha } from "./lib/color";

// Primitives
export * from "./components/ui/avatar";
export * from "./components/ui/badge";
export * from "./components/ui/button";
export * from "./components/ui/card";
export * from "./components/ui/checkbox";
export * from "./components/ui/dialog";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/input";
export * from "./components/ui/label";
export * from "./components/ui/popover";
export * from "./components/ui/select";
export * from "./components/ui/separator";
export * from "./components/ui/skeleton";
export * from "./components/ui/switch";
export * from "./components/ui/tabs";
export * from "./components/ui/textarea";
export * from "./components/ui/tooltip";
