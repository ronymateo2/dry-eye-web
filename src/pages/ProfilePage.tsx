import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { setToken } from "@/lib/http";
import { calendarApi, calendarKeys } from "@/features/calendar";
import { useDropTypes } from "@/features/drops";
import { userApi } from "@/features/user";
import { notificationsApi, usePush } from "@/features/notifications";
import { useAuth, useUser } from "@/lib/auth";
import {
  ArrowCounterClockwiseIcon,
  BellRingingIcon,
  CalendarDotsIcon,
  CaretRightIcon,
  ClockIcon,
  DropIcon,
  MoonIcon,
  PencilSimpleIcon,
  PillIcon,
  SignOutIcon,
  SunIcon,
  TextTIcon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "@/lib/theme";
import { useFont, type FontOption } from "@/lib/font";
import { toast } from "sonner";

export default function ProfilePage() {
  const user = useUser();
  const navigate = useNavigate();
  const { signOut, refreshUser } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const { data: calendarStatus, isLoading: calendarLoading } = useQuery({
    queryKey: calendarKeys.status(),
    queryFn: calendarApi.getStatus,
  });

  useEffect(() => {
    const calResult = searchParams.get("calendar");
    if (calResult === "connected") {
      toast.success("Google Calendar conectado.");
      qc.invalidateQueries({ queryKey: calendarKeys.status() });
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
      await calendarApi.reprocessDay(dropTypeId, dayKey);
      qc.invalidateQueries({ queryKey: calendarKeys.status() });
      toast.success("Eventos de Calendar reprocesados.");
    } catch {
      toast.error("No se pudieron reprocesar los eventos.");
    } finally {
      setReprocessingId(null);
    }
  };

  const { theme, setTheme } = useTheme();
  const [themePending, setThemePending] = useState(false);
  const { font, setFont: setFontServer } = useFont();
  const reducedMotion = useReducedMotion();
  const spring = reducedMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 400, damping: 28, mass: 0.8 };
  const fade = reducedMotion ? { duration: 0 } : { duration: 0.2 };

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
      const res = await userApi.updateMe({ timezone: tz });
      if (res.token) setToken(res.token);
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

  // Widget de gotas (selección para Today)
  const { data: dropTypes = [] } = useDropTypes();
  const [widgetSheetOpen, setWidgetSheetOpen] = useState(false);
  const [widgetPending, setWidgetPending] = useState(false);
  const [widgetSelected, setWidgetSelected] = useState<string[]>(user.widget_drop_type_ids);
  const [widgetDraft, setWidgetDraft] = useState<string[]>(user.widget_drop_type_ids);

  const widgetSelectedNames = useMemo(() => {
    const byId = new Map(dropTypes.map((d) => [d.id, d.name]));
    return widgetSelected.map((id) => byId.get(id)).filter((n): n is string => Boolean(n));
  }, [dropTypes, widgetSelected]);

  const toggleWidgetDraft = (id: string) => {
    setWidgetDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openWidgetSheet = () => {
    setWidgetDraft(widgetSelected);
    setWidgetSheetOpen(true);
  };

  const saveWidgetSelection = async () => {
    setWidgetPending(true);
    try {
      await userApi.updateMe({ widgetDropTypeIds: widgetDraft });
      await refreshUser();
      setWidgetSelected(widgetDraft);
      setWidgetSheetOpen(false);
      toast.success("Gotas del widget actualizadas.");
    } catch {
      toast.error("No se pudo guardar la selección.");
    } finally {
      setWidgetPending(false);
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

  const push = usePush();
  const [quietStart, setQuietStart] = useState(user.quiet_start ?? "");
  const [quietEnd, setQuietEnd] = useState(user.quiet_end ?? "");

  const handlePushToggle = async () => {
    try {
      if (push.isSubscribed) {
        await push.disable();
        await refreshUser();
        toast.success("Recordatorios desactivados.");
      } else {
        const ok = await push.enable();
        if (ok) {
          await refreshUser();
          toast.success("Recordatorios activados.");
        } else {
          toast.error("Permiso de notificaciones denegado.");
        }
      }
    } catch {
      toast.error("No se pudieron actualizar los recordatorios.");
    }
  };

  const saveQuietHours = async () => {
    if ((quietStart || null) === (user.quiet_start ?? null) && (quietEnd || null) === (user.quiet_end ?? null)) {
      return;
    }
    try {
      await notificationsApi.updatePreferences({
        quietStart: quietStart || null,
        quietEnd: quietEnd || null,
      });
      await refreshUser();
      toast.success("Horas de silencio guardadas.");
    } catch {
      toast.error("No se pudieron guardar las horas de silencio.");
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
                <TextTIcon size={16} color="var(--accent)" weight="fill" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Fuente
                </span>
                <select
                  value={font}
                  onChange={async (e) => {
                    try {
                      await setFontServer(e.target.value as FontOption);
                    } catch {
                      toast.error("No se pudo cambiar la fuente.");
                    }
                  }}
                  className="w-full bg-transparent text-[14px] text-[var(--text-primary)] outline-none"
                >
                  <option value="atkinson-hyperlegible">Atkinson Hyperlegible Next</option>
                  <option value="manrope">Manrope</option>
                  <option value="sf-pro-rounded">SF Pro Rounded</option>
                </select>
              </div>
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
                role="switch"
                aria-checked={theme === "dark"}
                onClick={handleThemeToggle}
                aria-label="Tema oscuro"
                disabled={themePending}
                className="relative shrink-0 transition-transform active:scale-[0.97] disabled:opacity-40"
                style={{ width: 76, height: 42, border: "none", background: "transparent" }}
              >
                <span
                  style={{
                    position: "absolute", inset: 0, borderRadius: "500px",
                    backgroundColor: theme === "dark" ? "var(--surface)" : "var(--surface-el)",
                    boxShadow: theme === "dark"
                      ? "inset 0px 2px 5px rgba(0,0,0,0.55), inset 0px -1px 2px rgba(255,255,255,0.03)"
                      : "inset 0px 2px 4px rgba(0,0,0,0.1), inset 0px -1px 2px rgba(255,255,255,0.6)",
                    transition: "background-color 0.25s cubic-bezier(0.23,1,0.32,1), box-shadow 0.25s cubic-bezier(0.23,1,0.32,1)",
                    overflow: "hidden",
                  }}
                >
                  <motion.span
                    aria-hidden
                    animate={{ opacity: theme === "dark" ? 0.4 : 0 }}
                    transition={fade}
                    style={{ position: "absolute", left: 11, top: "50%", translateY: "-50%", display: "flex", pointerEvents: "none" }}
                  >
                    <SunIcon size={16} color="var(--text-faint)" weight="regular" />
                  </motion.span>
                  <motion.span
                    aria-hidden
                    animate={{ opacity: theme === "light" ? 0.45 : 0 }}
                    transition={fade}
                    style={{ position: "absolute", right: 11, top: "50%", translateY: "-50%", display: "flex", pointerEvents: "none" }}
                  >
                    <MoonIcon size={16} color="var(--text-faint)" weight="regular" />
                  </motion.span>
                </span>
                <motion.span
                  animate={{ transform: theme === "dark" ? "translateX(34px)" : "translateX(0px)" }}
                  transition={spring}
                  style={{
                    position: "absolute", top: 4, left: 4,
                    width: 34, height: 34, borderRadius: "500px",
                    background: theme === "dark"
                      ? "linear-gradient(145deg, var(--surface-el) 0%, var(--surface) 100%)"
                      : "linear-gradient(145deg, var(--surface) 0%, var(--surface-el) 100%)",
                    boxShadow: theme === "dark"
                      ? "0px 2px 5px rgba(0,0,0,0.55), 0px 1px 2px rgba(0,0,0,0.4), inset 0px 1px 1px rgba(240,228,200,0.06)"
                      : "0px 2px 8px rgba(0,0,0,0.12), 0px 1px 3px rgba(0,0,0,0.08), inset 0px 1px 1px rgba(255,255,255,0.9)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.25s cubic-bezier(0.23,1,0.32,1), box-shadow 0.25s cubic-bezier(0.23,1,0.32,1)",
                  }}
                >
                  <motion.span
                    aria-hidden
                    animate={{ opacity: theme === "light" ? 1 : 0 }}
                    transition={fade}
                    style={{ position: "absolute", display: "flex" }}
                  >
                    <SunIcon size={18} color="var(--accent)" weight="fill" />
                  </motion.span>
                  <motion.span
                    aria-hidden
                    animate={{ opacity: theme === "dark" ? 1 : 0 }}
                    transition={fade}
                    style={{ position: "absolute", display: "flex" }}
                  >
                    <MoonIcon size={18} color="var(--accent)" weight="regular" />
                  </motion.span>
                </motion.span>
              </button>
            </div>
            <div className="flex min-h-[72px] items-center gap-3 border-t border-[var(--border)] px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
                <DropIcon size={16} color="var(--accent)" weight="fill" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Widget de gotas
                </span>
                <span className="truncate text-[14px] text-[var(--text-primary)]">
                  {widgetSelectedNames.length > 0 ? widgetSelectedNames.join(", ") : "Ninguna"}
                </span>
              </div>
              <button
                type="button"
                onClick={openWidgetSheet}
                aria-label="Elegir gotas del widget"
                disabled={widgetPending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-el)] text-[var(--text-faint)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
              >
                <PencilSimpleIcon size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Recordatorios */}
        <div className="space-y-3">
          <p className="section-label">Recordatorios</p>
          <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex min-h-[72px] items-center gap-3 px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
                <BellRingingIcon size={16} color="var(--accent)" weight="fill" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Notificaciones de dosis
                </span>
                <span className="text-[14px] text-[var(--text-primary)]">
                  {push.isSubscribed ? "Activadas" : "Desactivadas"}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={push.isSubscribed}
                aria-label="Notificaciones de dosis"
                disabled={push.busy || !push.isSupported}
                onClick={handlePushToggle}
                className="relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors disabled:opacity-40"
                style={{ backgroundColor: push.isSubscribed ? "var(--accent)" : "var(--surface-el)" }}
              >
                <span
                  className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all"
                  style={{ left: push.isSubscribed ? 23 : 3 }}
                />
              </button>
            </div>

            {!push.isSupported && (
              <p className="border-t border-[var(--border)] px-4 py-3 text-[12px] text-[var(--text-faint)]">
                Tu navegador no soporta notificaciones push.
              </p>
            )}
            {push.isSupported && !push.isStandalone && (
              <p className="border-t border-[var(--border)] px-4 py-3 text-[12px] text-[var(--text-faint)]">
                En iPhone, añade la app a la pantalla de inicio para recibir notificaciones.
              </p>
            )}

            {push.isSubscribed && (
              <div className="flex min-h-[72px] items-center gap-3 border-t border-[var(--border)] px-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
                  <MoonIcon size={16} color="var(--accent)" weight="fill" />
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                    No molestar
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={quietStart}
                      aria-label="Inicio de no molestar"
                      onChange={(e) => setQuietStart(e.target.value)}
                      onBlur={saveQuietHours}
                      className="mono rounded-[8px] border border-[var(--border)] bg-[var(--surface-el)] px-2 py-1 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                    <span className="text-[var(--text-faint)]">—</span>
                    <input
                      type="time"
                      value={quietEnd}
                      aria-label="Fin de no molestar"
                      onChange={(e) => setQuietEnd(e.target.value)}
                      onBlur={saveQuietHours}
                      className="mono rounded-[8px] border border-[var(--border)] bg-[var(--surface-el)] px-2 py-1 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            )}
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
            onClick={() => navigate("/treatments?tab=pills")}
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
          <Button
            variant="tinted-error"
            aria-label="Cerrar sesión"
            className="group"
            onClick={signOut}
          >
            <SignOutIcon size={14} weight="bold" className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Cerrar sesión
          </Button>
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

      {/* Widget drop-types picker sheet */}
      <MobileSheet
        open={widgetSheetOpen}
        title="Widget de gotas"
        description="Elige qué gotas se muestran en el seguimiento de Inicio."
        onClose={() => setWidgetSheetOpen(false)}
      >
        <div className="flex flex-col gap-3">
          <ul className="max-h-[45vh] overflow-y-auto rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
            {dropTypes.length === 0 ? (
              <li className="flex min-h-12 items-center px-4 text-[13px] text-[var(--text-faint)]">
                No tienes gotas registradas
              </li>
            ) : (
              dropTypes.map((d) => {
                const isActive = widgetDraft.includes(d.id);
                return (
                  <li key={d.id} className="border-b border-[var(--border)] last:border-b-0">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isActive}
                      disabled={widgetPending}
                      onClick={() => toggleWidgetDraft(d.id)}
                      className="flex min-h-12 w-full items-center px-4 text-left transition-colors disabled:opacity-40"
                      style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}
                    >
                      <span className={`text-[14px] capitalize ${isActive ? "font-medium" : ""}`}>{d.name}</span>
                      {isActive && (
                        <span className="ml-auto text-[11px] font-medium text-[var(--accent)]">✓</span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <Button
            variant="primary"
            onClick={saveWidgetSelection}
            disabled={widgetPending}
            aria-label="Guardar selección de gotas"
          >
            Guardar
          </Button>
        </div>
      </MobileSheet>
    </>
  );
}
