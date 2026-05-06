# NeuroEye Log — Implementation Plan

> Based on medical consultation 2026-05-02 (Dra. Melissa Alvarán, Neuro-Oftalmología).

---

## Phase A — Migration `0009_medical_protocols.sql`

**File:** `dry_eye_api/migrations/0009_medical_protocols.sql`

Run before touching any code. Apply with `npm run db:migrate:local` then `npm run db:migrate`.

```sql
-- Feature 1: Drop type suspension date
ALTER TABLE dy_drop_types ADD COLUMN end_date TEXT;
ALTER TABLE dy_drop_types ADD COLUMN suspension_note TEXT;

-- Feature 2: Medication protocols
ALTER TABLE dy_medications ADD COLUMN start_date TEXT;
ALTER TABLE dy_medications ADD COLUMN end_date TEXT;
ALTER TABLE dy_medications ADD COLUMN phases_json TEXT;

-- Feature 3: Multiple triggers per check-in
ALTER TABLE dy_check_ins ADD COLUMN trigger_types TEXT;
UPDATE dy_check_ins
  SET trigger_types = json_array(trigger_type)
  WHERE trigger_type IS NOT NULL AND trigger_types IS NULL;

-- Feature 4b: Pain quality
ALTER TABLE dy_check_ins ADD COLUMN pain_quality TEXT;

-- Feature 5: Therapy sessions
CREATE TABLE IF NOT EXISTS dy_therapy_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES dy_users(id) ON DELETE CASCADE,
  logged_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  therapy_type TEXT NOT NULL DEFAULT 'miofascial',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS dy_therapy_user_logged
  ON dy_therapy_sessions (user_id, logged_at);
```

---

## Phase B — API updates

### B1 — Schema (`dry_eye_api/src/db/schema.ts`)

**`dyDropTypes` — add:**
```ts
end_date: text("end_date"),
suspension_note: text("suspension_note"),
```

**`dyCheckIns` — add:**
```ts
trigger_types: text("trigger_types"),   // JSON array of TriggerType strings
pain_quality: text("pain_quality"),     // JSON array: ardor|hormigueo|electrico|presion|alodinia
```

**`dyMedications` — add:**
```ts
start_date: text("start_date"),
end_date: text("end_date"),
phases_json: text("phases_json"),       // JSON: MedicationPhase[]
```

**New table — `dyTherapySessions`:**
```ts
export const dyTherapySessions = sqliteTable(
  "dy_therapy_sessions",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull().references(() => dyUsers.id, { onDelete: "cascade" }),
    logged_at: text("logged_at").notNull().default(now),
    therapy_type: text("therapy_type").notNull().default("miofascial"),
    notes: text("notes"),
    created_at: text("created_at").notNull().default(now),
  },
  (t) => [index("dy_therapy_user_logged").on(t.user_id, t.logged_at)],
);
```

Export from `dry_eye_api/src/db/index.ts` — already done via `export * from "./schema"`.

---

### B2 — Drop Types route (`dry_eye_api/src/routes/drop-types.ts`)

**`GET /`** — add `end_date` and `suspension_note` to `select()`.

**`POST /`** — extend body: `{ name, intervalHours?, endDate?, suspensionNote? }`. Pass into `db.insert()`.

**`PUT /:id`** — extend body: `{ intervalHours?, endDate?, suspensionNote? }`. Build `set` conditionally (same pattern as medications PUT).

---

### B3 — Check-ins route (`dry_eye_api/src/routes/check-ins.ts`)

**`POST /`** — extend body:
```ts
{
  // ... existing fields ...
  triggerType?: string | null;       // keep for backward compat
  triggerTypes?: string[] | null;    // new multi-select
  painQuality?: string[] | null;     // new
}
```

In `values`:
- `trigger_types`: `body.triggerTypes ? JSON.stringify([...new Set(body.triggerTypes)]) : (body.triggerType ? JSON.stringify([body.triggerType]) : null)`
- `trigger_type`: `body.triggerTypes?.[0] ?? body.triggerType ?? null` (keep populated for backward compat)
- `pain_quality`: `body.painQuality ? JSON.stringify(body.painQuality) : null`

