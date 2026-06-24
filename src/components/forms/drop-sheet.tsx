import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusBanner } from "@/components/ui/status-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { ClockIcon, EyedropperIcon, TimerIcon, TrashIcon, WarningIcon, CaretDownIcon } from "@phosphor-icons/react";
import { DROP_EYES } from "@/lib/constants";
import { dropsApi, dropKeys, dropTypeKeys, vialKeys, useInvalidateDrops } from "@/features/drops";
import { calendarApi } from "@/features/calendar";
import { useUser } from "@/lib/auth";
import { getDayKey } from "@/lib/utils";
import { queueDrop } from "@/lib/offline/drops-queue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActionState, DropEye } from "@/types/domain";

export function DropSheet({
  onSaved,
  initialDropTypeId,
  editDrop,
}: {
  onSaved: () => void;
  initialDropTypeId?: string;
  editDrop?: { id: string; loggedAt: string; eye: DropEye; quantity: number; dropTypeId: string };
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const invalidateDrops = useInvalidateDrops();
  const user = useUser();
  const { data: dropTypes = [], isLoading } = useQuery({ queryKey: dropTypeKeys.list(), queryFn: dropsApi.getTypes });
  const [selectedDropType, setSelectedDropType] = useState<string>(editDrop?.dropTypeId ?? "");
  const [quantity, setQuantity] = useState(editDrop?.quantity ?? 1);
  const [eye, setEye] = useState<DropEye>(editDrop?.eye ?? "left");
  const [loggedAt, setLoggedAt] = useState<string | null>(editDrop?.loggedAt ?? new Date().toISOString());
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [isPending, setIsPending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const { data: lastDrop, isLoading: lastDropLoading } = useQuery({
    queryKey: dropKeys.last(),
    queryFn: dropsApi.getLast,
    staleTime: 0,
  });

  const { data: activeVials = [] } = useQuery({
    queryKey: vialKeys.active(),
    queryFn: dropsApi.getActiveVials,
  });

  const discardVialMutation = useMutation({
    mutationFn: (id: string) => dropsApi.discardVial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vialKeys.active() });
      setShowDiscardConfirm(false);
    },
    onError: () => {
      setShowDiscardConfirm(false);
    },
  });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  useEffect(() => {
    if (dropTypes.length > 0 && !selectedDropType) {
      setSelectedDropType(initialDropTypeId ?? dropTypes[0].id);
    }
  }, [dropTypes, selectedDropType, initialDropTypeId]);

  const handleSave = async () => {
    if (!selectedDropType) {
      setState({ status: "error", message: "Selecciona un tipo de gota." });
      return;
    }

    setIsPending(true);
    const dropId = editDrop?.id ?? crypto.randomUUID();
    const ts = loggedAt ? new Date(loggedAt).toISOString() : new Date().toISOString();
    const dropTypeName = dropTypes.find((dt) => dt.id === selectedDropType)?.name ?? "";

    if (!isOnline) {
      await queueDrop({ id: dropId, dropTypeId: selectedDropType, loggedAt: ts, quantity, eye });
      queryClient.setQueryData(dropKeys.last(), { id: dropId, logged_at: ts, quantity, eye, drop_type_id: selectedDropType, drop_type_name: dropTypeName });
      toast.success("Gota en cola — se sincronizará al reconectar.");
      setIsPending(false);
      onSaved();
      return;
    }

    try {
      await dropsApi.save({ id: dropId, dropTypeId: selectedDropType, loggedAt: ts, quantity, eye });
      toast.success(editDrop ? "Gota actualizada." : "Gota registrada.");

      if (!editDrop && vialStatus?.kind === "new" && selectedDropTypeInfo?.is_vial) {
        try {
          await dropsApi.createVial({ id: crypto.randomUUID(), dropTypeId: selectedDropType, startedAt: ts, dropId });
          toast.success(`Vial abierto · ${dropTypeName}`);
        } catch {
          toast.warning("Gota guardada. No se pudo abrir el vial — ábrelo manualmente desde Tratamientos.");
        }
      }

      invalidateDrops(selectedDropType);
      await calendarApi.syncDay(selectedDropType, getDayKey(ts, user.timezone), ts).catch(() => { });
      onSaved();
    } catch {
      await queueDrop({ id: dropId, dropTypeId: selectedDropType, loggedAt: ts, quantity, eye });

      toast.success("Gota en cola — se sincronizará al reconectar.");
      setIsPending(false);
      onSaved();
    }
  };

  const selectedDropTypeInfo = useMemo(() => dropTypes.find((dt) => dt.id === selectedDropType), [dropTypes, selectedDropType]);
  const activeVialForType = useMemo(() => activeVials.find((v) => v.drop_type_id === selectedDropType), [activeVials, selectedDropType]);

  const vialStatus = useMemo(() => {
    if (!selectedDropTypeInfo?.is_vial) return null;
    if (!activeVialForType) return { kind: "new" as const };
    const durationMs = (selectedDropTypeInfo.vial_duration ?? 24) * 3_600_000;
    const expiresAt = new Date(activeVialForType.started_at).getTime() + durationMs;
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      const expiredMs = Math.abs(remainingMs);
      const expHrs = Math.floor(expiredMs / 3_600_000);
      const expMins = Math.floor((expiredMs % 3_600_000) / 60_000);
      const expiredAgo = expHrs > 0 ? `${expHrs}h ${expMins}m` : `${expMins}m`;
      return { kind: "expired" as const, id: activeVialForType.id, expiredAgo };
    }
    const hrs = Math.floor(remainingMs / 3_600_000);
    const mins = Math.floor((remainingMs % 3_600_000) / 60_000);
    return { kind: "active" as const, id: activeVialForType.id, remaining: `${hrs}h ${mins}m` };
  }, [selectedDropTypeInfo, activeVialForType]);

  function renderVialStatus() {
    if (!vialStatus) return null;

    if (vialStatus.kind === "new") {
      return (
        <div className="flex items-center gap-2 rounded-[8px] px-3 py-2" style={{ background: "var(--surface-el)" }}>
          <TimerIcon size={13} style={{ color: "var(--text-faint)" }} />
          <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>
            Se abrirá un nuevo vial al guardar
          </span>
        </div>
      );
    }

    const statusText = vialStatus.kind === "active"
      ? `Vial activo · ${vialStatus.remaining}`
      : `Vencido hace ${vialStatus.expiredAgo}`;
    const iconColor = vialStatus.kind === "active" ? "var(--accent)" : "var(--warning)";

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {vialStatus.kind === "active"
              ? <TimerIcon size={13} style={{ color: iconColor }} />
              : <WarningIcon size={13} weight="fill" style={{ color: iconColor }} />
            }
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{statusText}</span>
          </div>
          {!showDiscardConfirm && (
            <button
              type="button"
              aria-label="Descartar vial"
              className="flex items-center gap-1 rounded-[6px] border px-2.5 py-1.5 text-[12px] font-medium opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: "var(--error)", borderColor: "color-mix(in srgb, var(--error) 30%, transparent)" }}
              onClick={() => setShowDiscardConfirm(true)}
            >
              <TrashIcon size={12} weight="fill" />
              Descartar vial
            </button>
          )}
        </div>

        {showDiscardConfirm && (
          <div className="rounded-[10px] border p-3 space-y-3" style={{ borderColor: "color-mix(in srgb, var(--error) 40%, transparent)", background: "var(--surface-el)" }}>
            <div>
              <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                ¿Descartar vial de {selectedDropTypeInfo?.name}?
              </p>
              <p className="mt-1 text-[13px] leading-snug" style={{ color: "var(--text-muted)" }}>
                Marca el vial como usado. Recuerda tirar el frasco físico. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="plain-muted"
                size="sm"
                className="flex-1"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="tinted-error"
                size="sm"
                className="flex-1"
                disabled={discardVialMutation.isPending}
                onClick={() => {
                  discardVialMutation.mutate(vialStatus.id);
                  setShowDiscardConfirm(false);
                }}
              >
                {discardVialMutation.isPending ? "..." : "Sí, descartar"}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const canSave = !!selectedDropType;

  if ((isLoading && dropTypes.length === 0) || lastDropLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-full rounded-[10px]" />
        <div className="space-y-2">
          <Skeleton className="h-[14px] w-24 rounded-full" />
          <Skeleton className="h-[48px] w-full rounded-[10px]" />
        </div>
        <Skeleton className="h-[16px] w-48 rounded-full" />
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div className="space-y-2">
            <Skeleton className="h-[14px] w-10 rounded-full" />
            <Skeleton className="h-[48px] w-full rounded-[12px]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-[14px] w-16 rounded-full" />
            <Skeleton className="h-[48px] w-full rounded-[12px]" />
          </div>
        </div>
        <Skeleton className="h-[52px] w-full rounded-full" />
      </div>
    );
  }

  const lastDropLabel = lastDrop ? (() => {
    const diffMs = Date.now() - new Date(lastDrop.logged_at).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);
    let timeStr: string;
    if (diffMin < 1) timeStr = "ahora mismo";
    else if (diffMin < 60) timeStr = `hace ${diffMin} min`;
    else if (diffDays < 1) {
      const remMin = diffMin % 60;
      timeStr = remMin > 0 ? `hace ${diffHr}h ${remMin}m` : `hace ${diffHr}h`;
    } else {
      timeStr = diffDays === 1 ? "hace 1 día" : `hace ${diffDays} días`;
    }
    const eyeLabel = lastDrop.eye === "left" ? "Izq" : lastDrop.eye === "right" ? "Der" : "Ambos";
    const quantityLabel = lastDrop.quantity === 1 ? "1 gota" : `${lastDrop.quantity} gotas`;
    return { timeStr, name: lastDrop.drop_type_name, eye: eyeLabel, quantityLabel };
  })() : null;

  return (
    <div className="space-y-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
      {lastDropLabel && !editDrop && (
        <div className="rounded-[10px] border px-3 py-2.5" style={{ background: "var(--surface-el)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center">
                <EyedropperIcon aria-hidden weight="duotone" size={24} className="shrink-0 -translate-y-[1.5px]" style={{ color: "var(--accent)" }} />
              </span>
              <p className="m-0 text-[11px] font-bold uppercase leading-none tracking-[0.10em]" style={{ color: "var(--text-faint)" }}>
                Ultima gota
              </p>
            </div>
            <p className="mono text-[13px] font-normal" style={{ color: "var(--text-primary)" }}>
              {lastDropLabel.timeStr}
            </p>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] leading-snug" style={{ color: "var(--text-muted)" }}>
            <span className="min-w-0 truncate font-medium" style={{ color: "var(--text-primary)" }}>{lastDropLabel.name}</span>
            <span className="shrink-0">· {lastDropLabel.eye}</span>
            <span className="shrink-0">· {lastDropLabel.quantityLabel}</span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="section-label mb-0">Fecha y hora</p>
          <button
            type="button"
            aria-label="Usar la hora actual"
            className="flex items-center gap-1 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--accent)] transition-[color,transform] duration-[160ms] ease-out active:scale-[0.97]"
            onClick={() => setLoggedAt(new Date().toISOString())}
          >
            <ClockIcon size={13} />
            Ahora
          </button>
        </div>
        <DateTimePicker value={loggedAt} onChange={setLoggedAt} max={new Date()} />
      </div>

      {state.status !== "idle" && <StatusBanner state={state} />}

      <div className="space-y-2">
        <p className="section-label mb-0">Tipo de gota</p>

        {dropTypes.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-[14px] text-[var(--text-muted)]">
            No tienes tipos de gota.{" "}
            <button onClick={() => { onSaved(); navigate("/treatments", { state: { returnTo: location.pathname } }); }} className="text-[var(--accent)]">Crear uno</button>
          </div>
        ) : (
          <div className="relative">

            <select
              aria-label="Seleccionar tipo de gota"
              className="min-h-12 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors appearance-none"
              value={selectedDropType}
              onChange={(e) => { setSelectedDropType(e.target.value); setShowDiscardConfirm(false); }}
            >
              {dropTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>{dt.name}</option>
              ))}
            </select>
            <CaretDownIcon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          </div>

        )}

        {renderVialStatus()}
      </div>

      <div className="grid grid-cols-[1fr_120px] gap-3">
        <SegmentedControl
          label="Ojo"
          options={DROP_EYES.map((e) => ({ label: e === "left" ? "Izq" : e === "right" ? "Der" : "Ambos", value: e }))}
          value={eye}
          onChange={setEye}
          tone="quiet"
        />
        <div className="space-y-2">
          <p className="section-label">Cantidad</p>
          <div className="flex h-12 items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
            <button
              type="button"
              aria-label="Reducir cantidad"
              className="flex h-full w-10 items-center justify-center text-[18px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="flex-1 text-center text-[17px] font-medium text-[var(--text-primary)]">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Aumentar cantidad"
              className="flex h-full w-10 items-center justify-center text-[18px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              onClick={() => setQuantity((q) => q + 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-[10px] px-3 py-2" style={{ background: "var(--surface-el)" }}>
          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "var(--text-muted)" }} />
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Sin conexión — se guardará y sincronizará al reconectar
          </p>
        </div>
      )}

      <Button
        className="w-full"
        disabled={isPending || !canSave}
        type="button"
        onClick={handleSave}
      >
        {isPending ? "Guardando..." : editDrop ? "Guardar cambios" : "Guardar gota"}
      </Button>
    </div>
  );
}
