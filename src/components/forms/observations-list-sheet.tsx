import { useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NotePencilIcon, PlusIcon, MagnifyingGlassIcon, XIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OBS_EYE_LABELS, OBS_BODY_ZONE_LABELS, OBS_CATEGORY_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { ObservationEye, PropertyDef, PropertyValue, ObservationRecord, LastOccurrenceSnippet } from "@/types/domain";

const SPRING = { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.75 };
const EASE_OUT = { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const };

type MatchedNote = { note: string; logged_at: string };
type Obs = ObservationRecord & { matched_notes?: MatchedNote[] | null };

type Props = {
  onSelectObservation: (obs: Obs) => void;
  onEditObservation?: (obs: Obs) => void;
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

function renderOccurrenceSnippet(
  occ: LastOccurrenceSnippet,
  schema: PropertyDef[] | null,
  index: number,
) {
  const parts: string[] = [];
  if (occ.intensity != null) parts.push(`${occ.intensity}/10`);
  if (occ.notes) {
    parts.push(`"${occ.notes.length > 50 ? occ.notes.slice(0, 50) + "…" : occ.notes}"`);
  } else if (occ.field_values && schema && schema.length > 0) {
    const chip = renderFieldValueSnippet(occ.field_values, schema);
    if (chip) parts.push(chip);
  }
  if (parts.length === 0) return null;
  return (
    <span
      key={index}
      className="block truncate text-[12px] text-[var(--text-faint)]"
      style={{ opacity: 1 - index * 0.25 }}
    >
      {parts.join(" · ")}
    </span>
  );
}

function renderFieldValueSnippet(
  fieldValues: Record<string, PropertyValue>,
  schema: PropertyDef[]
): string {
  const parts: string[] = [];
  for (const def of schema) {
    const v = fieldValues[def.key];
    if (v === undefined || v === null || v === "") continue;
    if (def.type === "boolean") parts.push(`${def.label}: ${v ? "Sí" : "No"}`);
    else if (def.type === "scale") parts.push(`${def.label}: ${v}/10`);
    else if (def.type === "select") {
      const opt = def.options.find((o) => o.value === v);
      parts.push(`${def.label}: ${opt?.label ?? String(v)}`);
    }
    if (parts.length >= 3) break;
  }
  return parts.join(" · ");
}

function CategoryPill({ category }: { category?: string | null }) {
  if (!category) return null;
  return (
    <span className="rounded-full bg-[var(--accent-dim)] px-2 py-0.5 text-[11px] text-[var(--accent)]">
      {OBS_CATEGORY_LABELS[category]}
    </span>
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

function ObsRow({ obs, index, isSearching, submittedQuery, onSelect, onEdit }: {
  obs: Obs;
  index: number;
  isSearching: boolean;
  submittedQuery: string;
  onSelect: (obs: Obs) => void;
  onEdit?: (obs: Obs) => void;
}) {
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ ...SPRING, delay: index * 0.035 }}
      whileTap={{ scale: 0.975 }}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-[14px]",
        "border border-[var(--border)] bg-[var(--surface)] px-4 py-3",
        "text-left"
      )}
      onClick={() => onSelect(obs)}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span className="text-[15px] font-medium leading-snug text-[var(--text-primary)] break-words min-w-0">
          {obs.title}
        </span>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {obs.occurrence_count > 0 && (
            <span className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--text-faint)]">
              {obs.occurrence_count}
            </span>
          )}
          {onEdit && (
            <button
              type="button"
              aria-label={`Editar ${obs.title}`}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-faint)] active:opacity-60"
              onClick={(e) => { e.stopPropagation(); onEdit(obs); }}
            >
              <PencilSimpleIcon size={14} />
            </button>
          )}
        </div>
      </div>
      {(obs.body_zone || obs.eye !== "none" || obs.category) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <ZonePill bodyZone={obs.body_zone} bodyZoneCustom={obs.body_zone_custom} eye={obs.eye} />
          <CategoryPill category={obs.category} />
        </div>
      )}
      {/* Snippets: last N occurrences — note → field chips → nothing per occurrence */}
      {!isSearching && obs.last_occurrences.length > 0 && (
        <div className="space-y-0.5">
          {obs.last_occurrences.map((occ, i) =>
            renderOccurrenceSnippet(occ, obs.properties_schema, i)
          )}
        </div>
      )}
      <span className="text-[12px] text-[var(--text-muted)]">
        {obs.last_logged_at ? timeAgo(obs.last_logged_at) : "Sin registros"}
      </span>
      {isSearching && obs.matched_notes && obs.matched_notes.length > 0 && (
        <div className="mt-0.5 space-y-1.5">
          {obs.matched_notes.map((entry, ni) => (
            <div key={ni} className="border-l-2 border-[var(--accent)]/35 pl-2.5">
              <span className="mb-0.5 block text-[11px] text-[var(--accent)]/70">
                {formatMatchedAt(entry.logged_at)}
              </span>
              <span className="line-clamp-2 text-[12px] leading-relaxed text-[var(--text-faint)]">
                {highlightMatch(entry.note, submittedQuery)}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.button>
  );
}

export function ObservationsListSheet({ onSelectObservation, onEditObservation, onCreateNew }: Props) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSearching = submittedQuery.length > 0;
  const showCancel = isFocused || query.length > 0;

  const { data: observations = [], isLoading, isError } = useQuery({
    queryKey: ["observations"],
    queryFn: api.getObservations,
  });

  const { data: searchResults = [], isFetching: isSearchFetching } = useQuery({
    queryKey: ["observations", "search", submittedQuery],
    queryFn: () => api.searchObservations(submittedQuery),
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
            {/* Magnifying glass icon */}
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

            {/* Clear × button */}
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

          {/* Cancelar button — slides in from right on focus */}
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

        {/* Search status tag */}
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
          ) : (
            <motion.div key={`list-${submittedQuery}`} className="space-y-2">
              {/* Recientes — top 3 with prior occurrences, shown when not searching */}
              {!isSearching && (() => {
                const recientes = displayed.filter((o) => o.last_logged_at !== null).slice(0, 3);
                if (recientes.length === 0) return null;
                return (
                  <>
                    <p className="px-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
                      Recientes
                    </p>
                    {recientes.map((obs, i) => (
                      <ObsRow key={obs.id} obs={obs} index={i} isSearching={false} submittedQuery="" onSelect={onSelectObservation} onEdit={onEditObservation} />
                    ))}
                    {displayed.length > recientes.length && (
                      <p className="px-0.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
                        Todas
                      </p>
                    )}
                  </>
                );
              })()}
              {displayed.map((obs, i) => (
                <ObsRow key={obs.id} obs={obs} index={i} isSearching={isSearching} submittedQuery={submittedQuery} onSelect={onSelectObservation} onEdit={onEditObservation} />
              ))}
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
