import { useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NotePencilIcon, PlusIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OBS_EYE_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { ObservationEye } from "@/types/domain";

const SPRING = { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.75 };
const EASE_OUT = { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const };

type Obs = { id: string; title: string; eye: string; last_logged_at: string | null; occurrence_count: number };

type Props = {
  onSelectObservation: (obs: Obs) => void;
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

function EyePill({ eye }: { eye: string }) {
  if (eye === "none") return null;
  return (
    <span className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
      {OBS_EYE_LABELS[eye as ObservationEye]}
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

export function ObservationsListSheet({ onSelectObservation, onCreateNew }: Props) {
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

  const displayed = isSearching ? searchResults : observations;
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
              {displayed.map((obs, i) => (
                <motion.button
                  key={obs.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ ...SPRING, delay: i * 0.035 }}
                  whileTap={{ scale: 0.975 }}
                  className={cn(
                    "flex min-h-[64px] w-full items-center gap-3 rounded-[14px]",
                    "border border-[var(--border)] bg-[var(--surface)] px-4 py-3",
                    "text-left"
                  )}
                  onClick={() => onSelectObservation(obs)}
                >
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-[15px] font-medium text-[var(--text-primary)]">
                        {obs.title}
                      </span>
                      <EyePill eye={obs.eye} />
                    </div>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {obs.last_logged_at ? timeAgo(obs.last_logged_at) : "Sin registros"}
                    </span>
                  </div>

                  {obs.occurrence_count > 0 && (
                    <span className="shrink-0 rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--text-faint)]">
                      {obs.occurrence_count}
                    </span>
                  )}
                </motion.button>
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
