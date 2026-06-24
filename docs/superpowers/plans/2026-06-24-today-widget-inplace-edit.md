# Today Widget Editor v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the Today widget layout per-user on the server, make editing WYSIWYG (reorder/hide the real cards in place), and separate customizable modules from the fixed block with a long-press entry point.

**Architecture:** Server mirrors the existing `widget_drop_type_ids` JSON-text column on `dy_users` with a new `today_widget_config` column. The client `useWidgetConfig` hook mirrors `lib/theme.tsx`: localStorage for instant paint, server as source of truth, optimistic writes with rollback. Edit mode runs dnd-kit over the real rendered widget cards instead of a label list.

**Tech Stack:** Hono + Cloudflare D1 + Drizzle (api) · React 19 + TanStack Query + dnd-kit + sonner + Vitest (web)

**Two repos:**
- `dry_eye_api` at `/Users/ronymateo/Code/aws/weqe_cf/dry_eye_api` (branch `main` — create `feat/today-widget-config`)
- `dry-eye-web` at `/Users/ronymateo/Code/aws/weqe_cf/dry-eye-web` (branch `feat/today-widget-inplace-edit` — already created)

---

## Phase A — Server persistence (`dry_eye_api`)

### Task 1: Migration + schema column

**Files:**
- Create: `migrations/0036_today_widget_config.sql`
- Modify: `src/db/schema.ts` (the `dyUsers` table, after `widget_drop_type_ids`)

- [ ] **Step 1: Create the branch**

```bash
cd /Users/ronymateo/Code/aws/weqe_cf/dry_eye_api
git checkout -b feat/today-widget-config
```

- [ ] **Step 2: Write the migration**

Create `migrations/0036_today_widget_config.sql`:

```sql
ALTER TABLE dy_users ADD COLUMN today_widget_config TEXT NOT NULL DEFAULT '[]';
```

- [ ] **Step 3: Add the schema column**

In `src/db/schema.ts`, inside `dyUsers`, add directly after the `widget_drop_type_ids` line:

```ts
  today_widget_config: text("today_widget_config").notNull().default("[]"),
```

- [ ] **Step 4: Apply migration locally**

Run: `npm run db:migrate:local`
Expected: applies `0036_today_widget_config.sql`, no error.

- [ ] **Step 5: Commit**

```bash
git add migrations/0036_today_widget_config.sql src/db/schema.ts
git commit -m "feat(db): add today_widget_config column to dy_users"
```

---

### Task 2: Parse helper + service wiring (TDD)

**Files:**
- Modify: `src/services/user.service.ts`
- Test: `src/services/user.service.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/services/user.service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseTodayWidgetConfig } from "./user.service";

describe("parseTodayWidgetConfig", () => {
  it("parses a valid config array", () => {
    const raw = JSON.stringify([
      { id: "symptoms", visible: true },
      { id: "schedule", visible: false },
    ]);
    expect(parseTodayWidgetConfig(raw)).toEqual([
      { id: "symptoms", visible: true },
      { id: "schedule", visible: false },
    ]);
  });

  it("returns [] for malformed JSON", () => {
    expect(parseTodayWidgetConfig("{not json")).toEqual([]);
  });

  it("returns [] for null/undefined", () => {
    expect(parseTodayWidgetConfig(null)).toEqual([]);
    expect(parseTodayWidgetConfig(undefined)).toEqual([]);
  });

  it("drops entries with wrong shape", () => {
    const raw = JSON.stringify([
      { id: "symptoms", visible: true },
      { id: 42, visible: true },
      { visible: true },
      { id: "schedule", visible: "yes" },
      "garbage",
    ]);
    expect(parseTodayWidgetConfig(raw)).toEqual([{ id: "symptoms", visible: true }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/user.service.test.ts`
Expected: FAIL — `parseTodayWidgetConfig` is not exported.

- [ ] **Step 3: Add the helper and wire the service**

In `src/services/user.service.ts`:

Add the type to `UserUpdateInput`:

```ts
export type UserUpdateInput = {
  timezone?: string;
  name?: string;
  theme?: string;
  font?: string;
  widgetDropTypeIds?: string[];
  todayWidgetConfig?: { id: string; visible: boolean }[];
};
```