Add both to `onConflictDoUpdate.set`.

**`GET /last`** — add `trigger_types` and `pain_quality` to `select()` and response.

---

### B4 — Medications route (`dry_eye_api/src/routes/medications.ts`)

**`GET /`** — add `start_date`, `end_date`, `phases_json` to `select()`.

**`POST /`** — extend body: `{ name, dosage?, frequency?, notes?, startDate?, endDate?, phasesJson? }`.

**`PUT /:id`** — extend body with optional `startDate`, `endDate`, `phasesJson`. Add to conditional `set` builder.

---

### B5 — Therapy sessions route (new file)

**New file:** `dry_eye_api/src/routes/therapy-sessions.ts`

```ts
import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { authMiddleware } from "../middleware/auth";
import { getDb, dyTherapySessions } from "../db";
import { and, eq, gte, lt, desc } from "drizzle-orm";

const therapySessions = new Hono<{ Bindings: Env; Variables: Variables }>();
therapySessions.use("*", authMiddleware);

therapySessions.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ id: string; loggedAt: string; therapyType?: string; notes?: string | null }>();
  const db = getDb(c.env.DB);

  await db.insert(dyTherapySessions).values({
    id: body.id,
    user_id: userId,
    logged_at: body.loggedAt,
    therapy_type: body.therapyType ?? "miofascial",
    notes: body.notes ?? null,
  });

  return c.json({ ok: true });
});

therapySessions.get("/", async (c) => {
  const userId = c.get("userId");
  const db = getDb(c.env.DB);
  const before = c.req.query("before");
  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const rows = await db
    .select({ id: dyTherapySessions.id, logged_at: dyTherapySessions.logged_at, therapy_type: dyTherapySessions.therapy_type, notes: dyTherapySessions.notes })
    .from(dyTherapySessions)
    .where(and(eq(dyTherapySessions.user_id, userId), gte(dyTherapySessions.logged_at, cutoff), ...(before ? [lt(dyTherapySessions.logged_at, before)] : [])))
    .orderBy(desc(dyTherapySessions.logged_at))
    .limit(50);

  return c.json({ ok: true, sessions: rows });
});

export { therapySessions };
```

**Register in `dry_eye_api/src/index.ts`:**
```ts
import { therapySessions } from "./routes/therapy-sessions";
app.route("/api/therapy-sessions", therapySessions);
```

---

### B6 — Dashboard route (`dry_eye_api/src/routes/dashboard.ts`)

Add 4th query to `db.batch()`:
```ts
db.select({ logged_at: dyTherapySessions.logged_at })
  .from(dyTherapySessions)
  .where(eq(dyTherapySessions.user_id, userId))
  .orderBy(desc(dyTherapySessions.logged_at))
  .limit(500),
```

Import `dyTherapySessions` from `"../db"`.

After existing stats, compute therapy correlation:
```ts
let therapyCorrelation: { therapyDays: number; avgPainAfterTherapy: number; avgPainBaseline: number } | null = null;

if (therapyRows.length >= 3) {
  const painByDay = new Map<string, { sum: number; count: number }>();
  for (const ci of checkInsRows) {
    const dk = getDayKey(ci.logged_at, timezone);
    const mean = (ci.eyelid_pain + ci.temple_pain + ci.masseter_pain + ci.cervical_pain + ci.orbital_pain) / 5;
    const cur = painByDay.get(dk) ?? { sum: 0, count: 0 };
    cur.sum += mean; cur.count++;
    painByDay.set(dk, cur);
  }

  const therapyDaySet = new Set(therapyRows.map((r) => getDayKey(r.logged_at, timezone)));

  const afterTherapyPains: number[] = [];
  for (const dk of therapyDaySet) {
    const [y, m, d] = dk.split("-").map(Number) as [number, number, number];
    const nextKey = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    const pb = painByDay.get(nextKey);
    if (pb) afterTherapyPains.push(pb.sum / pb.count);
  }

  const afterSet = new Set([...therapyDaySet].map((dk) => {
    const [y, m, d] = dk.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  }));
  const baselinePains: number[] = [];
  for (const [dk, pb] of painByDay) {
    if (!therapyDaySet.has(dk) && !afterSet.has(dk)) baselinePains.push(pb.sum / pb.count);
  }

  if (afterTherapyPains.length >= 3 && baselinePains.length >= 3) {
    therapyCorrelation = {
      therapyDays: therapyDaySet.size,
      avgPainAfterTherapy: +(afterTherapyPains.reduce((a, b) => a + b, 0) / afterTherapyPains.length).toFixed(2),
      avgPainBaseline: +(baselinePains.reduce((a, b) => a + b, 0) / baselinePains.length).toFixed(2),
    };
  }
}
```

