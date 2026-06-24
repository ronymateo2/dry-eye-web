# Today Widget Editor v2 — In-Place Edit + Server Persistence

- **Date:** 2026-06-24
- **Status:** Approved
- **Repos touched:** `dry-eye-web` (client), `dry_eye_api` (server)

## Problem

The Today screen lets users reorder and hide five "widgets" (symptoms,
schedule, on-demand drops, drop-streak, medications). The current editor has
three structural weaknesses:

1. **Layout is device-local.** Config lives only in `localStorage`
   (`today-widget-config`). Theme already persists server-side; widget layout
   does not. Reinstalls and second devices lose the arrangement.
2. **Editing is not WYSIWYG.** Edit mode swaps the real widgets for a list of
   text label rows. The user reorders abstract labels and must map each label
   back to the real card in their head.
3. **"Personalizar" overstates its scope.** Only the five registry widgets are
   customizable. Pain check-in, sleep, and "Gestionar tratamientos" are
   hardcoded below and unaffected, with no visual signal that they are fixed.

## Goals

- **G1 — Server persistence.** Widget config follows the user across devices,
  mirroring how theme persists.
- **G2 — In-place (WYSIWYG) editing.** Reorder and hide the real cards, not
  label rows.
- **G3 — Honest scope + discoverability.** Visually separate customizable
  modules from the fixed block; add a long-press entry point to edit mode.

## Non-goals

- A separate "hidden" tray (rejected in favor of inline-dimmed; revisit if the
  module count grows well past ~5).
- Making pain check-in / treatments customizable (pain check-in is the primary
  action; it must not be hideable).
- Offline write queue for widget config (drops remain the only queued entity;
  widget writes are best-effort and reconciled on next load).

## Decisions

| Fork | Decision |
| --- | --- |
| Fixed block (#5) | Keep fixed, separate visually under a labeled section. |
| Hidden modules (#2) | Inline, dimmed, toggle to restore. No tray. |
| Edit entry (#5) | Keep "Personalizar" button **and** add long-press on any module card. |
| Drag engine (#2) | dnd-kit on the real cards (reuse existing DndContext + sensors; keyboard a11y retained). |

## Architecture

### Server (`dry_eye_api`)

Mirror the existing `widget_drop_type_ids` JSON-text pattern.

- **Migration** (`migrations/`): add column to `dy_users`:
  `today_widget_config text not null default '[]'`. Additive, backward
  compatible, no data migration.
- **`db/schema.ts`**: add `today_widget_config: text("today_widget_config").notNull().default("[]")`.
- **`services/user.service.ts`**:
  - `getUserMe` selects `today_widget_config` and returns it parsed via a JSON
    array parse (reuse the shape of `parseWidgetDropTypeIds`, generalized or a
    sibling helper that parses `[{id,visible}]` entries defensively).
  - `UserUpdateInput` gains `todayWidgetConfig?: { id: string; visible: boolean }[]`.
  - `updateUserMe` serializes it: `set.today_widget_config = JSON.stringify(body.todayWidgetConfig)`.

Stored shape equals the client config: `[{ "id": "symptoms", "visible": true }, ...]`.

### Client (`dry-eye-web`)

- **Types** (`features/user/types.ts`, `types/domain.ts` `User`): add
  `today_widget_config: TodayWidgetConfig` to the user shape and
  `todayWidgetConfig?: TodayWidgetConfig` to the update input.
- **`use-widget-config.ts`** rewritten to mirror `lib/theme.tsx`:
  - Local state seeded from `localStorage` for instant first paint.
  - When `auth.status === "authenticated"`, overwrite local with
    `auth.user.today_widget_config`, then apply `reconcileWidgetConfig`
    (forward-compat for newly added widgets).
  - On `reorder` / `toggleVisible` / `reset`: optimistic local update +
    `localStorage` write + `userApi.updateMe({ todayWidgetConfig })`. On
    failure: roll back to previous, keep last-good in `localStorage`, show a
    sonner toast (`"No se pudo guardar el orden."`).
  - Offline: `localStorage` write succeeds; server write fails silently and is
    reconciled on the next authenticated load.

#### Components

- **`SortableWidgetCard`** (new): wraps `widgetDef(id).render()`.
  - Subtle jiggle in edit mode (alternating ±0.6°), disabled under
    `prefers-reduced-motion` (static).
  - Whole card is the drag affordance (dnd-kit listeners on the card).
  - Drag lift: `scale(1.02)` + elevated shadow (applied via inline transform so
    it composes with dnd-kit's transform).
  - Corner hide badge: `EyeSlash` (hide) / `Eye` (show). Hidden card stays
    inline at `opacity-50`.
  - Inner content: `pointer-events-none select-none` + `aria-hidden` so widget
    controls don't fire and don't take focus while editing.
- **`TodayWidgetEditor`** rebuilt: `DndContext` + `SortableContext` over the
  real cards (visible + hidden inline). Keep the instruction hint and reset
  button. The old label-row component **`sortable-widget-row.tsx` is removed**
  (its model is replaced).
- **`TodayWidgetList`** (display): wrap each card with a long-press handler
  (~450ms `pointerdown` timer, cancelled on move/up) that enters edit mode.
- **`TodayPage`**: render two labeled sections — **"Tus módulos"**
  (editor/list) and **"Siempre visible"** (the existing fixed block:
  `PainCheckInCompact`, `SleepStatus`, "Gestionar tratamientos"). The fixed
  block is never part of the dnd context. Keep the "Personalizar" toggle
  (already has icon + press feedback).

## Data flow

```
TodayPage
  └─ useWidgetConfig()           // server (auth.user) + localStorage cache
       ├─ editMode ? TodayWidgetEditor  // DndContext over real cards
       │            : TodayWidgetList   // real cards + long-press → editMode
       └─ "Siempre visible" block       // fixed, outside dnd
```

## Error handling & offline

- `updateMe` failure → optimistic rollback + sonner toast; `localStorage`
  retains last-good config.
- Offline → `localStorage` write only; server reconciled on next load.
- `reconcileWidgetConfig` runs on every read: unknown ids dropped, new registry
  widgets appended visible, dedupe preserved.

## Migration safety

Additive column with default `'[]'`. Existing users read `[]` → `reconcile`
fills all registry widgets visible in default order. No backfill required.

## Testing

- **API:** `user.service` round-trip unit test — `updateUserMe` serializes
  `todayWidgetConfig`; `getUserMe` parses it back to `[{id,visible}]`; malformed
  JSON parses to `[]`.
- **Web:** `reconcileWidgetConfig` stays pure and unit-tested (existing).
  Manual device QA: drag reorder, jiggle, hide/show badge, long-press entry,
  cross-device persistence, offline write + reconcile.

## Out of scope / future

- "Ocultos" tray once module count grows past comfortable inline editing.
- Folding sleep (or others) into the customizable registry.
- Per-widget reset.
