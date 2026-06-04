# AGENTS.md — dry-eye-web

PWA de salud para pacientes hispanohablantes con ojo seco neuropático. Registra dolor (5 zonas), gotas, viales desechables, sueño, higiene palpebral, síntomas, triggers, medicamentos y observaciones clínicas. Dashboard con correlaciones Spearman. UI en español, dark-first con light opt-in.

Backend: https://github.com/ronymateo2/dry_eye_api (Hono + Cloudflare Workers + D1)

## Stack

React 19 · Vite 6 · TypeScript 5.8 (strict) · Tailwind CSS 4 · TanStack React Query v5 · react-router-dom v7 · Recharts · jsPDF + html2canvas · motion · sonner · idb-keyval · vite-plugin-pwa · Cloudflare Workers (wrangler)

## Commands

```bash
npm run dev       # vite — puerto 5173, proxy /api → localhost:8787
npm run build     # tsc -b && vite build (CI runs this)
npm run check     # tsc && vite build (full type+build check)
npm run lint      # eslint .
npm run test      # vitest run — pure-domain unit tests (features/*/domain.test.ts)
npm run deploy    # wrangler deploy (production)
npm run cf-typegen  # wrangler types (Cloudflare bindings)
```

**Verification order:** `lint → check` (lint first, then typecheck+build).

## Deploy & CI

- `.github/workflows/deploy.yml`: pushes `main` → production, `staging` → staging env
- CI sets `VITE_API_URL` from GitHub vars; runs `npm ci → build → wrangler deploy`
- Production API: `https://dry-eye-api.ronymateo.workers.dev/api`
- Local: `VITE_API_URL=http://localhost:8787/api` in `.env.local`
- Wrangler config: `wrangler.json` (Workers with SPA assets, not Pages)
- Node: `.nvmrc` = v25, CI uses Node 22

## Architecture

```
src/
  main.tsx              # QueryClient + App bootstrap + SW reload
  App.tsx               # BrowserRouter → AuthProvider → ThemeProvider → routes
  globals.css           # CSS variables (dual theme)
  lib/
    http.ts             # Typed base HTTP client (http.get/post/put/delete<T>) + token + 401 handling
    report-error.ts     # Client error reporter → POST /api/errors + global handlers
    auth.tsx             # AuthProvider, useAuth(), useUser() — JWT from localStorage
    theme.tsx            # ThemeProvider — dark default, light opt-in, persisted to server
    constants.ts         # UI constants, options lists
    utils.ts             # cn(), getDayKey()
    pain.ts              # Color helpers for pain levels
    stats.ts             # Spearman correlation (client-side)
    last-drop-store.ts   # Local state for last-drop widget
    hooks/
      use-offline-sync.ts
      use-local-storage.ts
      use-last-drop-widget.ts
    offline/
      drops-queue.ts     # IndexedDB queue (idb-keyval)
  features/             # Feature-slice data layer (one folder per domain)
    drops/ medications/ observations/ symptoms/ dashboard/ calendar/
    sleep/ check-ins/ history/ report/ therapy/ hygiene/ user/
    #   query-keys.ts (hierarchical) · api.ts (wraps http) · queries/mutations/hooks · types.ts
    #   domain.ts = pure rules (no React/IO), unit-tested in domain.test.ts (drops, medications)
    #   components import feature hooks/keys/api — never @/lib/http directly for endpoints
  types/domain.ts       # All shared domain types — single source of truth
  pages/                 # Lazy-loaded route pages
  components/
    layout/              # app-shell, bottom-nav, screen-header, floating-quick-actions, mobile-sheet, splash-screen
    dashboard/           # dashboard-screen, dashboard-charts (Recharts)
    forms/               # *-sheet.tsx = mobile modals; lazy-mounted in FloatingQuickActions
    history/              # timeline cards, tabs, feed, vials-tab
    register/             # day-projection, drops-schedule cards
    report/               # report-screen (jsPDF + html2canvas)
    ui/                   # button, wheel-picker, pain-slider, segmented-control, date-time-picker, etc.
```