Add `therapyCorrelation` to final `return c.json({ ... })`.

---

### B7 — Report route (`dry_eye_api/src/routes/report.ts`)

Extend `db.batch()` with medications query:
```ts
db.select({ name: dyMedications.name, dosage: dyMedications.dosage, start_date: dyMedications.start_date, end_date: dyMedications.end_date, phases_json: dyMedications.phases_json })
  .from(dyMedications)
  .where(eq(dyMedications.user_id, userId))
  .orderBy(sql`COALESCE(${dyMedications.sort_order}, 9999)`),
```

Import `dyMedications` from `"../db"`. Add `medications: medsRows` to response JSON.

---

### B8 — History route (`dry_eye_api/src/routes/history.ts`)

1. Add therapy sessions batch query (same window as other queries).
2. In `select()` for `dyCheckIns`, add `trigger_types` and `pain_quality`.
3. In entries loop: push therapy entries as `{ kind: "therapy", id, loggedAt, therapyType, notes }`.
4. In check-in entries: include `triggerTypes: ci.trigger_types, painQuality: ci.pain_quality`.
5. Repeat for `GET /more` handler.

---

### B9 — Drops route (`dry_eye_api/src/routes/drops.ts`)

In the `last-per-type` endpoint (or equivalent), join `dy_drop_types` to include `end_date` in the response. Update `DropScheduleEntry` in `domain.ts` to add `end_date?: string | null`.

---

## Phase C — Web updates

### C1 — Domain types (`src/types/domain.ts`)

```ts
// Update:
export type DropTypeRecord = {
  id: string; name: string; sort_order?: number | null;
  interval_hours?: number | null;
  end_date?: string | null;
  suspension_note?: string | null;
};

export type MedicationPhase = {
  label: string;
  dosage: string;
  start_date: string;       // YYYY-MM-DD
  end_date: string | null;  // null = open-ended
};

export type MedicationRecord = {
  id: string; name: string; dosage: string | null; frequency: string | null;
  notes: string | null; sort_order: number | null;
  start_date: string | null;
  end_date: string | null;
  phases_json: string | null;
};

export type SaveMedicationInput = {
  id?: string; name: string; dosage?: string; frequency?: string; notes?: string;
  startDate?: string | null;
  endDate?: string | null;
  phasesJson?: string | null;
};

export type PainQuality = "ardor" | "hormigueo" | "electrico" | "presion" | "alodinia";
export type TherapyType = "miofascial" | "other";

export type SaveTherapySessionInput = {
  id: string; loggedAt: string; therapyType: TherapyType; notes?: string | null;
};

export type TherapySessionRecord = {
  id: string; logged_at: string; therapy_type: TherapyType; notes: string | null;
};

export type TherapyCorrelation = {
  therapyDays: number; avgPainAfterTherapy: number; avgPainBaseline: number;
};

// Update DropScheduleEntry:
export type DropScheduleEntry = {
  drop_type_id: string; name: string;
  interval_hours: number | null; last_logged_at: string | null;
  end_date?: string | null;
};
```

---

### C2 — Constants (`src/lib/constants.ts`)

