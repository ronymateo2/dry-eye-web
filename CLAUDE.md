# CLAUDE.md — dry-eye-web

## Qué es este proyecto

**NeuroEye Log (Weqe) — Web** es una PWA de salud para pacientes con ojo seco neuropático. Permite registrar diariamente dolor en 5 zonas (párpado, sien, masetero, cervical, orbital), gotas oculares, sueño, higiene palpebral, síntomas, triggers y observaciones clínicas. El dashboard calcula correlaciones Spearman entre sueño y dolor. UI dual-tema: dark (default, necesidad clínica) y light (opt-in via `[data-theme="light"]` en `<html>`).

**Público objetivo:** pacientes hispanohablantes con ojo seco neuropático. Toda la UI está en español.

El backend vive en https://github.com/ronymateo2/dry_eye_api (Hono + Cloudflare Workers + D1).

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 19 + Vite 6 |
| Estilos | Tailwind CSS 4 + TypeScript 5.8 |
| Auth | Google OAuth2 + JWT HS256 (tokens del API) |
| Estado cliente | TanStack React Query v5 |
| Offline | IndexedDB (`idb-keyval`) + PWA (`vite-plugin-pwa`) |
| Deploy | Cloudflare Worker |

---

## Comandos

```bash
npm run dev     # vite (puerto 5173)
npm run build   # tsc -b && vite build
npm run deploy  # npm run build && wrangler pages deploy dist --project-name weqe
```

---

## Estructura

```
src/
├── main.tsx          # QueryClient + AuthProvider + App
├── App.tsx           # Router, lazy pages, auth guard
├── globals.css       # Variables CSS + base styles
├── lib/
│   ├── api.ts        # Fetch wrapper tipado con todos los endpoints
│   ├── auth.tsx      # AuthContext, useAuth(), useUser()
│   ├── constants.ts  # APP_TABS, DROP_EYES, SYMPTOM_OPTIONS, TRIGGER_OPTIONS…
│   ├── utils.ts      # cn(), getDayKey()
│   ├── pain.ts       # Color helpers para nivel de dolor
│   ├── stats.ts      # Spearman (cliente)
│   ├── hooks/use-offline-sync.ts
│   └── offline/drops-queue.ts  # IndexedDB queue (idb-keyval)
├── types/domain.ts   # Todos los tipos de dominio compartidos
├── pages/            # Páginas lazy-loaded
└── components/
    ├── layout/       # app-shell, bottom-nav, screen-header, floating-quick-actions, mobile-sheet
    ├── dashboard/    # dashboard-screen, dashboard-charts (Recharts)
    ├── forms/        # drop-sheet, sleep-sheet, hygiene-sheet, observation-sheet…
    ├── report/       # report-screen (jsPDF + html2canvas)
    └── ui/           # button, wheel-picker, pain-slider, segmented-control, date-time-picker…
```

---

## Rutas

| Ruta | Página | Auth |
|---|---|---|
| `/register` | RegisterPage | ✓ |
| `/history` | HistoryPage | ✓ |
| `/dashboard` | DashboardPage | ✓ |
| `/report` | ReportPage | ✓ |
| `/profile` | ProfilePage | ✓ |
| `/drop-types` | DropTypesPage | ✓ |
| `/auth/callback` | AuthCallbackPage | — |

Ruta por defecto: `/register`.

---

## Auth

1. Google OAuth → API redirige a `/auth/callback?token=<jwt>`
2. `AuthCallbackPage` extrae token, lo guarda en `localStorage.weqe_token`, limpia URL
3. `api.ts` inyecta `Authorization: Bearer <token>` en cada request
4. 401 → `clearToken()` + `window.location.href = "/"`

---

## Tipos de dominio (`src/types/domain.ts`)

Tipos exportados principales:

```ts
User, DropTypeRecord, SaveDropInput, SaveHygieneInput,
SaveOccurrenceInput, SaveMedicationInput, HygieneRecord,
HistoryEntry, HistoryDayGroup, HistoryFeed,
ActionState, SleepQuality, DropEye, TriggerType, ObservationEye, HygieneStatus, FrictionType
```

Siempre definir nuevos tipos aquí si son compartidos por `api.ts` y páginas.

---

## Query keys (convención)

Usar **kebab-case** en arrays:

```ts
["drop-types"]     // ✓
["drops/last"]     // ✓
["dashboard"]      // ✓
["dropTypes"]      // ✗
```

---

## Sistema de temas (CSS variables)

Ver [DESIGN.md](./DESIGN.md) para el sistema completo de diseño.

```css
--bg            /* #121008 — fondo principal */
--surface       /* tarjetas / inputs */
--surface-el    /* elementos elevados */
--border        /* bordes */
--text-primary / --text-muted / --text-faint / --text-secondary
--accent        /* #d4a24c — dorado */
--accent-dim / --accent-bright
--pain-low      /* verde */
--pain-mid      /* naranja */
--pain-high     /* rojo */
--screen-padding: 20px
--tabbar-height: 92px
--radius-sm / --radius-md / --radius-lg / --radius-full
```

**Dual-tema.** Dark es el default (necesidad médica para fotofobia). Light es opt-in (`document.documentElement.dataset.theme = "light"`). Usar siempre variables CSS — nunca colores hardcoded. Ver [DESIGN.md](./DESIGN.md) para paleta completa de ambos temas.

---

## Estrategia offline

- Solo las **gotas** se encolan offline (IndexedDB via `idb-keyval`)
- `useOfflineSync` hook: en `navigator.onLine = true`, sincroniza la cola e invalida `["drops/last"]`
- `DropSheet` detecta `navigator.onLine` y cola directamente si está offline o si el POST falla

---

## Convenciones de código

- **TypeScript strict** activado
- **Sin imports `React` o `* as React`** — usar named imports (`useState`, `type ReactNode`, etc.)
- **Sin comentarios** salvo que el WHY no sea obvio
- **Sin validación de frontend con Zod/Yup** — validación manual o por constraints del API
- **Componentes hoja (`*-sheet.tsx`)** = modales móviles con animación; se montan lazy en `FloatingQuickActions`
- **`cn()`** de `@/lib/utils` para combinar clases Tailwind condicionales
- **Accesibilidad**: `aria-label` en todos los controles interactivos, `aria-modal` + `aria-labelledby` en sheets
- Simplicity First — mínimo código que resuelve el problema
- Cambios quirúrgicos — no "mejorar" código adyacente que no es parte de la tarea
