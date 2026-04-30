import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusBanner } from "@/components/ui/status-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { WheelPicker } from "@/components/ui/wheel-picker";
import { EyedropperIcon } from "@phosphor-icons/react";
import { DROP_EYES } from "@/lib/constants";
import { api } from "@/lib/api";
import { queueDrop } from "@/lib/offline/drops-queue";
import { setLastDrop } from "@/lib/last-drop-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionState, DropEye } from "@/types/domain";

export function DropSheet({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();
  const { data: dropTypes = [], isLoading } = useQuery({ queryKey: ["drop-types"], queryFn: api.getDropTypes });
  const [selectedDropType, setSelectedDropType] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [eye, setEye] = useState<DropEye>("left");
  const [loggedAt, setLoggedAt] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [isPending, setIsPending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const { data: lastDrop, isLoading: lastDropLoading } = useQuery({
    queryKey: ["drops/last"],
    queryFn: api.getLastDrop,
    staleTime: 0,
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
      setSelectedDropType(dropTypes[0].id);
    }
  }, [dropTypes, selectedDropType]);

  const wheelOptions = useMemo(() => dropTypes.map((dt) => ({ value: dt.id, label: dt.name })), [dropTypes]);

  const handleSave = async () => {
    if (!selectedDropType) {
      setState({ status: "error", message: "Selecciona un tipo de gota." });
      return;
    }

    setIsPending(true);
    const dropId = crypto.randomUUID();
    const ts = loggedAt ? new Date(loggedAt).toISOString() : new Date().toISOString();
    const qty = Number(quantity) || 1;
    const dropTypeName = dropTypes.find((dt) => dt.id === selectedDropType)?.name ?? "";

    const persistLastDrop = () =>
      setLastDrop({ id: dropId, logged_at: ts, quantity: qty, eye, drop_type_id: selectedDropType, drop_type_name: dropTypeName });

    // Offline path
    if (!isOnline) {
      await queueDrop({ id: dropId, dropTypeId: selectedDropType, loggedAt: ts, quantity: qty, eye });
      persistLastDrop();
      toast.success("Gota en cola — se sincronizará al reconectar.");
      setIsPending(false);
      onSaved();
      return;
    }

    try {
      await api.saveDrop({ id: dropId, dropTypeId: selectedDropType, loggedAt: ts, quantity: qty, eye });
      persistLastDrop();
      queryClient.invalidateQueries({ queryKey: ["drops/last"] });
      toast.success("Gota registrada.");
      onSaved();
    } catch {
      // Network failure while online — queue and sync later
      await queueDrop({ id: dropId, dropTypeId: selectedDropType, loggedAt: ts, quantity: qty, eye });
      persistLastDrop();
      toast.success("Gota en cola — se sincronizará al reconectar.");
      setIsPending(false);
      onSaved();
    }
  };

  const canSave = !!selectedDropType;

  if ((isLoading && dropTypes.length === 0) || lastDropLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-full rounded-[10px]" />
        <div className="space-y-2">
          <Skeleton className="h-[14px] w-24 rounded-full" />
          <Skeleton className="h-[148px] w-full rounded-[16px]" />
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
      {lastDropLabel && (
        <div className="rounded-[10px] border px-3 py-2.5" style={{ background: "var(--surface-el)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center">
                <EyedropperIcon aria-hidden weight="duotone" size={24} className="shrink-0 -translate-y-[1.5px]" style={{ color: "var(--accent)" }} />
              </span>
              <p className="m-0 text-[11px] font-semibold uppercase leading-none tracking-[0.10em]" style={{ color: "var(--text-faint)" }}>
                Ultima gota
              </p>
            </div>
            <p className="mono text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
              {lastDropLabel.timeStr}
            </p>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] leading-snug" style={{ color: "var(--text-muted)" }}>
            <span className="min-w-0 truncate" style={{ color: "var(--text-primary)" }}>{lastDropLabel.name}</span>
            <span className="shrink-0">· {lastDropLabel.eye}</span>
            <span className="shrink-0">· {lastDropLabel.quantityLabel}</span>
          </p>
        </div>
      )}

      <div>
        {!showDatePicker ? (
          <button
            type="button"
            className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)]"
            onClick={() => { setShowDatePicker(true); setLoggedAt((prev) => prev ?? new Date().toISOString()); }}
          >
            ¿Olvidaste registrarla? Cambiar fecha
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="section-label mb-0">Fecha y hora</p>
              <button
                type="button"
                className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)]"
                onClick={() => { setShowDatePicker(false); setLoggedAt(null); }}
              >
                Usar hora actual
              </button>
            </div>
            <DateTimePicker value={loggedAt} onChange={setLoggedAt} max={new Date()} />
          </div>
        )}
      </div>

      {state.status !== "idle" && <StatusBanner state={state} />}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="section-label mb-0">Tipo de gota</p>
          <Link to="/drop-types" className="text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accent-bright)]">Gestionar</Link>
        </div>

        {dropTypes.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-[14px] text-[var(--text-muted)]">
            No tienes tipos de gota.{" "}
            <Link to="/drop-types" className="text-[var(--accent)]">Crear uno</Link>
          </div>
        ) : (
          <WheelPicker label="Seleccionar tipo de gota" options={wheelOptions} value={selectedDropType} onChange={setSelectedDropType} />
        )}
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
          <input
            className="min-h-12 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
            inputMode="numeric"
            min={1}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
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
        className="w-full shadow-[0_10px_24px_var(--fab-shadow)]"
        disabled={isPending || !canSave}
        type="button"
        onClick={handleSave}
      >
        {isPending ? "Guardando..." : state.status === "success" ? "Guardada" : "Guardar gota"}
      </Button>
    </div>
  );
}
