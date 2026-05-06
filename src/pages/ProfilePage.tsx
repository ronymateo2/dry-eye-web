import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { TextInput } from "@/components/ui/text-input";
import { api } from "@/lib/api";
import { useAuth, useUser } from "@/lib/auth";
import {
  ArrowCounterClockwiseIcon,
  CalendarDotsIcon,
  CaretRightIcon,
  ClockIcon,
  MoonIcon,
  PencilSimpleIcon,
  PillIcon,
  SignOutIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

export default function ProfilePage() {
  const user = useUser();
  const navigate = useNavigate();
  const { signOut, refreshUser } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const { data: calendarStatus, isLoading: calendarLoading } = useQuery({
    queryKey: ["calendar/status"],
    queryFn: api.getCalendarStatus,
  });

  useEffect(() => {
    const calResult = searchParams.get("calendar");
    if (calResult === "connected") {
      toast.success("Google Calendar conectado.");
      qc.invalidateQueries({ queryKey: ["calendar/status"] });
      setSearchParams({}, { replace: true });
    } else if (calResult === "error") {
      const reason = searchParams.get("reason") ?? "";
      const detail = searchParams.get("detail") ?? "";
      const msg = reason === "state"
        ? "Error: cookie de sesión perdida (reason=state)"
        : reason === "token"
        ? `Error al obtener token: ${detail || "token_exchange"}`
        : reason === "userinfo"
        ? "Error al leer perfil de Google (reason=userinfo)"
        : "Error al conectar Google Calendar.";
      toast.error(msg);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, qc]);

  const handleReprocessToday = async (dropTypeId: string) => {
    const dayKey = new Date().toLocaleDateString("en-CA", { timeZone: user.timezone });
    setReprocessingId(dropTypeId);
    try {
      await api.reprocessCalendarDay(dropTypeId, dayKey);
      qc.invalidateQueries({ queryKey: ["calendar/status"] });
      toast.success("Eventos de Calendar reprocesados.");
    } catch {
      toast.error("No se pudieron reprocesar los eventos.");
    } finally {
      setReprocessingId(null);
    }
  };

  const { theme, setTheme } = useTheme();
  const [themePending, setThemePending] = useState(false);

  // Timezone state
  const [timezone, setTimezone] = useState(user.timezone ?? "");
  const [tzSheetOpen, setTzSheetOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const [tzPending, setTzPending] = useState(false);

  const allTimezones = useMemo<string[]>(() => {
    try {
      return (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }, []);

  const filteredTimezones = useMemo(() => {
    if (!tzSearch.trim()) return allTimezones;
    const q = tzSearch.toLowerCase();
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q));
  }, [allTimezones, tzSearch]);

  const handleTimezoneSelect = async (tz: string) => {
    setTzPending(true);
    try {
      await api.updateMe({ timezone: tz });
      await refreshUser();
      setTimezone(tz);
      setTzSheetOpen(false);
      setTzSearch("");
      toast.success("Timezone actualizado.");
    } catch {
      toast.error("No se pudo actualizar el timezone.");
    } finally {
      setTzPending(false);
    }
  };

  const handleThemeToggle = async () => {
    setThemePending(true);
    try {
      await setTheme(theme === "dark" ? "light" : "dark");
    } catch {
      toast.error("No se pudo cambiar el tema.");
    } finally {
      setThemePending(false);
    }
  };

  return (
    <>
      <section className="space-y-8">
        {/* Información */}
        <div className="space-y-3">
          <p className="section-label">Información</p>
          <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
            {user.name ? (
              <div className="flex min-h-12 items-center border-b border-[var(--border)] px-4">
                <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Nombre
                </span>
                <span className="text-[15px] text-[var(--text-primary)]">{user.name}</span>
              </div>
            ) : null}
            {user.email ? (
              <div className="flex min-h-12 items-center px-4">
                <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Email
                </span>
                <span className="mono truncate text-[13px] text-[var(--text-muted)]">{user.email}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Configuración */}
        <div className="space-y-3">
          <p className="section-label">Configuración</p>
          <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex min-h-[72px] items-center gap-3 px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
                <ClockIcon size={16} color="var(--accent)" weight="fill" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Zona Horaria
                </span>
                <span className="mono truncate text-[14px] text-[var(--text-primary)]">{timezone}</span>
              </div>
              <button
                type="button"
                onClick={() => { setTzSearch(""); setTzSheetOpen(true); }}
                aria-label="Cambiar zona horaria"
                disabled={tzPending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-el)] text-[var(--text-faint)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
              >
                <PencilSimpleIcon size={15} />
              </button>
            </div>
            <div className="flex min-h-[72px] items-center gap-3 border-t border-[var(--border)] px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
                {theme === "light"
                  ? <SunIcon size={16} color="var(--accent)" weight="fill" />
                  : <MoonIcon size={16} color="var(--accent)" weight="fill" />}
              </div>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Tema
                </span>
                <span className="mono truncate text-[14px] text-[var(--text-primary)]">
                  {theme === "light" ? "Claro" : "Oscuro"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleThemeToggle}
                aria-label="Cambiar tema"
                disabled={themePending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-el)] text-[var(--text-faint)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
              >
                {theme === "light" ? <MoonIcon size={15} /> : <SunIcon size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Google Calendar */}
        <div className="space-y-3">
          <p className="section-label">Google Calendar</p>
          <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
            {calendarLoading ? (
              <div className="flex min-h-[72px] items-center gap-3 px-4">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-[8px] bg-[var(--surface-el)]" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="h-2.5 w-20 animate-pulse rounded-full bg-[var(--surface-el)]" />
                  <div className="h-3.5 w-36 animate-pulse rounded-full bg-[var(--surface-el)]" />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[72px] items-center gap-3 px-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
                  <CalendarDotsIcon size={16} color="var(--accent)" weight="fill" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                    Notificaciones
                  </span>
                  <span className="text-[14px] text-[var(--text-primary)]">
                    {calendarStatus?.authorized ? "Conectado" : "No conectado"}
                  </span>
                </div>
                {!calendarStatus?.authorized && (
                  <button
                    type="button"
                    aria-label="Conectar Google Calendar"
                    onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL ?? "/api"}/calendar/connect`; }}
                    className="flex h-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-el)] px-3 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    Conectar
                  </button>
                )}
              </div>
            )}
            {calendarStatus?.authorized && calendarStatus.events_today.length > 0 && (
              <div className="border-t border-[var(--border)]">
                {calendarStatus.events_today.map((entry) => (
                  <div
                    key={entry.drop_type_id}
                    className="flex min-h-12 items-center gap-3 border-b border-[var(--border)] px-4 last:border-b-0"
                  >
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                      <span className="text-[14px] text-[var(--text-primary)] truncate">{entry.drop_type_name}</span>
                      <span className="mono text-[11px] text-[var(--text-faint)]">
                        {entry.count} evento{entry.count !== 1 ? "s" : ""} hoy
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={reprocessingId === entry.drop_type_id}
                      onClick={() => handleReprocessToday(entry.drop_type_id)}
                      aria-label={`Reprocesar eventos de ${entry.drop_type_name}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-el)] text-[var(--text-faint)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
                    >
                      <ArrowCounterClockwiseIcon
                        size={15}
                        className={reprocessingId === entry.drop_type_id ? "animate-spin" : ""}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tratamientos */}
        <div className="space-y-3">
          <p className="section-label">Tratamientos</p>
          <button
            type="button"
            onClick={() => navigate("/tratamientos?tab=pills")}
            aria-label="Ir a mis tratamientos"
            className="flex min-h-[56px] w-full items-center gap-3 overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] px-4 transition-colors hover:border-[var(--accent)]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
              <PillIcon size={16} color="var(--accent)" weight="fill" />
            </div>
            <span className="flex-1 text-left text-[15px] text-[var(--text-primary)]">Mis tratamientos</span>
            <CaretRightIcon size={14} color="var(--text-faint)" />
          </button>
        </div>

        {/* Cerrar sesion */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-4">
          {user.name ? (
            <p className="text-[11px] text-[var(--text-faint)]">
              Sesión activa como <span className="text-[var(--text-muted)]">{user.name}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={signOut}
            aria-label="Cerrar sesión"
            className="group flex items-center gap-2 rounded-[999px] border border-[rgba(204,63,48,0.22)] bg-[rgba(204,63,48,0.07)] px-6 py-3 text-[14px] font-medium text-[var(--error)] transition-all duration-[180ms] active:scale-[0.96] hover:border-[rgba(204,63,48,0.45)] hover:bg-[rgba(204,63,48,0.13)]"
          >
            <SignOutIcon size={14} weight="bold" className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Cerrar sesión
          </button>
        </div>
      </section>

      {/* Timezone picker sheet */}
      <MobileSheet
        open={tzSheetOpen}
        title="Zona horaria"
        description="Selecciona tu zona horaria local."
        onClose={() => { setTzSheetOpen(false); setTzSearch(""); }}
      >
        <div className="flex flex-col gap-3">
          <TextInput
            placeholder="Buscar (ej. Bogota, Mexico_City…)"
            value={tzSearch}
            autoFocus
            rows={1}
            onChange={(e) => setTzSearch(e.target.value)}
          />
          <ul className="max-h-[45vh] overflow-y-auto rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
            {filteredTimezones.length === 0 ? (
              <li className="flex min-h-12 items-center px-4 text-[13px] text-[var(--text-faint)]">
                Sin resultados
              </li>
            ) : (
              filteredTimezones.map((tz) => {
                const isActive = tz === timezone;
                return (
                  <li key={tz} className="border-b border-[var(--border)] last:border-b-0">
                    <button
                      type="button"
                      disabled={tzPending}
                      onClick={() => handleTimezoneSelect(tz)}
                      className="flex min-h-12 w-full items-center px-4 text-left transition-colors disabled:opacity-40"
                      style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}
                    >
                      <span className={`mono text-[13px] ${isActive ? "font-medium" : ""}`}>{tz}</span>
                      {isActive && (
                        <span className="ml-auto text-[11px] font-medium text-[var(--accent)]">✓</span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </MobileSheet>
    </>
  );
}