```ts
// Update SYMPTOM_OPTIONS — append alarm symptoms:
{ id: "destellos", label: "Destellos/Chispas", value: "destellos", isAlarm: true },
{ id: "cortina_visual", label: "Cortina visual", value: "cortina_visual", isAlarm: true },
{ id: "vision_doble", label: "Visión doble", value: "vision_doble", isAlarm: true },
{ id: "moscas_empeoran", label: "Moscas que empeoran", value: "moscas_empeoran", isAlarm: true },

// Add:
export const PAIN_QUALITY_OPTIONS = [
  { id: "ardor", label: "Ardor", value: "ardor" },
  { id: "hormigueo", label: "Hormigueo", value: "hormigueo" },
  { id: "electrico", label: "Eléctrico", value: "electrico" },
  { id: "presion", label: "Presión", value: "presion" },
  { id: "alodinia", label: "Alodinia", value: "alodinia" },
] as const;
```

---

### C3 — API client (`src/lib/api.ts`)

- `getDropTypes`: return type adds `end_date`, `suspension_note`
- `createDropType`: add `endDate?`, `suspensionNote?` params
- `updateDropType`: rename/expand to accept `{ intervalHours?, endDate?, suspensionNote? }`
- `saveCheckIn`: body adds `triggerTypes: string[]`, `painQuality: string[]`
- `getLastCheckIn` return type: adds `trigger_types: string | null`, `pain_quality: string | null`
- `getMedications` return type: adds `start_date`, `end_date`, `phases_json`
- `createMedication` / `updateMedication`: accept `SaveMedicationInput`
- New: `saveTherapySession(input: SaveTherapySessionInput)`
- New: `getTherapySessions(before?: string)`
- `getDashboard` return type: adds `therapyCorrelation: TherapyCorrelation | null`
- `getReport` return type: adds `medications` array

---

### C4 — DropTypesPage (`src/pages/DropTypesPage.tsx`)

**Helper:**
```ts
function daysUntilEnd(endDate: string): number {
  const end = new Date(endDate + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
}
```

**`SortableDropType` component:** Below name, render end-date badge:
```tsx
{dt.end_date && (() => {
  const days = daysUntilEnd(dt.end_date);
  const isPast = days < 0;
  const isUrgent = !isPast && days <= 7;
  return (
    <span className={cn("ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
      isPast ? "bg-[rgba(204,63,48,0.12)] text-[var(--error)]"
      : isUrgent ? "bg-[rgba(234,179,8,0.12)] text-[#ca8a04]"
      : "bg-[var(--surface-el)] text-[var(--text-muted)]")}>
      {isPast ? "Suspendido" : isUrgent ? `Suspender en ${days}d` : `Hasta ${dt.end_date}`}
    </span>
  );
})()}
```

Apply `opacity-50 line-through` to name when `days < 0`.

**Edit section:** Expand inline edit to include a `type="date"` input for `end_date`.

**Create form:** Add `end_date` date input. Pass `endDate` to `api.createDropType`.

---

### C5 — DropsScheduleCard (`src/components/register/drops-schedule-card.tsx`)

After fetching schedule entries (which now include `end_date`), compute and render suspension banner:

```tsx
{(() => {
  const past = schedule.filter((e) => e.end_date && daysUntilEnd(e.end_date) < 0);
  const urgent = schedule.filter((e) => e.end_date && daysUntilEnd(e.end_date) >= 0 && daysUntilEnd(e.end_date) <= 7);
  if (past.length > 0) return (
    <div className="rounded-[10px] border border-[var(--error)] bg-[rgba(204,63,48,0.08)] px-4 py-3 text-[13px] text-[var(--error)]">
      Suspende {past.map((e) => e.name).join(", ")} — la fecha de suspensión ya pasó.
    </div>
  );
  if (urgent.length > 0) return (
    <div className="rounded-[10px] border border-[#ca8a04] bg-[rgba(234,179,8,0.08)] px-4 py-3 text-[13px] text-[#ca8a04]">
      {urgent.map((e) => `${e.name}: suspender en ${daysUntilEnd(e.end_date!)}d`).join(" · ")}
    </div>
  );
  return null;
})()}
```