Add the exported helper next to `parseWidgetDropTypeIds`:

```ts
export function parseTodayWidgetConfig(
  raw: string | null | undefined,
): { id: string; visible: boolean }[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is { id: string; visible: boolean } =>
        !!x &&
        typeof x === "object" &&
        typeof x.id === "string" &&
        typeof x.visible === "boolean",
    );
  } catch {
    return [];
  }
}
```

In `getUserMe`, add to the `.select({...})` object (after `widget_drop_type_ids`):

```ts
      today_widget_config: dyUsers.today_widget_config,
```

And change the return to also parse the new field:

```ts
  if (!row) return row;
  return {
    ...row,
    widget_drop_type_ids: parseWidgetDropTypeIds(row.widget_drop_type_ids),
    today_widget_config: parseTodayWidgetConfig(row.today_widget_config),
  };
```

In `updateUserMe`, add after the `widgetDropTypeIds` branch:

```ts
  if (body.todayWidgetConfig !== undefined)
    set.today_widget_config = JSON.stringify(body.todayWidgetConfig);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/user.service.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck/build**

Run: `npm run build`
Expected: dry-run wrangler deploy succeeds, no TS errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/user.service.ts src/services/user.service.test.ts
git commit -m "feat(user): persist today_widget_config via /user/me"
```

> After this task the API branch is ready. Deploy is out of scope for this plan (the user deploys). The web work below targets local API via `npm run dev` in the api repo.

---

## Phase B — Client data layer (`dry-eye-web`)

### Task 3: Extract pure widget-config module (TDD)

Decouples the pure config logic (types, defaults, reconcile) from the JSX registry so it is unit-testable without importing widget components.

**Files:**
- Create: `src/components/today/widget-config.ts`
- Create: `src/components/today/widget-config.test.ts`
- Modify: `src/components/today/widget-registry.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/today/widget-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIDGET_CONFIG,
  reconcileWidgetConfig,
  WIDGET_IDS,
} from "./widget-config";

describe("reconcileWidgetConfig", () => {
  it("returns all known widgets visible when stored is empty", () => {
    expect(reconcileWidgetConfig([])).toEqual(DEFAULT_WIDGET_CONFIG);
  });

  it("drops unknown ids and appends missing known widgets", () => {
    const result = reconcileWidgetConfig([
      { id: "ghost", visible: true },
      { id: "medications", visible: false },
    ]);
    expect(result[0]).toEqual({ id: "medications", visible: false });
    expect(result.map((e) => e.id).sort()).toEqual([...WIDGET_IDS].sort());
    expect(result.every((e) => WIDGET_IDS.includes(e.id))).toBe(true);
  });

  it("dedupes repeated ids, keeping the first", () => {
    const result = reconcileWidgetConfig([
      { id: "symptoms", visible: false },
      { id: "symptoms", visible: true },
    ]);
    expect(result.filter((e) => e.id === "symptoms")).toHaveLength(1);
    expect(result.find((e) => e.id === "symptoms")?.visible).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/today/widget-config.test.ts`
Expected: FAIL — cannot resolve `./widget-config`.

- [ ] **Step 3: Create the pure module**

Create `src/components/today/widget-config.ts`:

```ts
import type { TodayWidgetConfigEntry } from "@/types/domain";

export type TodayWidgetId =
  | "symptoms"
  | "schedule"
  | "on-demand-drops"
  | "drop-streak"
  | "medications";

export type TodayWidgetEntry = { id: TodayWidgetId; visible: boolean };
export type TodayWidgetConfig = TodayWidgetEntry[];

export const WIDGET_IDS: TodayWidgetId[] = [
  "symptoms",
  "schedule",
  "on-demand-drops",
  "drop-streak",
  "medications",
];

export const DEFAULT_WIDGET_CONFIG: TodayWidgetConfig = WIDGET_IDS.map((id) => ({
  id,
  visible: true,
}));

const KNOWN = new Set<string>(WIDGET_IDS);

function isKnown(id: string): id is TodayWidgetId {
  return KNOWN.has(id);
}

export function reconcileWidgetConfig(
  stored: TodayWidgetConfigEntry[],
): TodayWidgetConfig {
  const seen = new Set<TodayWidgetId>();
  const result: TodayWidgetConfig = [];
  for (const entry of stored) {
    if (isKnown(entry.id) && !seen.has(entry.id)) {
      result.push({ id: entry.id, visible: entry.visible });
      seen.add(entry.id);
    }
  }
  for (const id of WIDGET_IDS) {
    if (!seen.has(id)) result.push({ id, visible: true });
  }
  return result;
}
```

