# PLAN — Mirror SQLite local (offline-first) con sqlite-wasm

> Evaluación de arquitectura para `dry-eye-web`. No toca código.
> Objetivo declarado: mejorar performance de la app, con foco en `src/components/today/`.

---

## 0. Diagnóstico honesto (lee esto primero)

**today/ ya está bien optimizado para cold start.** `TodayPage.tsx:104` usa un endpoint bundle `/today` que hace **1 solo RTT** y siembra 11 caches de React Query vía `seedTodayCaches()` (`TodayPage.tsx:19`). Las 3 queries de `use-schedule-data.ts:8` pegan contra esas caches sembradas, no contra la red. Hay skeleton (`TodayPage.tsx:36`).

**Conclusión:** sqlite-wasm **no va a medir una mejora perceptible de performance en today/** en condiciones online. El filtrado en `useScheduleData` es sobre ~15 items — sub-milisegundo.

**Dónde sqlite-wasm sí aporta valor real (la jugada es arquitectónica, no "acelerar today/"):**

| Problema actual | Solución con mirror SQLite |
|---|---|
| Offline = solo gotas/síntomas encolados (`drops-queue.ts`, `symptoms-queue.ts`). Vials, schedule, sueño, medicamentos **no funcionan sin red**. | today/ completo y resto de la app funcionan offline leyendo del mirror local |
| `drops-queue.ts:4` = JSON bajo 1 key de idb-keyval. Cada `queueDrop` lee+escribe el array entero. No consultable. | Tabla `outbox` con índices, consultable, durable |
| Cada screen re-fetcha y re-agrega en JS (dashboard, history) | `SELECT ... GROUP BY day_key` local, sin RTT |
| Schema vive solo en API | **Reutiliza `dry_eye_api/src/db/schema.ts`** vía `drizzle-orm/sqlite-wasm` |
| Cold start = 1 RTT bundle (ya bueno) | 0 RTT tras primera sync — render instantáneo siempre |

**Si el único dolor es "today/ se siente lento al abrir"**, el fix barato es subir `staleTime` del bundle (`TodayPage.tsx:111`, hoy 30s) + confiar en el skeleton. **No** meter sqlite-wasm solo por eso.

**Si el dolor es "quiero la app completa offline-first"**, entonces este plan aplica, y today/ es el primer screen que migras (donde menos se nota) para validar la arquitectura antes de history/dashboard (donde más se nota).

---

## 1. Decisiones de arquitectura

| Decisión | Elección | Por qué |
|---|---|---|
| Lib WASM | `@sqlite.org/sqlite-wasm` | Build oficial, soporta OPFS (sync access), mantenido |
| Driver ORM | `drizzle-orm/sqlite-wasm` | Reutiliza `api/src/db/schema.ts` sin duplicar definiciones de tablas |
| Persistencia | OPFS (sync access handle) | Durable across sessions, acceso síncrono vía worker |
| Modelo de sync | Local-first read + outbox write + pull incremental | Server sigue siendo source of truth; local es cache queryable |
| Resolución de conflictos | Last-write-wins + idempotencia `ON CONFLICT(id) DO UPDATE` (ya existe en API) | Los endpoints ya son idempotentes; no inventar merge semántico |
| Inicio de sesión | Bootstrap full snapshot → luego incremental por `updated_at` cursor | Simple, correcto; optimizar delta-compressed después si hace falta |

---

## 2. Tablas a mirrorear (subset de `dry_eye_api/src/db/schema.ts`)

No todas las tablas de D1 valen la pena en cliente. Excluir auth/sessions/push/errors/calendar-google.

**Incluir (read model del cliente):**

| Tabla schema | Usada por | ¿Índices locales? |
|---|---|---|
| `dy_drop_types` | today, treatments, drops | `user_id` |
| `dy_drops` | today (getToday, lastPerType), history | `drop_type_id, logged_at`, `user_id, logged_at` |
| `dy_vials` | today (active), vials page | `user_id, status` |
| `dy_sleep` | today (sleepToday) | `user_id, day_key` |
| `dy_symptom_entries` | today (symptomsToday), history | `user_id, day_key` |
| `dy_medications` | today, treatments | `user_id, sort_order` |
| `dy_medication_intakes` | today (intakes) | `user_id, logged_at`, `medication_id, logged_at` |
| `dy_check_ins` | today (checkInLast), dashboard, history | `user_id, logged_at` |
| `dy_therapy_sessions` | history, dashboard | `user_id, logged_at` |
| `dy_lid_hygiene` | today (hygiene) | `user_id, day_key` |
| `dy_clinical_observations` | observations | `user_id` |
| `dy_observation_occurrences` | observations, history | `user_id, logged_at` |
| `dy_users` (fila propia) | timezone, theme, font | PK |

**Excluir:** `dy_accounts`, `dy_sessions`, `dy_push_subscriptions`, `dy_calendar_events`, `dy_medication_calendar_events`, `dy_api_errors`, `dy_client_errors`, `dy_hygiene_daily`, `dy_hygiene_stats` (derivadas, se calculan en cliente o server).

**Tablas de cliente-only (no en D1):**

| Tabla | Propósito |
|---|---|
| `_outbox` | Cola de escrituras pendientes (reemplaza `drops-queue.ts` + `symptoms-queue.ts`) |
| `_sync_cursor` | KV-style: `{ table, last_synced_at }` por tabla |
| `_meta` | `user_id`, `schema_version`, `last_full_sync_at` |

---

## 3. Estrategia de sync

### 3.1 Bootstrap (on login / primer load con DB vacío)

```
1. AuthCallbackPage → guardar JWT
2. Disparar sync engine (worker):
   a. GET /sync/snapshot  (nuevo endpoint, ver §6) → todas las tablas del §2 en una response
   b. transaction: DELETE + INSERT masivo en SQLite local (reemplazo completo)
   c. _meta.last_full_sync_at = now
3. React Query lee del mirror local → render instantáneo
```

### 3.2 Incremental pull (background, periódico + on-focus)

```
Por cada tabla T:
  cursor = _sync_cursor[T] ?? last_full_sync_at
  GET /sync/delta?table=T&since=cursor  →  filas con updated_at >= cursor
  UPSERT en SQLite local (ON CONFLICT(id) DO UPDATE)
  _sync_cursor[T] = max(updated_at recibido)
```

**Necesario en API:** todas las tablas del mirror deben tener columna `updated_at` (algunas ya la tienen: observations, occurrences. **Hay que añadirla** a drops, vials, drop_types, sleep, check_ins, etc. — ver §6).

### 3.3 Outbox push (escritura)

```
Write path (ej. quickLog):
  1. INSERT en tabla local (dy_drops) → UI actualiza inmediatamente (React Query invalida)
  2. INSERT en _outbox { id, table, op, payload, created_at }
  3. Background: pop _outbox → POST al endpoint existente
     - éxito → DELETE de _outbox
     - fallo → reintento con backoff; queda en _outbox
  4. Tras push exitoso → no se necesita pull inmediato (la fila local ya está actualizada)
```

**Reemplaza** `drops-queue.ts` y `symptoms-queue.ts`. Unifica todo en una sola outbox.

### 3.4 Conflictos

- **Server es source of truth** en pull: si el server devuelve una fila más nueva, sobreescribe la local.
- **Cliente gana temporalmente** en reads (optimistic). El push la reconcilia.
- `ON CONFLICT(id) DO UPDATE` ya existe en todos los endpoints write → push idempotente, safe to retry.
- **Caso edge:** edición simultánea misma fila en dos dispositivos. Last-write-wins por `updated_at`. Aceptable para app de un solo usuario principal. No sobre-ingeniar CRDTs.

---

## 4. Migración de today/ (fase de validación)

Hoy `use-schedule-data.ts` lee 3 caches sembradas por el bundle. Con el mirror, estas se vuelven SQL local:

```sql
-- getActiveVials  (dropsApi.getActiveVials)
SELECT * FROM dy_vials WHERE user_id = ? AND status = 'active' AND ended_at IS NULL;

-- getLastPerType  (dropsApi.getLastPerType)
SELECT dt.id AS drop_type_id, dt.name, dt.interval_hours, dt.end_date,
       d.logged_at AS last_logged_at
FROM dy_drop_types dt
LEFT JOIN dy_drops d ON d.drop_type_id = dt.id
  AND d.logged_at = (SELECT MAX(logged_at) FROM dy_drops WHERE drop_type_id = dt.id AND user_id = ?)
WHERE dt.user_id = ? AND dt.archived_at IS NULL;

-- getToday  (dropsApi.getToday)
SELECT * FROM dy_drops WHERE user_id = ? AND day_key = ? ORDER BY logged_at DESC;
```

**Cambio en `TodayPage.tsx`:**
- `queryFn` del bundle pasa a leer del mirror local (instantáneo) + disparar sync incremental en background.
- El endpoint `/today` bundle **se mantiene** como fallback/bootstrap, no se borra.
- `use-schedule-data.ts` cambia `queryFn` de `dropsApi.*` a funciones que consultan el mirror.

**`use-quick-log.ts` (write path):**
- `mutationFn` escribe en `dy_drops` local + `_outbox` en vez de `dropsApi.save` directo + `queueDrop`.
- `useOfflineSync` se reemplaza por el sync engine que drena `_outbox`.

**Widget config** (`use-widget-config.ts`): sigue en localStorage — no es dato sincronizado, es preferencia de UI. (Podría moverse a `dy_users.widget_drop_type_ids` que ya existe en schema, pero fuera de scope.)

---

## 5. Arquitectura de archivos propuesta

```
src/lib/offline/
├── db/
│   ├── client.ts          # init sqlite-wasm + OPFS, exporta drizzle instance
│   ├── schema.ts          # re-export de api schema (shared) o copia versionada
│   ├── migrations.ts      # migraciones cliente (CREATE TABLE + índices)
│   └── queries/           # funciones SQL tipadas por dominio
│       ├── drops.ts       # getActiveVials, getLastPerType, getToday, insertDrop
│       ├── vials.ts
│       ├── sleep.ts
│       └── ...
├── sync/
│   ├── engine.ts          # bootstrap, incremental pull, outbox push
│   ├── snapshot.ts        # parse de /sync/snapshot → bulk insert
│   ├── delta.ts           # parse de /sync/delta → upsert
│   └── outbox.ts          # drenar _outbox → endpoints existentes
└── drops-queue.ts         # DEPRECATED → migrar usos a outbox, luego borrar
```

**React Query integration:** un `queryFn` helper que lee del mirror. Las `queryKey` se mantienen idénticas (ej. `dropKeys.today()`) — solo cambia de dónde sale la data. Invalidation tras outbox-push sigue igual.

---

## 6. Cambios necesarios en la API (`dry_eye_api`)

1. **Nuevo endpoint `GET /sync/snapshot`** — devuelve todas las tablas del §2 del usuario en una response JSON. Auth required.
2. **Nuevo endpoint `GET /sync/delta?table=X&since=ISO`** — devuelve filas con `updated_at >= since`. Paginado si hace falta.
3. **Migración `00XX_sync_updated_at.sql`** — añadir `updated_at TEXT` a tablas que no lo tienen:
   - `dy_drop_types`, `dy_drops`, `dy_vials`, `dy_sleep`, `dy_symptom_entries`, `dy_medications`, `dy_medication_intakes`, `dy_check_ins`, `dy_therapy_sessions`, `dy_lid_hygiene`
   - (observations y occurrences ya tienen `updated_at`)
   - Backfill: `UPDATE ... SET updated_at = created_at WHERE updated_at IS NULL` o `= logged_at`.
4. **Endpoints write existentes** — ya son idempotentes (`ON CONFLICT DO UPDATE`). Idealmente setean `updated_at = now` en upsert para que delta-pull los vea. **Verificar** que cada upsert setea `updated_at`.

---

## 7. Fases de implementación

```
Fase 0 — Decisión  →  ¿realmente queremos esto? (ver §0)
  verify: respuesta honesta a "¿el dolor es offline-first o solo today/ lento?"

Fase 1 — Infra SQLite en cliente
  - Instalar @sqlite.org/sqlite-wasm + drizzle-orm
  - db/client.ts: init OPFS, crear tablas + _outbox + _sync_cursor + _meta
  - Worker para acceso síncrono OPFS (sqlite-wasm lo exige)
  verify: test unitario — abrir DB, insertar fila, leerla tras recarga

Fase 2 — API: snapshot + delta + updated_at
  - Migración 00XX (updated_at + backfill)
  - GET /sync/snapshot, GET /sync/delta
  - Revisar upserts setean updated_at
  verify: curl /sync/snapshot devuelve JSON con todas las tablas

Fase 3 — Sync engine (bootstrap + pull)
  - sync/engine.ts: bootstrap on login, pull incremental on focus/interval
  - _sync_cursor por tabla
  verify: login en navegador incógnito → SQLite se llena → hoy abre offline

Fase 4 — Migrar today/ reads al mirror
  - queries/drops.ts (getActiveVials, getLastPerType, getToday)
  - use-schedule-data.ts: queryFn → mirror
  - TodayPage: bundle pasa a ser trigger de sync, no fuente de read
  verify: today/ renderiza instantáneo con red apagada

Fase 5 — Outbox unificado (reemplaza drops-queue + symptoms-queue)
  - sync/outbox.ts
  - use-quick-log.ts escribe en mirror + outbox
  - useOfflineSync → sync engine drena outbox
  - Borrar drops-queue.ts, symptoms-queue.ts
  verify: registrar gota offline → reconectar → aparece en server + history

Fase 6 (opcional) — Migrar history/ y dashboard al mirror
  - Mayor win de performance: agregación SQL local
  - dashboard-screen: Spearman puede correr sobre datos locales
  verify: dashboard abre offline con datos de 90 días
```

---

## 8. Tradeoffs y riesgos

| Riesgo | Mitigación |
|---|---|
| **+~80-120KB WASM** (lazy, pero peso real) | Cargar solo en rutas authed; no en `/login` |
| **OPFS browser support** (Chrome/Edge/Safari 17+/Firefox 111+) | Detectar soporte; fallback a modo "online-only" actual si no hay OPFS. No romper la app. |
| **Sync/conflictos es la parte hard** | Empezar con last-write-wins + idempotencia existente. No construir CRDT. Documentar la asunción. |
| **Duplicación schema cliente/servidor** | Reutilizar `api/src/db/schema.ts` vía shared import o copia versionada. Migraciones cliente separadas. |
| **Complejidad de testing** | Vitest con sqlite-wasm en memoria (no OPFS) para tests unitarios de queries |
| **Bundle `/today` queda obsoleto?** | No borrar. Sirve como bootstrap/fallback. Solo deja de ser la read path. |
| **Borrado de filas (tombstones)** | Delta-pull por `updated_at` no detecta DELETEs. Solución: soft-delete (`archived_at`/`ended_at`) que ya usan drop_types, medications, vials. Para drops/check-ins no hay delete de usuario hoy. **Si se añade delete usuario**, meter tombstones o sync full periódica. |

---

## 9. Cuándo NO hacer esto

- Si el único dolor es performance online de today/ → **no**. Subir `staleTime`, confiar en skeleton. 1 línea.
- Si no hay requisito de offline más allá de gotas/síntomas actuales → **no**. El costo de mantenimiento del sync engine > beneficio.
- Si los pacientes están casi siempre online (móvil con datos) → el ROI es bajo. Confirmar con observación real de uso offline antes de construir.

**Hacerlo solo si:** hay decisión producto de "la app debe funcionar completa offline" (caso clínico: paciente sin datos en consulta médica, de viaje, etc.).

---

## 10. Pregunta abierta para el producto

¿Los pacientes realmente pasan tiempo offline usando la app (no solo registrando una gota puntual)? Si sí → fases 1-5 valen la pena. Si no → el actual drops-queue/symptoms-queue + bundle ya cubre el 80% del valor con 5% del costo. **Recomiendo confirmar esto antes de empezar la Fase 1.**