---

### C6 — RegisterPage (`src/pages/RegisterPage.tsx`)

**State changes:**
```ts
// Replace: const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(new Set());
// Add:
const [selectedPainQuality, setSelectedPainQuality] = useState<Set<string>>(new Set());
const [showPainQuality, setShowPainQuality] = useState(false);
```

**Trigger accordion → multi-select:**
- Toggle via set: `n.has(opt.id) ? n.delete(opt.id) : n.add(opt.id)`
- Summary: `selectedTriggers.size > 0 ? `Triggers (${selectedTriggers.size})` : "¿Hubo un trigger?"`
- `isTriggerValid`: if `"other" in selectedTriggers` → `customTriggerName.trim().length > 0`

**`doSave()`:**
```ts
const triggerTypes = [...selectedTriggers]
  .map((id) => TRIGGER_OPTIONS.find((t) => t.id === id)?.value)
  .filter((v): v is string => v != null);
// Deduplicate (wind + AC both emit "climate"):
const uniqueTriggerTypes = [...new Set(triggerTypes)];

await api.saveCheckIn({
  // ... existing fields ...
  triggerTypes: uniqueTriggerTypes,
  painQuality: [...selectedPainQuality],
});
```

**Pain quality accordion** — add after stress card, before sticky CTA. Same accordion pattern. Pills from `PAIN_QUALITY_OPTIONS`.

**Alarm symptoms in symptoms accordion:**
```ts
const normalSymptoms = SYMPTOM_OPTIONS.filter((o) => !("isAlarm" in o && o.isAlarm));
const alarmSymptoms = SYMPTOM_OPTIONS.filter((o) => "isAlarm" in o && o.isAlarm);
```

Render `normalSymptoms` first, then `alarmSymptoms` in a red-bordered section:
```tsx
<div className="rounded-[12px] border border-[var(--error)] p-3 space-y-2">
  <p className="text-[11px] font-medium text-[var(--error)] uppercase tracking-[0.1em] flex items-center gap-1.5">
    <WarningIcon size={13} /> Síntomas de alarma
  </p>
  <div className="flex flex-wrap gap-2">
    {alarmSymptoms.map((opt) => (/* active: red pill */)}
  </div>
</div>
```

After the accordion, alarm banner when any alarm symptom selected:
```tsx
{hasAlarmSymptom && (
  <div className="rounded-[12px] border border-[var(--error)] bg-[rgba(204,63,48,0.08)] px-4 py-3">
    <p className="text-[13px] font-medium text-[var(--error)]">
      Este síntoma puede requerir atención urgente. Consulta a tu médico.
    </p>
  </div>
)}
```

---

### C7 — ProfilePage (`src/pages/ProfilePage.tsx`)