- [ ] **Step 4: Add the boundary type to domain**

In `src/types/domain.ts`, add near the `User` type:

```ts
export type TodayWidgetConfigEntry = { id: string; visible: boolean };
```

- [ ] **Step 5: Point the registry at the pure module**

In `src/components/today/widget-registry.tsx`:
- Remove the local `TodayWidgetId`, `TodayWidgetEntry`, `TodayWidgetConfig` type declarations, the `DEFAULT_WIDGET_CONFIG` const, and the `reconcileWidgetConfig` function.
- Add re-export at the top:

```ts
export {
  type TodayWidgetId,
  type TodayWidgetEntry,
  type TodayWidgetConfig,
  DEFAULT_WIDGET_CONFIG,
  reconcileWidgetConfig,
  WIDGET_IDS,
} from "./widget-config";
import type { TodayWidgetId } from "./widget-config";
```

- Keep `TodayWidgetDef`, `TODAY_WIDGET_REGISTRY`, and `widgetDef`. Ensure `widgetDef`'s parameter still types as `TodayWidgetId`.

- [ ] **Step 6: Run test + typecheck**

Run: `npx vitest run src/components/today/widget-config.test.ts`
Expected: PASS (3 tests).
Run: `npm run check`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/today/widget-config.ts src/components/today/widget-config.test.ts src/components/today/widget-registry.tsx src/types/domain.ts
git commit -m "refactor(today): extract pure widget-config module + tests"
```

---

### Task 4: Add `today_widget_config` to user types

**Files:**
- Modify: `src/features/user/types.ts`
- Modify: `src/types/domain.ts` (the `User` type)

- [ ] **Step 1: Update the feature types**

In `src/features/user/types.ts`:

Add to `Me` (after `widget_drop_type_ids`):

```ts
  today_widget_config: TodayWidgetConfigEntry[];
```

Add to `UpdateMeBody`:

```ts
  todayWidgetConfig?: TodayWidgetConfigEntry[];
```

Add the import at the top:

```ts
import type { TodayWidgetConfigEntry } from "@/types/domain";
```

- [ ] **Step 2: Update the domain `User` type**

In `src/types/domain.ts`, add to `User` (after `widget_drop_type_ids`):

```ts
  today_widget_config: TodayWidgetConfigEntry[];
