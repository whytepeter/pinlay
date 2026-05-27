# pinLayer — Specifications

> pinLayer is a browser-first annotation product. Teams drop visual pins on live
> web pages — anchored to real DOM elements — and those pins become trackable,
> route-able issues. "Figma comments for your live product."

This folder is the source of truth for **what** pinLayer is and **how** it is built.
Read it before writing code. Specs describe the system; they are deliberately
implementation-light where the design bundle already settles the visual answer.

## Reading order

1. **[GENERAL_SPEC.md](./GENERAL_SPEC.md)** — vision, personas, monorepo
   architecture (backend · extension · app), tech stack, MVP scope, glossary.
2. **[DESIGN_SYSTEM_SPEC.md](./DESIGN_SYSTEM_SPEC.md)** — tokens (light-first),
   typography, the component catalog, motion, accessibility.
3. **[WEB_APP_SPEC.md](./WEB_APP_SPEC.md)** — the dashboard: feature structure,
   routing, every page and its components/states.
4. **[EXTENSION_SPEC.md](./EXTENSION_SPEC.md)** — the capture surface: pin
   placement, anchoring, composer, privacy.
5. **[BACKEND_SPEC.md](./BACKEND_SPEC.md)** — API, data model, enums, async jobs.
6. **[INTEGRATIONS_SPEC.md](./INTEGRATIONS_SPEC.md)** — connectors, field mapping,
   sync behaviour.

## Guiding principles

- **Simple UI, always.** Dense information, calm surface. Every pixel earns its
  place. If a screen feels busy, cut — don't add.
- **Light mode first.** Dark mode is supported and theme-swappable, but light is
  the default and the design target.
- **One design system, from scratch.** Tokens live in CSS variables. See the
  design system spec; the Claude Design bundle is the visual reference.
- **Monolithic repo.** `backend` · `extension` · `app` in one workspace, sharing
  types and a design package. The web app follows DeveProbe's feature structure.

## Status legend

Throughout the specs, scope is tagged:

- `[MVP]` — required for first usable release.
- `[v1]` — fast-follow after MVP.
- `[later]` — planned, explicitly out of MVP scope.
- `[suggestion]` — proposed addition, not yet committed.
