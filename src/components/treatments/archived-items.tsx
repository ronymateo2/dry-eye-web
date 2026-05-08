import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ArchiveIcon, ArrowUUpLeftIcon } from "@phosphor-icons/react";

export function ArchivedItems({
  label,
  queryKey,
  archivedQueryKey,
  fetchArchived,
  unarchive,
  renderItem,
}: {
  label: string;
  queryKey: string[];
  archivedQueryKey: string[];
  fetchArchived: () => Promise<{ id: string; name: string; archived_at: string }[]>;
  unarchive: (id: string) => Promise<{ ok: boolean }>;
  renderItem: (item: { id: string; name: string; archived_at: string }) => React.ReactNode;
}) {
  const qc = useQueryClient();
  const { data: archived = [], isLoading } = useQuery({
    queryKey: archivedQueryKey,
    queryFn: fetchArchived,
  });
  const [expanded, setExpanded] = useState(false);

  const unarchiveMutation = useMutation({
    mutationFn: unarchive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: archivedQueryKey });
      toast.success(`${label} desarchivad${label === "Gota" ? "a" : "o"}.`);
    },
    onError: () => toast.error("No se pudo desarchivar."),
  });

  if (archived.length === 0 && !isLoading) return null;

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 py-2 text-[13px] font-medium text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
      >
        <ArchiveIcon size={14} />
        <span>{label === "Gota" ? "Gotas" : "Medicamentos"} archivados ({archived.length})</span>
        <span
          className="ml-auto transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ↓
        </span>
      </button>
      {expanded && (
        isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-[12px]" />)}
          </div>
        ) : (
          <ul className="overflow-hidden rounded-[12px] border border-dashed border-[var(--border)] mt-1">
            {archived.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 border-b border-[var(--border)] last:border-b-0 px-4 py-3 opacity-70"
              >
                <div className="flex-1 min-w-0">
                  {renderItem(item)}
                </div>
                <button
                  type="button"
                  onClick={() => unarchiveMutation.mutate(item.id)}
                  disabled={unarchiveMutation.isPending}
                  aria-label={`Desarchivar ${item.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--accent)] opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40"
                >
                  <ArrowUUpLeftIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
