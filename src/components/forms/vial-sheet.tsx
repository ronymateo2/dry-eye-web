import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TimerIcon, EyedropperSampleIcon, PlusIcon, CaretDownIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays > 0) return `hace ${diffDays}d`;
  if (diffHr > 0) {
    const remMin = diffMin % 60;
    return remMin > 0 ? `hace ${diffHr}h ${remMin}m` : `hace ${diffHr}h`;
  }
  if (diffMin > 0) return `hace ${diffMin} min`;
  return "ahora";
}

function EmptyState({ label, description, icon, onClick, buttonLabel }: {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  buttonLabel: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-dim)]">
        {icon}
      </div>
      <p className="text-[14px] font-medium text-[var(--text-primary)]">{label}</p>
      <p className="mt-1 text-[12px] text-[var(--text-muted)]">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[#121008] transition-colors hover:bg-[var(--accent-bright)]"
      >
        <PlusIcon size={14} weight="bold" />
        {buttonLabel}
      </button>
    </div>
  );
}

export function VialSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDropType, setSelectedDropType] = useState<string>("");
  const [selectedDropId, setSelectedDropId] = useState<string | null>(null);

  const { data: dropTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["drop-types"],
    queryFn: api.getDropTypes,
  });

  const vialTypes = useMemo(() => dropTypes.filter((dt) => dt.is_vial), [dropTypes]);
  const selectedTypeInfo = useMemo(() => vialTypes.find((dt) => dt.id === selectedDropType), [vialTypes, selectedDropType]);

  const hours = selectedTypeInfo?.vial_duration ?? 24;

  const { data: recentDrops = [], isLoading: dropsLoading } = useQuery({
    queryKey: ["drops/recent", selectedDropType, hours],
    queryFn: () => api.getRecentDrops(selectedDropType, hours),
    enabled: !!selectedDropType,
  });

  const { data: activeVials = [] } = useQuery({
    queryKey: ["vials/active"],
    queryFn: api.getActiveVials,
  });

  const activeVialForType = useMemo(() => activeVials.find((v) => v.drop_type_id === selectedDropType), [activeVials, selectedDropType]);

  const vialStatus = useMemo(() => {
    if (!activeVialForType) return null;
    const durationMs = (activeVialForType.vial_duration ?? 24) * 3_600_000;
    const expiresAt = new Date(activeVialForType.started_at).getTime() + durationMs;
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) return { kind: "expired" as const };
    const hrs = Math.floor(remainingMs / 3_600_000);
    const mins = Math.floor((remainingMs % 3_600_000) / 60_000);
    return { kind: "active" as const, remaining: `${hrs}h ${mins}m` };
  }, [activeVialForType]);

  const createVialMutation = useMutation({
    mutationFn: api.createVial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vials/active"] });
      queryClient.invalidateQueries({ queryKey: ["drops/recent"] });
      queryClient.invalidateQueries({ queryKey: ["drops/last"] });
      toast.success("Vial abierto.");
      onClose();
    },
    onError: () => toast.error("No se pudo abrir el vial."),
  });



  const handleOpenVial = () => {
    if (!selectedDropType || !selectedDropId) return;
    const drop = recentDrops.find((d) => d.id === selectedDropId);
    if (!drop) return;
    createVialMutation.mutate({
      id: crypto.randomUUID(),
      dropTypeId: selectedDropType,
      startedAt: drop.logged_at,
      dropId: drop.id,
    });
  };

  const handleOpenDropSheet = () => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("quickactions:open", { detail: { sheet: "drop" } }));
    }, 300);
  };

  if (typesLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[48px] w-full rounded-[10px]" />
        <Skeleton className="h-[52px] w-full rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
      <div className="space-y-2">
        <p className="section-label mb-0">Tipo de gota</p>
        {vialTypes.length === 0 ? (
          <EmptyState
            label="No tienes viales configurados"
            description="Marca un tipo de gota como 'vial desechable' en Tratamientos."
            icon={<EyedropperSampleIcon size={20} className="text-[var(--accent)]" />}
            onClick={() => { onClose(); navigate("/treatments"); }}
            buttonLabel="Ir a Tratamientos"
          />
        ) : (
          <div className="relative">
            <select
              value={selectedDropType}
              onChange={(e) => { setSelectedDropType(e.target.value); setSelectedDropId(null); }}
              className="min-h-[48px] w-full appearance-none rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 pr-10 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="" disabled>Seleccionar tipo de gota</option>
              {vialTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>{dt.name}</option>
              ))}
            </select>
            <CaretDownIcon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          </div>
        )}
      </div>

      {selectedDropType && vialStatus && (
        <div className="rounded-[10px] border px-3 py-2.5" style={{ background: "var(--surface-el)", borderColor: "var(--border)" }}>
          {vialStatus.kind === "active" ? (
            <div className="flex items-center gap-2">
              <TimerIcon size={14} style={{ color: "var(--warning)" }} />
              <span className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
                Se descartará el vial actual (expira en {vialStatus.remaining})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <TimerIcon size={14} style={{ color: "var(--warning)" }} />
              <span className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
                El vial actual está vencido
              </span>
            </div>
          )}
        </div>
      )}

      {selectedDropType && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="section-label mb-0">Gotas recientes</p>
            <span className="text-[11px] font-medium text-[var(--text-faint)]">Últimas {hours}h</span>
          </div>

          {dropsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-[10px]" />
              ))}
            </div>
          ) : recentDrops.length === 0 ? (
            <EmptyState
              label="No hay gotas recientes"
              description={`No hay gotas de ${selectedTypeInfo?.name} en las últimas ${hours}h sin vial asociado.`}
              icon={<EyedropperSampleIcon size={20} className="text-[var(--accent)]" />}
              onClick={handleOpenDropSheet}
              buttonLabel="Registrar gota"
            />
          ) : (
            <div className="space-y-1.5">
              {recentDrops.map((drop) => {
                const isSelected = selectedDropId === drop.id;
                const eyeLabel = drop.eye === "left" ? "Izq" : drop.eye === "right" ? "Der" : "Ambos";
                return (
                  <button
                    key={drop.id}
                    type="button"
                    onClick={() => setSelectedDropId(drop.id)}
                    className={cn(
                      "flex w-full min-h-[48px] items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors",
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--surface)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-el)]",
                    )}
                  >
                    <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", isSelected ? "border-[var(--accent)]" : "border-[var(--border)]")}>
                      {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[13px] font-medium", isSelected ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
                        {timeAgo(drop.logged_at)}
                      </p>
                      <p className="text-[12px] text-[var(--text-faint)]">
                        {eyeLabel} · {drop.quantity} {drop.quantity === 1 ? "gota" : "gotas"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedDropType && recentDrops.length > 0 && (
        <Button
          className="w-full shadow-[0_10px_24px_var(--fab-shadow)]"
          disabled={!selectedDropId || createVialMutation.isPending}
          type="button"
          onClick={handleOpenVial}
        >
          {createVialMutation.isPending ? "Abriendo..." : "Abrir vial"}
        </Button>
      )}
    </div>
  );
}
