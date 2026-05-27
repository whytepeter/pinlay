# Design System Spec

The design system is built from scratch into `@pinlay/design`. The Claude Design
bundle is the visual reference; this spec is the durable contract. **Light mode is
the default.** Aesthetic target: Linear × Vercel × Raycast — precise, calm,
information-dense, never busy.

## 1. Theming model

- A single `data-theme` attribute on `<html>` toggles `light` (default) / `dark`.
- All colors are CSS variables. Components never hard-code hex; they read tokens.
- Accent is swappable at runtime (amber default for pinlay) by overriding four
  `--accent*` variables. Status "in progress" tracks the accent.
- Density is a variable (`--density-pad`: compact / comfortable / roomy) `[v1]`.

```html
<html data-theme="light">   <!-- default -->
```

## 2. Color tokens

### Light (default)

```css
:root, [data-theme="light"] {
  /* Surfaces */
  --bg-0: #FAFAF9;   /* page */
  --bg-1: #FFFFFF;   /* cards */
  --bg-2: #F4F4F2;   /* hover / chips */
  --bg-3: #ECECE8;   /* elevated */
  --bg-elev: #FFFFFF;

  /* Borders */
  --border: #E6E6E0;
  --border-strong: #D5D5CC;
  --border-soft: #EFEFEA;

  /* Text */
  --text-0: #0E0E0F;  /* primary */
  --text-1: #2E2E32;  /* body */
  --text-2: #6E6E76;  /* secondary */
  --text-3: #9A9AA0;  /* muted */
  --text-4: #BEBEC2;  /* faint */

  --shadow-pop: 0 24px 48px -12px rgba(15,15,20,0.20),
                0 2px 6px rgba(15,15,20,0.06);
}
```

### Dark

```css
[data-theme="dark"] {
  --bg-0: #0A0A0B;  --bg-1: #111113;  --bg-2: #16161A;  --bg-3: #1C1C21;
  --bg-elev: #1A1A1F;
  --border: #1E1E24;  --border-strong: #2A2A32;  --border-soft: #18181D;
  --text-0: #F2F2F4;  --text-1: #C4C4CC;  --text-2: #8A8A94;
  --text-3: #5A5A64;  --text-4: #3D3D44;
  --shadow-pop: 0 20px 40px -10px rgba(0,0,0,0.5);
}
```

### Accent (default = amber for pinlay)

```css
:root {
  --accent: #F59E0B;
  --accent-hover: #D97706;
  --accent-soft: rgba(245,158,11,0.12);
  --accent-glow: rgba(245,158,11,0.22);
  --accent-fg: #FFFFFF;
}
```

Swappable palettes (Tweaks): `amber` (default), `violet #8B5CF6`,
`emerald #10B981`, `pink #EC4899`. Each sets base/hover/soft/glow.

### Semantic

```css
:root {
  --sev-critical: #EF4444;
  --sev-high:     #F97316;
  --sev-medium:   #FBBF24;
  --sev-low:      #60A5FA;

  --status-open:     #6E6E76;   /* var(--text-2) in light */
  --status-progress: var(--accent);
  --status-resolved: #10B981;
  --status-stale:    #F97316;
}
```

## 3. Typography

- **Sans:** `Geist` → `ui-sans-serif, system-ui, -apple-system, sans-serif`.
- **Mono:** `Geist Mono` → `ui-monospace, 'SF Mono', Menlo, monospace`. Use mono
  for IDs (`PL-0142`), counts, timestamps, selectors, pin indices.
- Base `14px`. Feature settings `'cv11','ss01','ss03'`; mono adds `'zero','ss02'`.
- Headings use tight tracking (`-0.02em`), weight 600.
- Antialiased; `text-rendering: optimizeLegibility`.

Type scale in use: 32 (KPI), 20 (page title), 19 (pin title), 15 (brand/modal),
14.5 (card title), 13–13.5 (body), 11.5–12.5 (meta), 10–11 (labels/uppercase).

## 4. Radii, spacing, shadows

- Radii: `--r-sm 4px`, `--r-md 6px`, `--r-lg 10px`, `--r-xl 14px`.
- Sidebar width: `--sidebar-w` (`224px` full, `64px` collapsed, `0` mobile).
- Page gutters: `32px` horizontal on desktop content.
- Shadows: only `--shadow-pop` for popovers/modals/bulk-bar. Cards use borders,
  not shadows. Hover lifts a card by `translateY(-1px)` with a border-color shift.