**Path alias:** `@/` → `src/` (configured in tsconfig + vite.config.ts)

## Routes

| Route | Page | Auth |
|---|---|---|
| `/login` | LoginPage | ✗ |
| `/today` | TodayPage | ✓ |
| `/check-in` | RegisterPage (pain form) | ✓ |
| `/register` | RegisterPage (pain form) | ✓ |
| `/history` | HistoryPage | ✓ |
| `/dashboard` | DashboardPage | ✓ |
| `/report` | ReportPage | ✓ |
| `/profile` | ProfilePage | ✓ |
| `/treatments` | TreatmentsPage | ✓ |
| `/vials` | VialsPage | ✓ |
| `/auth/callback` | AuthCallbackPage | — |

- Unauthenticated → `/login`. Authenticated default → `/today`.
- 401 → `clearToken()` + redirect to `/`.

## Auth

1. Google OAuth button → API redirect to `/auth/callback?token=<jwt>`
2. `AuthCallbackPage` extracts token → `localStorage.weqe_token` → cleans URL
3. `lib/http.ts` injects `Authorization: Bearer <token>` on every request
4. 401 response → `clearToken()` + `window.location.href = "/"`

## Theme

Dual theme: dark (default, clinical necessity for photophobia) and light (opt-in). `ThemeProvider` reads user preference from server (`auth.user.theme`), persists via `userApi.updateMe({ theme })`. Toggle: `document.documentElement.dataset.theme = "light"|"dark"`. **Always use CSS variables — never hardcode colors.** Full palette in `DESIGN.md`.

## Offline

- Only **drops** queue offline (IndexedDB via `idb-keyval`)
- `useOfflineSync`: on `navigator.onLine`, syncs queue then invalidates `dropKeys.last()`
- `DropSheet` detects offline and queues directly

## Domain types (`src/types/domain.ts`)

Single source of truth for all shared types. Key exports:

```ts
User, DropTypeRecord, SaveDropInput, SaveHygieneInput, SaveOccurrenceInput,
SaveMedicationInput, SaveMedicationIntakeInput, MedicationRecord, MedicationIntakeRecord,
SaveTherapySessionInput, TherapySessionRecord, TherapyCorrelation,
HygieneRecord, HistoryEntry, HistoryDayGroup, HistoryFeed,
CalendarStatus, CalendarEventEntry, DropScheduleEntry, DropTypeStats,
VialRecord, VialInstanceRecord, SaveVialInput,
ActionState, SleepQuality, DropEye, TriggerType, ObservationEye,
HygieneStatus, FrictionType, PainQuality, TherapyType, MedicationPhase
```

Always define new shared types here.

## Query keys — centralized & hierarchical

Never write inline `queryKey` arrays. Each feature owns a `query-keys.ts` with a
hierarchical factory rooted at the feature name:

```ts
export const dropKeys = {
  all: ["drops"] as const,
  last: () => [...dropKeys.all, "last"] as const,
  recent: (id: string) => [...dropKeys.all, "recent", id] as const,
};
```

This lets `invalidateQueries({ queryKey: dropKeys.all })` invalidate the whole
feature in one call (TanStack prefix-matches). Components import the factory:
`dropKeys.last()` — never `["drops","last"]` or `["drops/last"]`.

## Conventions

- **TypeScript strict** + `noUnusedLocals` + `noUnusedParameters` + `noImplicitReturns` (in tsconfig.app.json)
- **No `React` or `* as React` imports** — use named imports (`useState`, `type ReactNode`)
- **No comments** unless the WHY is non-obvious
- **No Zod/Yup** — manual validation or API constraints
- **`*-sheet.tsx` components** = animated mobile modals, lazy-mounted in `FloatingQuickActions`
- **`cn()`** from `@/lib/utils` for conditional Tailwind classes
- **Accessibility**: `aria-label` on interactive controls, `aria-modal` + `aria-labelledby` on sheets
- **Simplicity First** — minimum code that solves the problem
- **Surgical changes** — don't "improve" adjacent code outside the task scope