```

- [ ] **Step 3: Typecheck**

Run: `npm run check`
Expected: build succeeds (no consumers break — new field is additive; `getMe` returns it from the updated API).

- [ ] **Step 4: Commit**

```bash
git add src/features/user/types.ts src/types/domain.ts
git commit -m "feat(user): add today_widget_config to user types"
```

---

### Task 5: Rewrite `useWidgetConfig` (server + local mirror)

**Files:**
- Modify: `src/components/today/use-widget-config.ts`

- [ ] **Step 1: Replace the hook**

Replace the entire contents of `src/components/today/use-widget-config.ts` with:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { userApi } from "@/features/user";
import {
  DEFAULT_WIDGET_CONFIG,
  reconcileWidgetConfig,
  type TodayWidgetConfig,
  type TodayWidgetId,
} from "./widget-config";

const STORAGE_KEY = "today-widget-config";

function readLocal(): TodayWidgetConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return reconcileWidgetConfig(stored ? JSON.parse(stored) : []);
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
}

function writeLocal(config: TodayWidgetConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useWidgetConfig() {
  const { auth, refreshUser } = useAuth();
  const [config, setConfig] = useState<TodayWidgetConfig>(() => readLocal());
  const hydrated = useRef(false);

  useEffect(() => {
    if (auth.status === "authenticated" && !hydrated.current) {
      hydrated.current = true;
      const merged = reconcileWidgetConfig(auth.user.today_widget_config ?? []);
      setConfig(merged);
      writeLocal(merged);
    }
  }, [auth]);

  const persist = useCallback(
    async (next: TodayWidgetConfig, previous: TodayWidgetConfig) => {
      setConfig(next);
      writeLocal(next);
      try {
        await userApi.updateMe({ todayWidgetConfig: next });
        await refreshUser();
      } catch {
        setConfig(previous);
        writeLocal(previous);
        toast.error("No se pudo guardar el orden.");
      }
    },
    [refreshUser],
  );

  const reorder = useCallback(
    (activeId: TodayWidgetId, overId: TodayWidgetId) => {
      if (activeId === overId) return;
      const from = config.findIndex((e) => e.id === activeId);
      const to = config.findIndex((e) => e.id === overId);
      if (from === -1 || to === -1) return;
      const next = [...config];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      void persist(next, config);
    },
    [config, persist],
  );

  const toggleVisible = useCallback(
    (id: TodayWidgetId) => {
      const next = config.map((e) =>
        e.id === id ? { ...e, visible: !e.visible } : e,
      );
      void persist(next, config);
    },
    [config, persist],
  );

  const reset = useCallback(() => {
    void persist(DEFAULT_WIDGET_CONFIG, config);
  }, [config, persist]);

  return { config, reorder, toggleVisible, reset };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run check`
Expected: build succeeds.

- [ ] **Step 3: Manual smoke (optional but recommended)**

Start the API (`cd ../dry_eye_api && npm run dev`) and web (`npm run dev`), open `/today`, toggle a widget, reload — state should persist via the server. Re-toggle to restore.

- [ ] **Step 4: Commit**

```bash
git add src/components/today/use-widget-config.ts
git commit -m "feat(today): persist widget config to server with optimistic rollback"
```

---

## Phase C — In-place edit UI (`dry-eye-web`)

### Task 6: `SortableWidgetCard` + jiggle CSS

**Files:**
- Create: `src/components/today/sortable-widget-card.tsx`
- Modify: `src/globals.css` (append jiggle keyframe near the other keyframes, around line 831)

- [ ] **Step 1: Add the jiggle animation to globals.css**

Append after the `.anim-pop-in` block (~line 831):

```css
@keyframes widget-jiggle {
  0%   { transform: rotate(-0.6deg); }
  50%  { transform: rotate(0.6deg); }
  100% { transform: rotate(-0.6deg); }
}
.widget-jiggle {
  animation: widget-jiggle 0.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .widget-jiggle { animation: none; }
}
```

- [ ] **Step 2: Create the card component**

Create `src/components/today/sortable-widget-card.tsx`:

```tsx
import { type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { TodayWidgetId } from "./widget-config";

type Props = {
  id: TodayWidgetId;
  label: string;
  visible: boolean;
  onToggle: (id: TodayWidgetId) => void;
  children: ReactNode;
};

export function SortableWidgetCard({ id, label, visible, onToggle, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const base = CSS.Transform.toString(transform);
  const style: CSSProperties = {
    transform: isDragging ? `${base ?? ""} scale(1.02)` : base,
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative touch-none rounded-[16px]",
        !isDragging && "widget-jiggle",
        isDragging && "shadow-[0_8px_28px_rgba(0,0,0,0.42)]",
        !visible && "opacity-50",
      )}
      {...attributes}
      {...listeners}
      aria-label={`Reordenar ${label}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onToggle(id)}
        className={cn(
          "absolute -top-2 -left-2 z-20 flex h-7 w-7 items-center justify-center rounded-full",
          "border border-[var(--border)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
          "transition-transform duration-[160ms] ease-out active:scale-[0.9]",
          visible
            ? "bg-[var(--accent)] text-[var(--bg)]"
            : "bg-[var(--surface-el)] text-[var(--text-muted)]",
        )}
      >
        {visible ? <EyeSlashIcon size={14} weight="bold" /> : <EyeIcon size={14} weight="bold" />}
      </button>

      <div className="pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run check`