**`MedPhaseTimeline` component:**
```tsx
function MedPhaseTimeline({ phasesJson }: { phasesJson: string }) {
  const phases: MedicationPhase[] = JSON.parse(phasesJson);
  const today = new Date().toISOString().slice(0, 10);
  const currentIdx = phases.findIndex(
    (p) => today >= p.start_date && (p.end_date === null || today <= p.end_date),
  );
  return (
    <div className="flex items-end gap-1 overflow-x-auto pt-1">
      {phases.map((p, i) => {
        const isCurrent = i === currentIdx;
        const isPast = currentIdx > -1 && i < currentIdx;
        return (
          <div key={i} className="flex shrink-0 flex-col items-center gap-0.5">
            <div className={cn("h-1.5 w-12 rounded-full",
              isCurrent ? "bg-[var(--accent)]" : isPast ? "bg-[var(--text-faint)]" : "bg-[var(--border)]")} />
            <span className={cn("text-[10px]",
              isCurrent ? "text-[var(--accent)] font-medium" : "text-[var(--text-faint)]")}>
              {p.dosage}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

**Phase transition countdown chip:**
```tsx
{currentPhase?.end_date && (() => {
  const days = Math.ceil((new Date(currentPhase.end_date + "T00:00:00").getTime() - Date.now()) / 86_400_000);
  if (days <= 0 || !phases[currentIdx + 1]) return null;
  return (
    <span className="inline-flex rounded-full bg-[var(--accent-dim)] px-2 py-0.5 text-[10px] text-[var(--accent)]">
      Cambiar a {phases[currentIdx + 1].dosage} en {days}d
    </span>
  );
})()}
```

**Med end_date warning badge** — in medication row, show red/yellow countdown when `end_date` set and within 7 days.

**Form additions:** `start_date` and `end_date` date inputs. `phases_json` raw textarea (JSON) with placeholder showing format.

---

### C8 — FloatingQuickActions + TherapySheet

**`src/components/layout/floating-quick-actions.tsx`:**
- Add `"therapy"` to `Sheet` type
- Add to `ACTION_ITEMS`: `{ sheet: "therapy", Icon: HeartbeatIcon, label: "Terapia" }`
- Lazy import `TherapySheet` from `@/components/forms/therapy-sheet`
- Render `<MobileSheet open={sheet === "therapy"} ...><TherapySheet onSaved={savedAndClose} /></MobileSheet>`

**New file:** `src/components/forms/therapy-sheet.tsx`

Simple sheet: therapy type pills (Miofascial / Otro), optional `DateTimePicker`, optional notes `TextInput`, save Button. Calls `api.saveTherapySession()`.

---

### C9 — History updates

**`src/components/history/types.ts`** — add:
```ts
export type DisplayTherapy = {
  kind: "therapy"; id: string; loggedAt: string;
  therapyType: string; notes: string | null;
};
```

Add to `DisplayItem` union.

Update `DisplayCheckIn` — add:
```ts
triggerTypes: string[] | null;
painQuality: string[] | null;
```

**History parsing (wherever API response maps to `DisplayItem[]`):**
- `"therapy"` case: map to `DisplayTherapy`
- `"check-in"` case: parse `entry.triggerTypes` JSON → `string[]`; parse `entry.painQuality` JSON → `string[]`

**`src/components/history/history-item.tsx`** — add:
```tsx
if (item.kind === "therapy") return <TherapyCard item={item} timezone={timezone} />;
```

**`src/components/history/history-cards.tsx`** — add `TherapyCard`:
```tsx
export function TherapyCard({ item, timezone }: { item: DisplayTherapy; timezone: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface-card)] p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
        <HeartbeatIcon size={16} color="var(--accent)" weight="fill" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-medium text-[var(--text-primary)]">
          {item.therapyType === "miofascial" ? "Terapia miofascial" : "Terapia"}
        </span>
        <span className="mono text-[11px] text-[var(--text-faint)]">{formatTime(item.loggedAt, timezone)}</span>
        {item.notes && <span className="mt-1 text-[12px] italic text-[var(--text-muted)]">"{item.notes}"</span>}
      </div>
    </div>
  );
}
```

Update `CheckInCard` to show multiple trigger pills and pain quality pills when present.

---

### C10 — LastCheckInRecall (`src/components/forms/last-check-in-recall.tsx`)

Parse `trigger_types` JSON into array; fall back to `trigger_type` string:
```ts
const parsedTriggers: string[] = data.trigger_types
  ? (() => { try { return JSON.parse(data.trigger_types); } catch { return []; } })()
  : data.trigger_type ? [data.trigger_type] : [];