## 5. Component catalog

Built into `@pinlay/design`. (React names from the bundle → Vue components.)

| Component | Purpose / notes |
|---|---|
| `Avatar` / `AvatarStack` | Mono initials, per-person hue gradient. Stack overlaps with `+N`. |
| `SeverityDot` | Colored dot, optional soft ring. Sizes 5–8px. |
| `SeverityChip` | Dot + label pill. |
| `SeverityHeatbar` | Proportional critical/high/medium/low bar + mono counts. The signature card element. |
| `StatusChip` | open / in-progress / resolved. Dot-only variant for dense rows. |
| `TypeChip` | Issue type, mono lowercase (`visual`, `layout`, `copy`, `broken`, `a11y`, `perf`). |
| `PinPill` | Mono `#01` accent pill. Pin index everywhere. |
| `SyncChip` | `↻ → Linear · 14` with ok/pending/failed color. |
| `Favicon` | Rounded gradient square with 1–2 char label + hue. |
| `Segmented` | Toolbar segmented control with optional counts (status tabs, ranges). |
| `FilterDropdown` | `Label: value ▾` trigger button. |
| `SearchInput` | Icon + input + optional `kbd`. |
| `PageHeader` | Title + badge + subtitle + right slot. Used on every top-level page. |
| `Button` | Variants: default, `primary` (accent, soft glow), `ghost`; sizes `sm`, `icon`. `active:scale(0.98)`. |
| `Input` / `Textarea` | 30px height; focus → accent border. |
| `Kbd` | Mono key cap, 2px bottom border. |
| `Card` | `--bg-1` + `--border` + `--r-lg`. |
| `Tooltip` | `[data-tip]` hover pill (works in shadow DOM too). |
| `Modal` | Centered, backdrop blur, `--shadow-pop`. |
| `Chip` | Generic pill base. |

## 6. Iconography

In-house set, lucide-style: `<svg viewBox="0 0 24 24" stroke="currentColor"
stroke-width="1.5" fill="none">`. Provided via a single `Icon` map / wrapper —
**no direct per-file SVG imports**. The brand mark `Icon.Brand` is the precision
pin (gradient teardrop + target dot). Key glyphs: Home, Board, Plug, Settings,
Search, Plus, Filter, Grid, List, CursorPin, Globe, Sync, Warning, Check, Activity,
Send, Sun, Moon, ArrowLeft/Right, Chevron(Down).

## 7. Motion

- Transitions: `120ms` micro (bg/border/color), `140ms` card hover, `220ms`
  sidebar/drawer. Easing `ease` for micro, `cubic-bezier(.4,.2,.2,1)` for drawer.
- Pin marker pulse: `pulse-glow 1.6s` accent halo (overlay/detail screenshots).
- No entry fade-up keyframes that start at `opacity:0` (iframes throttle them and
  leave content stuck) — keep content visible by default.
- Respect `prefers-reduced-motion`.

## 8. Accessibility

- Focus-visible: `2px solid var(--accent)`, `2px` offset, on every interactive.
- Color is never the only signal: severity/status always pair a dot/icon with a
  label or `data-tip`. Error states need icon + text + `role="alert"`.
- Hit targets ≥ 24px; primary actions ≥ 30px.
- All icon-only buttons carry `data-tip` / `aria-label`.
- Contrast: meet WCAG AA against the chosen surface in both themes.

## 9. Tailwind v4 wiring

- Import once: `@import "tailwindcss";` in the app's root CSS.
- Map tokens into Tailwind via `@theme` so utilities like `bg-bg-1`,
  `text-text-2`, `border-border`, `text-accent` resolve to the CSS variables.
- Keep the CSS-variable file (`tokens.css`) framework-agnostic so the extension's
  shadow-DOM styles can `@import` the same source. Extension uses
  `prefers-color-scheme` for dark/light (class strategy can't cross the shadow
  boundary — a known DeveProbe gotcha).
- `@pinlay/design` exports: `tokens.css`, the `Icon` set, and the component
  library; both apps depend on it.

## 10. Responsive

- `≤1100px` hide `.hide-narrow`; `≤640px` hide `.hide-mobile`.
- Grids: 4-col → 2 → 1; issue detail two-column → stacked with a "Pins" toggle at
  `≤900px`.
- Sidebar becomes an off-canvas drawer with backdrop under `768px`.