Expected: build succeeds (component not yet mounted — verifies it compiles).

- [ ] **Step 4: Commit**

```bash
git add src/components/today/sortable-widget-card.tsx src/globals.css
git commit -m "feat(today): add SortableWidgetCard + jiggle animation"
```

---

### Task 7: Rebuild `TodayWidgetEditor` over real cards; remove label row

**Files:**
- Modify: `src/components/today/today-widget-editor.tsx`
- Delete: `src/components/today/sortable-widget-row.tsx`

- [ ] **Step 1: Rebuild the editor**

Replace the entire contents of `src/components/today/today-widget-editor.tsx` with:

```tsx
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { SortableWidgetCard } from "./sortable-widget-card";
import {
  widgetDef,
  type TodayWidgetConfig,
  type TodayWidgetId,
} from "./widget-registry";

type Props = {
  config: TodayWidgetConfig;
  onReorder: (activeId: TodayWidgetId, overId: TodayWidgetId) => void;
  onToggle: (id: TodayWidgetId) => void;
  onReset: () => void;
};

export function TodayWidgetEditor({ config, onReorder, onToggle, onReset }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as TodayWidgetId, over.id as TodayWidgetId);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-[var(--text-muted)]">
        Arrastra las tarjetas para reordenar. Toca el ojo para mostrar u ocultar.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={config.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-5">
            {config.map((entry) => {
              const def = widgetDef(entry.id);
              return (
                <SortableWidgetCard
                  key={entry.id}
                  id={entry.id}
                  label={def.label}
                  visible={entry.visible}
                  onToggle={onToggle}
                >
                  {def.render()}
                </SortableWidgetCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] transition-[color,transform] duration-[160ms] ease-out hover:text-[var(--accent)] active:scale-[0.96]"
        aria-label="Restaurar orden predeterminado"
      >
        <ArrowCounterClockwiseIcon size={14} />
        Restaurar orden
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Delete the obsolete label row**

```bash
git rm src/components/today/sortable-widget-row.tsx
```

- [ ] **Step 3: Typecheck/lint**

Run: `npm run lint && npm run check`
Expected: both pass. (If lint flags an unused import anywhere referencing `sortable-widget-row`, search and remove it — only `today-widget-editor.tsx` imported it.)

- [ ] **Step 4: Commit**

```bash
git add src/components/today/today-widget-editor.tsx
git commit -m "feat(today): WYSIWYG editor over real widget cards"
```

---

### Task 8: Long-press list + two labeled sections on TodayPage

**Files:**
- Modify: `src/components/today/today-widget-list.tsx`
- Modify: `src/pages/TodayPage.tsx`

- [ ] **Step 1: Add long-press to the display list**

Replace the entire contents of `src/components/today/today-widget-list.tsx` with:

```tsx
import { useRef } from "react";
import { widgetDef, type TodayWidgetConfig } from "./widget-registry";

type Props = {
  config: TodayWidgetConfig;
  onLongPress: () => void;
};

const LONG_PRESS_MS = 450;