```

Render multiple trigger pills instead of single `triggerLabel`.

---

### C11 — Dashboard (`src/components/dashboard/dashboard-screen.tsx`)

Add `TherapyCorrelationCard` (inline or in `dashboard-charts.tsx`):

```tsx
{data.therapyCorrelation && data.therapyCorrelation.therapyDays >= 3 && (
  <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4 space-y-3">
    <p className="section-label">Impacto de terapia miofascial</p>
    <p className="text-[12px] text-[var(--text-faint)]">
      {data.therapyCorrelation.therapyDays} sesiones registradas
    </p>
    <div className="grid grid-cols-2 gap-3">
      {/* avgPainAfterTherapy vs avgPainBaseline comparison cards */}
    </div>
    <p className="text-[13px]" style={{ color: delta > 0 ? "var(--pain-low)" : "var(--pain-high)" }}>
      {delta > 0
        ? `La terapia se asocia con ${delta.toFixed(1)} pts menos de dolor al día siguiente.`
        : "No se observa reducción de dolor post-terapia aún."}
    </p>
  </div>
)}
```

---

### C12 — ReportPage (`src/components/report/report-screen.tsx`)

Add `medications` to `ReportData` type. Add `MedicamentosSection` before pain trend chart:

```tsx
{data.medications?.length > 0 && (
  <section className="space-y-3">
    <p className="section-label">Medicamentos activos</p>
    <ul className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
      {data.medications.map((med, i) => {
        const phases: MedicationPhase[] | null = med.phases_json
          ? (() => { try { return JSON.parse(med.phases_json); } catch { return null; } })()
          : null;
        const today = new Date().toISOString().slice(0, 10);
        const currentPhase = phases?.find(
          (p) => today >= p.start_date && (p.end_date === null || today <= p.end_date),
        );
        return (
          <li key={i} className="flex min-h-12 flex-col justify-center border-b border-[var(--border)] px-4 py-2.5 last:border-b-0">
            <span className="text-[14px] text-[var(--text-primary)]">{med.name}</span>
            <span className="mono text-[11px] text-[var(--text-muted)]">
              {currentPhase ? `${currentPhase.label} — ${currentPhase.dosage}` : (med.dosage ?? "")}
              {med.end_date && ` · hasta ${med.end_date}`}
            </span>
          </li>
        );
      })}
    </ul>
  </section>
)}
```

---

## Implementation sequence

```
1.  Run migration 0009 on D1 local → then production
2.  schema.ts — add columns + dyTherapySessions table
3.  drop-types.ts — GET/POST/PUT
4.  medications.ts — GET/POST/PUT
5.  check-ins.ts — POST + GET /last
6.  therapy-sessions.ts — create file + register in index.ts
7.  drops.ts — add end_date to last-per-type endpoint
8.  dashboard.ts — therapy correlation
9.  report.ts — medications in batch + response
10. history.ts — therapy rows, trigger_types, pain_quality
11. domain.ts — new types
12. constants.ts — alarm symptoms + PAIN_QUALITY_OPTIONS
13. api.ts — all endpoint changes
14. DropTypesPage.tsx — end_date badge + edit + create
15. drops-schedule-card.tsx — suspension banner
16. RegisterPage.tsx — multi-trigger + pain quality + alarm symptoms
17. ProfilePage.tsx — phases timeline + warnings + form fields
18. therapy-sheet.tsx — new file
19. floating-quick-actions.tsx — add therapy sheet
20. history/types.ts — DisplayTherapy + DisplayCheckIn update
21. history parsing — entry mapping
22. history-item.tsx — therapy routing
23. history-cards.tsx — TherapyCard + CheckInCard multi-trigger
24. last-check-in-recall.tsx — multi-trigger
25. dashboard-screen.tsx — TherapyCorrelationCard
26. report-screen.tsx — MedicamentosSection
```

---

## Edge cases / gotchas

- **`trigger_types` dedup:** `wind` and `AC` both map to `value: "climate"`. Use `[...new Set(triggerTypes)]` before sending to API.
- **JSON.parse safety:** All `phases_json`, `trigger_types`, `pain_quality` parses in the web must be try-catch wrapped (field could be null or malformed).
- **History batch size:** The history route may already have 10 batch queries. Adding therapy as an 11th might require splitting into two `db.batch()` calls if Drizzle's TypeScript tuple limit is hit.
- **Backward compat:** `trigger_type` (single) stays populated for existing dashboard/report queries. Only stop writing it when all reads are migrated.
- **`daysUntilEnd` used in multiple components** — extract to a shared utility in `src/lib/utils.ts`.
