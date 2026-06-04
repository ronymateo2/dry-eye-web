import { useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  NotePencilIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XIcon,
  SparkleIcon,
  LightningIcon,
  WrenchIcon,
  CloudIcon,
  PersonSimpleIcon,
  FileTextIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OBS_EYE_LABELS, OBS_BODY_ZONE_LABELS, OBS_CATEGORY_LABELS } from "@/lib/constants";
import { observationsApi, observationKeys } from "@/features/observations";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatPropertyValue } from "@/lib/observations";
import type { ObservationEye, PropertyDef, PropertyValue, ObservationRecord } from "@/types/domain";

const SPRING = { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.75 };
const EASE_OUT = { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const };

type MatchedNote = { note: string | null; logged_at: string; property_values: string | null };
type Obs = ObservationRecord & { matched_notes?: MatchedNote[] | null };

type Props = {
  onSelectObservation: (obs: Obs) => void;
  onLogNew: (obs: Obs) => void;
  onCreateNew: () => void;
};

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

function highlightMatch(text: string, query: string) {
  const words = query
    .replace(/["*^()]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part)
      ? <mark key={i} className="bg-transparent font-semibold text-[var(--accent)]">{part}</mark>
      : part,
  );
}

function CategoryIcon({ category, size = 14 }: { category?: string | null; size?: number }) {
  const cls = "shrink-0 text-[var(--text-faint)]";
  switch (category) {
    case "sensory": return <SparkleIcon size={size} className={cls} />;
    case "pain": return <LightningIcon size={size} className={cls} />;
    case "functional": return <WrenchIcon size={size} className={cls} />;
    case "environmental": return <CloudIcon size={size} className={cls} />;
    case "postural": return <PersonSimpleIcon size={size} className={cls} />;
    default: return <FileTextIcon size={size} className={cls} />;
  }
}

function matchedPropSnippet(
  propertyValuesJson: string | null,
  schema: PropertyDef[] | null,
  query: string
): string | null {
  if (!propertyValuesJson || !schema) return null;
  let vals: Record<string, PropertyValue>;
  try { vals = JSON.parse(propertyValuesJson); } catch { return null; }
  const q = query.toLowerCase();
  const parts: string[] = [];
  for (const def of schema) {
    const v = vals[def.key];
    if (v === undefined || v === null || v === "") continue;
    const display = formatPropertyValue(def, v);
    const matches = def.label.toLowerCase().includes(q) || display.toLowerCase().includes(q);
    if (matches) parts.push(`${def.label}: ${display}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ZonePill({ bodyZone, bodyZoneCustom, eye }: { bodyZone?: string | null; bodyZoneCustom?: string | null; eye: string }) {
  const label = bodyZone
    ? (bodyZone === "other" && bodyZoneCustom ? bodyZoneCustom : OBS_BODY_ZONE_LABELS[bodyZone])
    : eye !== "none"
      ? OBS_EYE_LABELS[eye as ObservationEye]
      : null;
  if (!label) return null;
  return (
    <span className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
      {label}
    </span>
  );
}

const PROP_TYPE_LABELS: Record<string, string> = {
  scale: "Escala",
  boolean: "Sí/No",
  select: "Opciones",
  text: "Texto",
  number: "Número",
};

function SchemaPills({ schema }: { schema: PropertyDef[] }) {
  if (schema.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {schema.slice(0, 4).map((def, i) => (
        <span
          key={i}
          className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-faint)]"
        >
          {def.label || PROP_TYPE_LABELS[def.type]}
        </span>
      ))}
      {schema.length > 4 && (
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-faint)]">
          +{schema.length - 4}
        </span>
      )}
    </div>
  );
}


function SkeletonRow({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...EASE_OUT, delay }}
      className="flex min-h-[64px] w-full items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
    >
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </motion.div>
  );
}

function formatMatchedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ObsRow({ obs, index, isSearching, submittedQuery, onSelect, onLogNew }: {
  obs: Obs;
  index: number;
  isSearching: boolean;
  submittedQuery: string;
  onSelect: (obs: Obs) => void;
  onLogNew: (obs: Obs) => void;
}) {
  const hasOccurrences = obs.occurrence_count > 0;
  const schema = obs.properties_schema ?? [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ ...SPRING, delay: index * 0.035 }}
      className={cn(
        "flex w-full gap-3 rounded-[14px]",
        "border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3"
      )}
    >
      {/* Page icon — tappable: open detail */}
      <button
        type="button"
        aria-label={`Ver registros de ${obs.title}`}
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface-el)] active:opacity-60"
        onClick={() => onSelect(obs)}
      >
        <CategoryIcon category={obs.category} size={14} />
      </button>

      {/* Content — tap to open detail */}
      <button
        type="button"
        className="min-w-0 flex-1 text-left active:opacity-70"
        onClick={() => onSelect(obs)}
      >
        <div className="flex items-start gap-2">
          <span className="text-[15px] font-medium leading-snug text-[var(--text-primary)] break-words min-w-0">
            {obs.title}
          </span>
        </div>

        {/* Zone + category pills */}
        {(obs.body_zone || obs.eye !== "none" || obs.category) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <ZonePill bodyZone={obs.body_zone} bodyZoneCustom={obs.body_zone_custom} eye={obs.eye} />
            {obs.category && (
              <span className="rounded-full bg-[var(--accent-dim)] px-2 py-0.5 text-[11px] text-[var(--accent)]">
                {OBS_CATEGORY_LABELS[obs.category]}
              </span>
            )}
          </div>
        )}

        {/* Schema preview when no occurrences */}
        {!hasOccurrences && schema.length > 0 && !isSearching && (
          <div className="mt-1.5">
            <SchemaPills schema={schema} />
          </div>
        )}

        {/* Status line — browse only */}
        {!isSearching && (
          <span className="mt-1 block text-[12px] text-[var(--text-muted)]">
            {hasOccurrences
              ? `${obs.occurrence_count} registro${obs.occurrence_count !== 1 ? "s" : ""} · ${timeAgo(obs.last_logged_at!)}`
              : "Sin registros"}
          </span>
        )}

        {/* Search matched notes */}
        {isSearching && obs.matched_notes && obs.matched_notes.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {obs.matched_notes.map((entry, ni) => {
              const propSnippet = matchedPropSnippet(entry.property_values, obs.properties_schema, submittedQuery);
              return (
                <div key={ni} className="border-l-2 border-[var(--accent)]/35 pl-2.5">
                  <span className="mb-0.5 block text-[11px] text-[var(--accent)]/70">
                    {formatMatchedAt(entry.logged_at)}
                  </span>
                  {propSnippet && (
                    <span className="line-clamp-2 text-[12px] leading-relaxed text-[var(--text-faint)]">
                      {highlightMatch(propSnippet, submittedQuery)}
                    </span>
                  )}
                  {entry.note && !propSnippet && (
                    <span className="line-clamp-2 text-[12px] leading-relaxed text-[var(--text-faint)]">
                      {highlightMatch(entry.note, submittedQuery)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Compact count in search mode */}
        {isSearching && (
          <span className="mt-1.5 block text-[11px] text-[var(--text-faint)]">
            {obs.occurrence_count} registro{obs.occurrence_count !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {/* + button — log new occurrence directly */}
      <button
        type="button"
        aria-label={`Nueva ocurrencia de ${obs.title}`}
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-el)] text-[var(--text-faint)] active:opacity-60"
        onClick={() => onLogNew(obs)}
      >
        <PlusIcon size={14} />
      </button>
    </motion.div>
  );
}

const CATEGORY_ORDER = ["sensory", "pain", "functional", "environmental", "postural", null] as const;

function CategorySection({
  category,
  items,
  startIndex,
  isSearching,
  submittedQuery,
  onSelect,
  onLogNew,
}: {
  category: string | null;
  items: Obs[];
  startIndex: number;
  isSearching: boolean;
  submittedQuery: string;
  onSelect: (obs: Obs) => void;
  onLogNew: (obs: Obs) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const label = category ? OBS_CATEGORY_LABELS[category] : "Sin categoría";

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-0.5 active:opacity-70"
        onClick={() => setCollapsed((c) => !c)}
      >
        <motion.span
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center"
        >
          <CaretRightIcon size={10} className="text-[var(--text-faint)]" weight="bold" style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(90deg)" }} />
        </motion.span>
        <CategoryIcon category={category} size={11} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
          {label}
        </span>
        <span className="ml-auto text-[11px] text-[var(--text-faint)]">{items.length}</span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pl-1">
              {items.map((obs, i) => (
                <ObsRow
                  key={obs.id}
                  obs={obs}
                  index={startIndex + i}
                  isSearching={isSearching}
                  submittedQuery={submittedQuery}
                  onSelect={onSelect}
                  onLogNew={onLogNew}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ObservationsListSheet({ onSelectObservation, onLogNew, onCreateNew }: Props) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSearching = submittedQuery.length > 0;
  const showCancel = isFocused || query.length > 0;

  const { data: observations = [], isLoading, isError } = useQuery({
    queryKey: observationKeys.list(),
    queryFn: observationsApi.getList,
  });

  const { data: searchResults = [], isFetching: isSearchFetching } = useQuery({
    queryKey: observationKeys.search(submittedQuery),
    queryFn: () => observationsApi.search(submittedQuery),
    enabled: isSearching,
  });

  const displayed: Obs[] = isSearching ? searchResults : observations;
  const loading = isSearching ? isSearchFetching : isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSubmittedQuery(q);
    inputRef.current?.blur();
  };

  const handleCancel = () => {
    setQuery("");
    setSubmittedQuery("");
    inputRef.current?.blur();
  };

  const handleClearInput = () => {
    setQuery("");
    setSubmittedQuery("");
    inputRef.current?.focus();
  };

  // Group by category for browse mode
  const recientes = !isSearching
    ? observations.filter((o) => o.last_logged_at !== null).slice(0, 3)
    : [];

  const grouped: Map<string | null, Obs[]> = new Map();
  if (!isSearching) {
    for (const cat of CATEGORY_ORDER) {
      const items = observations.filter((o) => (o.category ?? null) === cat);
      if (items.length > 0) grouped.set(cat, items);
    }
  }

  return (
    <>
      <div className="space-y-3 pb-4">

        {/* iOS-style search bar */}
        <div className="flex items-center gap-0">
          <motion.form
            layout
            layoutRoot
            className="relative min-w-0 flex-1"
            onSubmit={handleSubmit}
            transition={SPRING}
          >
            <motion.span
              layout
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              transition={SPRING}
            >
              <MagnifyingGlassIcon
                size={15}
                weight="bold"
                className="text-[var(--text-faint)]"
              />
            </motion.span>

            <input
              ref={inputRef}
              className={cn(
                "h-[36px] w-full rounded-[10px] bg-[var(--surface-el)]",
                "pl-[34px] pr-9 text-[15px] text-[var(--text-primary)]",
                "placeholder:text-[var(--text-faint)]",
                "outline-none transition-shadow duration-150",
                "focus:ring-1 focus:ring-[var(--accent)]/40 focus:ring-inset"
              )}
              placeholder="Buscar"
              value={query}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value === "") setSubmittedQuery("");
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />

            <AnimatePresence>
              {query.length > 0 && (
                <motion.button
                  key="clear"
                  type="button"
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--text-faint)]"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
                  onClick={handleClearInput}
                >
                  <XIcon size={10} weight="bold" className="text-[var(--bg)]" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.form>

          <AnimatePresence>
            {showCancel && (
              <motion.button
                key="cancel"
                type="button"
                className="shrink-0 whitespace-nowrap pl-3 text-[15px] font-medium text-[var(--accent)] active:opacity-60"
                initial={{ opacity: 0, x: 28, width: 0, paddingLeft: 0 }}
                animate={{ opacity: 1, x: 0, width: "auto", paddingLeft: 12 }}
                exit={{ opacity: 0, x: 28, width: 0, paddingLeft: 0 }}
                transition={SPRING}
                onClick={handleCancel}
              >
                Cancelar
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Search status */}
        <AnimatePresence>
          {isSearching && !loading && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={EASE_OUT}
              className="px-0.5 text-[12px] text-[var(--text-faint)]"
            >
              {displayed.length > 0
                ? `${displayed.length} resultado${displayed.length !== 1 ? "s" : ""} para "${submittedQuery}"`
                : `Sin resultados para "${submittedQuery}"`}
            </motion.p>
          )}
        </AnimatePresence>

        {/* List */}
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.div key="skeletons" className="space-y-2.5">
              <SkeletonRow delay={0} />
              <SkeletonRow delay={0.04} />
              <SkeletonRow delay={0.08} />
            </motion.div>
          ) : isError ? (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-2 text-center text-[13px] text-[var(--pain-high)]"
            >
              Error al cargar observaciones.
            </motion.p>
          ) : displayed.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={EASE_OUT}
              className="flex flex-col items-center gap-3 py-10 text-center"
            >
              <NotePencilIcon size={30} className="text-[var(--text-faint)]" />
              <p className="text-[14px] leading-snug text-[var(--text-muted)]">
                {isSearching
                  ? "Sin resultados."
                  : "No tienes observaciones creadas.\nCrea una para comenzar a registrar ocurrencias."}
              </p>
            </motion.div>
          ) : isSearching ? (
            /* Search results — flat list */
            <motion.div key={`search-${submittedQuery}`} className="space-y-2">
              {displayed.map((obs, i) => (
                <ObsRow
                  key={obs.id}
                  obs={obs}
                  index={i}
                  isSearching={true}
                  submittedQuery={submittedQuery}
                  onSelect={onSelectObservation}
                  onLogNew={onLogNew}
                />
              ))}
            </motion.div>
          ) : (
            /* Browse mode — recientes + grouped by category */
            <motion.div key="browse" className="space-y-4">
              {/* Recientes */}
              {recientes.length > 0 && (
                <div className="space-y-2">
                  <p className="px-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
                    Recientes
                  </p>
                  {recientes.map((obs, i) => (
                    <ObsRow
                      key={obs.id}
                      obs={obs}
                      index={i}
                      isSearching={false}
                      submittedQuery=""
                      onSelect={onSelectObservation}
                      onLogNew={onLogNew}
                    />
                  ))}
                </div>
              )}

              {/* Category groups */}
              {grouped.size > 0 && (
                <div className="space-y-4">
                  {recientes.length > 0 && (
                    <div className="h-px bg-[var(--border)]" />
                  )}
                  {Array.from(grouped.entries()).map(([cat, items], gi) => (
                    <CategorySection
                      key={cat ?? "__none__"}
                      category={cat}
                      items={items}
                      startIndex={gi * 3}
                      isSearching={false}
                      submittedQuery=""
                      onSelect={onSelectObservation}
                      onLogNew={onLogNew}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="sticky bottom-0 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3"
        style={{ background: "linear-gradient(to top, var(--bg) 60%, transparent)" }}
      >
        <Button className="w-full gap-2" type="button" onClick={onCreateNew}>
          <PlusIcon size={18} />
          Nueva observacion
        </Button>
      </div>
    </>
  );
}