export function TodayWidgetList({ config, onLongPress }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    timer.current = setTimeout(onLongPress, LONG_PRESS_MS);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const visible = config.filter((e) => e.visible);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-5">
      {visible.map((entry) => (
        <div
          key={entry.id}
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerMove={cancel}
          onPointerLeave={cancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          {widgetDef(entry.id).render()}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update TodayPage — pass long-press, add labeled sections**

In `src/pages/TodayPage.tsx`, replace the `TodayContent` function (lines ~49-99) with:

```tsx
function TodayContent() {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const { config, reorder, toggleVisible, reset } = useWidgetConfig();

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-[var(--text-faint)]">
            Tus módulos
          </span>
          <button
            type="button"
            aria-pressed={editMode}
            onClick={() => setEditMode((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-[12px] font-medium tracking-[0.06em] uppercase text-[var(--text-muted)]",
              "transition-[color,transform] duration-[160ms] ease-out hover:text-[var(--accent)] active:scale-[0.96]",
            )}
          >
            {editMode ? (
              <CheckIcon size={13} weight="bold" />
            ) : (
              <SlidersHorizontalIcon size={13} />
            )}
            {editMode ? "Hecho" : "Personalizar"}
          </button>
        </div>

        <div key={editMode ? "edit" : "view"} className="anim-fade-up">
          {editMode ? (
            <TodayWidgetEditor
              config={config}
              onReorder={reorder}
              onToggle={toggleVisible}
              onReset={reset}
            />
          ) : (
            <TodayWidgetList config={config} onLongPress={() => setEditMode(true)} />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-[var(--text-faint)]">
          Siempre visible
        </span>
        <div className="space-y-0.5">
          <PainCheckInCompact />
          <SleepStatus />
          <button
            type="button"
            onClick={() => navigate("/treatments")}
            className={cn(
              "flex min-h-[48px] w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-left",
              "text-[15px] text-[var(--text-muted)]",
              "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
              "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
            )}
            aria-label="Gestionar tratamientos"
          >
            <GearIcon size={16} className="shrink-0" />
            Gestionar tratamientos
            <CaretRightIcon size={10} className="ml-auto shrink-0 text-[var(--text-faint)]" />
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Lint/typecheck**

Run: `npm run lint && npm run check`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/today/today-widget-list.tsx src/pages/TodayPage.tsx
git commit -m "feat(today): long-press entry + labeled module/fixed sections"
```

---

## Phase D — Verification

### Task 9: Full verification + manual QA

**Files:** none (verification only)

- [ ] **Step 1: Web — full check**

Run: `cd /Users/ronymateo/Code/aws/weqe_cf/dry-eye-web && npm run lint && npm run check && npm run test`
Expected: lint passes for all touched files, build succeeds, vitest green (incl. `widget-config.test.ts`). Pre-existing lint errors in `theme.tsx`/`RegisterPage.tsx` are unrelated — confirm no NEW errors in touched files via `npx eslint <touched files>`.

- [ ] **Step 2: API — full check**

Run: `cd /Users/ronymateo/Code/aws/weqe_cf/dry_eye_api && npm run test && npm run build`
Expected: vitest green (incl. `user.service.test.ts`), build succeeds.

- [ ] **Step 3: Manual QA (both servers running)**

API: `cd ../dry_eye_api && npm run dev` · Web: `npm run dev` · open `/today`:
- [ ] Tap "Personalizar" → cards jiggle, eye badges appear, fade-up transition plays.
- [ ] Long-press any module card (display mode) → enters edit mode.
- [ ] Drag a card to reorder → order holds after "Hecho".
- [ ] Tap eye badge → card dims (hidden) inline; tap again → restores.
- [ ] Widget inner buttons do NOT fire while editing (pointer-events gated).
- [ ] Reload page → order + visibility persist (server).
- [ ] "Siempre visible" block (pain check-in / sleep / treatments) stays put, never draggable.
- [ ] `prefers-reduced-motion` on → no jiggle.

- [ ] **Step 4: Final note**

No squash required — commits are already scoped per task. Web branch `feat/today-widget-inplace-edit`, API branch `feat/today-widget-config`. Deploy (`db:migrate:prod`, wrangler deploy) is the user's call — out of scope.

---

## Self-Review Notes

- **Spec coverage:** G1 → Tasks 1,2,4,5. G2 → Tasks 6,7,8 (real cards, dnd, hide badge, pointer gating). G3 → Task 8 (labeled sections + long-press). Migration safety → Task 1 (default `'[]'`) + reconcile in Tasks 3/5. Error handling/rollback → Task 5. Testing → Tasks 2,3,9.
- **Removed component:** `sortable-widget-row.tsx` deleted in Task 7 (replaced by `sortable-widget-card.tsx`); only `today-widget-editor.tsx` referenced it.
- **Type consistency:** `TodayWidgetConfigEntry` (loose, domain.ts) is the persisted/boundary type; `TodayWidgetId`/`TodayWidgetEntry` (strict, widget-config.ts) are the runtime types; `reconcileWidgetConfig` narrows loose→strict. `userApi.updateMe({ todayWidgetConfig })` matches `UpdateMeBody.todayWidgetConfig` (web) and `UserUpdateInput.todayWidgetConfig` (api).
- **No placeholders:** every code step is complete.
