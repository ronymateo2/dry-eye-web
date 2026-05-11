import { useState } from "react";
import { NotePencilIcon, PlusIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OBS_EYE_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { ObservationEye } from "@/types/domain";

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

function SkeletonRow() {
  return (
    <div className="flex min-h-[64px] w-full items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function ObservationsListSheet({ onSelectObservation, onCreateNew }: Props) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const isSearching = submittedQuery.length > 0;

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

  const handleSearch = () => {
    const q = query.trim();
    setSubmittedQuery(q);
  };

  const handleClear = () => {
    setQuery("");
    setSubmittedQuery("");
  };

  return (
    <>
      <div className="space-y-3 pb-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        >
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              className={cn(
                "w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-4 py-2.5",
                "text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:border-[var(--accent)]"
              )}
              placeholder="Buscar observaciones..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim() === "") handleClear();
              }}
            />
          </div>
          <button
            type="submit"
            className={cn(
              "shrink-0 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4",
              "text-[14px] font-medium text-[var(--text-primary)]",
              "transition duration-[120ms] ease-out active:scale-[0.97]",
              "focus:outline-none focus:border-[var(--accent)]"
            )}
          >
            Buscar
          </button>
        </form>

        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : isError ? (
          <p className="text-center text-[13px] text-[var(--pain-high)]">Error al cargar observaciones.</p>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <NotePencilIcon size={32} className="text-[var(--text-muted)]" />
            <p className="text-[14px] text-[var(--text-muted)]">
              {isSearching ? "Sin resultados." : "No tienes observaciones creadas.\nCrea una para comenzar a registrar ocurrencias."}
            </p>
          </div>
        ) : (
          displayed.map((obs) => (
            <button
              key={obs.id}
              type="button"
              className={cn(
                "flex min-h-[64px] w-full items-center gap-3 rounded-[14px]",
                "border border-[var(--border)] bg-[var(--surface)] px-4 py-3",
                "text-left transition duration-[120ms] ease-out active:scale-[0.97]"
              )}
              onClick={() => onSelectObservation(obs)}
            >
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-[var(--text-primary)]">
                    {obs.title}
                  </span>
                  <EyePill eye={obs.eye} />
                </div>
                <span className="text-[12px] text-[var(--text-muted)]">
                  {obs.last_logged_at ? timeAgo(obs.last_logged_at) : "Sin registros"}
                </span>
              </div>
            </button>
          ))
        )}
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
