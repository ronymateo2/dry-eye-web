"use client";

import { useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { painColor, painGradient } from "@/lib/pain";
import type { TriggerType } from "@/types/domain";

type ReportTrendPoint = {
  dayKey: string;
  averagePain: number;
};

type ReportCorrelationPoint = {
  sleepHours: number;
  masseterPain: number;
};

type ReportTriggerStat = {
  triggerType: TriggerType;
  days: number;
};

type ReportAveragePain = {
  eyelid: number;
  temple: number;
  masseter: number;
  cervical: number;
  orbital: number;
};

export type ReportData = {
  ok: true;
  userName: string | null;
  checkInsCount: number;
  dateRange: string;
  hasEnoughData: boolean;
  averagePain: ReportAveragePain | null;
  averageSleepHours: number | null;
  averageSleepQuality: number | null;
  spearman: number | null;
  correlationLabel: string;
  correlationPoints: ReportCorrelationPoint[];
  trendPoints: ReportTrendPoint[];
  dropsPerDay: number | null;
  topTriggers: ReportTriggerStat[];
};

const TRIGGER_LABELS: Record<string, string> = {
  climate: "Clima",
  humidifier: "Humidificador",
  stress: "Estrés",
  screens: "Pantallas",
  tv: "TV",
  ergonomics: "Ergonomía",
  exercise: "Ejercicio",
  other: "Otro",
};

const PAIN_ZONES: { key: keyof ReportAveragePain; label: string }[] = [
  { key: "eyelid", label: "Párpados" },
  { key: "temple", label: "Sienes" },
  { key: "masseter", label: "Masetero" },
  { key: "cervical", label: "Cervical" },
  { key: "orbital", label: "Orbital" },
];

function correlationAccentColor(r: number): string {
  if (r <= -0.3) return "var(--pain-low)";
  if (r >= 0.3) return "var(--pain-high)";
  return "var(--pain-mid)";
}

function correlationChipStyle(r: number): { color: string; background: string; border: string } {
  if (r <= -0.3) return {
    color: "var(--pain-low)",
    background: "rgba(92, 184, 90, 0.12)",
    border: "1px solid rgba(92, 184, 90, 0.28)",
  };
  if (r >= 0.3) return {
    color: "var(--pain-high)",
    background: "rgba(204, 63, 48, 0.12)",
    border: "1px solid rgba(204, 63, 48, 0.28)",
  };
  return {
    color: "var(--pain-mid)",
    background: "rgba(224, 147, 42, 0.12)",
    border: "1px solid rgba(224, 147, 42, 0.28)",
  };
}

interface Props {
  data: ReportData;
}

export function ReportScreen({ data }: Props) {
  const [generating, setGenerating] = useState(false);
  const trendChartRef = useRef<HTMLDivElement>(null);
  const scatterChartRef = useRef<HTMLDivElement>(null);

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { jsPDF } = (await import("jspdf/dist/jspdf.umd.min.js" as any)) as unknown as typeof import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const margin = 20;
      const contentW = pageW - margin * 2;

      const bg: [number, number, number] = [18, 16, 8];
      const textPrimary: [number, number, number] = [240, 228, 200];
      const textMuted: [number, number, number] = [138, 120, 96];
      const textFaint: [number, number, number] = [90, 78, 58];
      const borderColor: [number, number, number] = [46, 39, 24];
      const accent: [number, number, number] = [212, 162, 76];

      const fillPage = () => {
        doc.setFillColor(...bg);
        doc.rect(0, 0, pageW, pageH, "F");
      };

      // ─── Page 1: Cover ────────────────────────────────────────────────
      fillPage();

      doc.setFillColor(...accent);
      doc.rect(margin, 32, 4, 28, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(...textPrimary);
      doc.text("Reporte para Médico", margin + 10, 44);

      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textMuted);
      doc.text("NeuroEye Log", margin + 10, 54);

      if (data.userName) {
        doc.setFontSize(12);
        doc.setTextColor(...textPrimary);
        doc.text(data.userName, margin + 10, 66);
      }

      doc.setFontSize(11);
      doc.setTextColor(...textMuted);
      doc.text(data.dateRange, margin + 10, 76);

      const today = new Date().toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      doc.text(`Generado el ${today}`, margin + 10, 84);

      doc.setFontSize(8);
      doc.setTextColor(...textFaint);
      const disclaimer =
        "Este reporte es generado automáticamente por NeuroEye Log y es informativo únicamente. No constituye diagnóstico médico. Los coeficientes de correlación (Spearman) indican asociación estadística, no causalidad.";
      doc.text(doc.splitTextToSize(disclaimer, contentW), margin, 268);

      // ─── Page 2: Summary table ────────────────────────────────────────
      doc.addPage();
      fillPage();

      let y = 32;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(...textPrimary);
      doc.text("Resumen del Período", margin, y);
      y += 14;

      const rows: [string, string][] = [
        ["Registros totales", `${data.checkInsCount}`],
        ["Período", data.dateRange],
      ];

      if (data.averagePain) {
        rows.push(
          ["Dolor párpados (prom.)", `${data.averagePain.eyelid} / 10`],
          ["Dolor sienes (prom.)", `${data.averagePain.temple} / 10`],
          ["Dolor masetero (prom.)", `${data.averagePain.masseter} / 10`],
          ["Dolor cervical (prom.)", `${data.averagePain.cervical} / 10`],
          ["Dolor orbital (prom.)", `${data.averagePain.orbital} / 10`],
        );
      }

      if (data.averageSleepHours !== null) {
        const sleepStr =
          data.averageSleepQuality !== null
            ? `${data.averageSleepHours}h · calidad ${data.averageSleepQuality} / 10`
            : `${data.averageSleepHours}h`;
        rows.push(["Sueño (prom.)", sleepStr]);
      }

      if (data.dropsPerDay !== null) {
        rows.push(["Gotas por día (prom.)", `${data.dropsPerDay}`]);
      }

      if (data.spearman !== null) {
        rows.push([
          "Correlación sueño ↔ masetero",
          `r = ${data.spearman} (${data.correlationLabel})`,
        ]);
      }

      doc.setFontSize(11);
      for (const [label, value] of rows) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textMuted);
        doc.text(label, margin, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textPrimary);
        doc.text(value, margin + 95, y);
        y += 4;
        doc.setDrawColor(...borderColor);
        doc.line(margin, y, pageW - margin, y);
        y += 8;
      }

      // ─── Page 3: Trend chart ──────────────────────────────────────────
      if (trendChartRef.current && data.trendPoints.length > 0) {
        const canvas = await html2canvas(trendChartRef.current, {
          backgroundColor: "#1c1810",
          scale: 2,
          useCORS: true,
        });
        doc.addPage();
        fillPage();
        y = 32;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.setTextColor(...textPrimary);
        doc.text("Tendencia del Dolor", margin, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...textMuted);
        doc.text("Promedio diario de todas las zonas (0 – 10)", margin, y);
        y += 6;
        const imgW = contentW;
        const imgH = (canvas.height / canvas.width) * imgW;
        doc.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, imgW, imgH);
      }

      // ─── Page 4: Scatter chart ────────────────────────────────────────
      if (
        scatterChartRef.current &&
        data.correlationPoints.length >= 14 &&
        data.spearman !== null
      ) {
        const canvas = await html2canvas(scatterChartRef.current, {
          backgroundColor: "#1c1810",
          scale: 2,
          useCORS: true,
        });
        doc.addPage();
        fillPage();
        y = 32;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.setTextColor(...textPrimary);
        doc.text("Correlación Sueño ↔ Dolor (Masetero)", margin, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...textMuted);
        doc.text(
          `Coeficiente de Spearman: r = ${data.spearman} (${data.correlationLabel})`,
          margin,
          y,
        );
        y += 6;
        const imgW = contentW;
        const imgH = (canvas.height / canvas.width) * imgW;
        doc.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, imgW, imgH);
      }

      // ─── Top triggers ─────────────────────────────────────────────────
      if (data.topTriggers.length > 0) {
        doc.addPage();
        fillPage();
        y = 32;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.setTextColor(...textPrimary);
        doc.text("Desencadenantes Más Frecuentes", margin, y);
        y += 14;
        doc.setFontSize(11);
        for (const trigger of data.topTriggers) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...textMuted);
          doc.text(
            TRIGGER_LABELS[trigger.triggerType] ?? trigger.triggerType,
            margin,
            y,
          );
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...textPrimary);
          doc.text(`${trigger.days} días`, margin + 95, y);
          y += 4;
          doc.setDrawColor(...borderColor);
          doc.line(margin, y, pageW - margin, y);
          y += 8;
        }
      }

      doc.save(`neuroeye-reporte-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const showAllLabels = data.trendPoints.length <= 30;
  const trendInterval = showAllLabels ? 0 : Math.floor(data.trendPoints.length / 10);
  const formatTrendLabel = (dayKey: string) => {
    const [, month, day] = dayKey.split("-");
    return `${day}/${month}`;
  };

  const maxTriggerDays = data.topTriggers[0]?.days ?? 1;
  const chipStyle = data.spearman !== null ? correlationChipStyle(data.spearman) : null;

  return (
    <section className="space-y-6 pb-8 pt-2">

      {/* ── Period + count ─────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-1">Período analizado</p>
          <p className="screen-title text-[18px]">{data.dateRange}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="mono text-[30px] font-medium leading-none text-[var(--text-primary)]">
            {data.checkInsCount}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            registros
          </span>
        </div>
      </div>

      {/* ── Correlation hero ───────────────────────────────────── */}
      <div>
        <p className="section-label">Correlación sueño ↔ dolor</p>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-5">
          {data.spearman !== null && chipStyle ? (
            <>
              <div className="mb-3 flex items-end justify-between gap-3">
                <span
                  className="mono text-[52px] font-medium leading-none"
                  style={{ color: correlationAccentColor(data.spearman) }}
                >
                  {data.spearman > 0 ? "+" : ""}{data.spearman}
                </span>
                <span
                  className="mb-1 shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={chipStyle}
                >
                  {data.correlationLabel}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                Spearman entre horas de sueño y dolor de masetero. Se destacará en la portada del PDF.
              </p>
            </>
          ) : (
            <div className="py-1">
              <p className="mono mb-2 text-[36px] font-medium leading-none text-[var(--text-faint)]">
                — / —
              </p>
              <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                {data.correlationPoints.length < 14
                  ? `Faltan ${14 - data.correlationPoints.length} registros matutinos con sueño para calcular.`
                  : "No hay suficiente variación para calcular la correlación."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sleep + drops stats ────────────────────────────────── */}
      {(data.averageSleepHours !== null || data.dropsPerDay !== null) && (
        <div className={cn(
          "grid gap-3",
          data.averageSleepHours !== null && data.dropsPerDay !== null
            ? "grid-cols-2"
            : "grid-cols-1",
        )}>
          {data.averageSleepHours !== null && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-4">
              <p className="section-label mb-2">Sueño prom.</p>
              <p className="mono text-[28px] font-medium leading-none text-[var(--text-primary)]">
                {data.averageSleepHours}
                <span className="text-[16px] text-[var(--text-muted)]">h</span>
              </p>
              {data.averageSleepQuality !== null && (
                <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
                  calidad {data.averageSleepQuality}/10
                </p>
              )}
            </div>
          )}
          {data.dropsPerDay !== null && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-4">
              <p className="section-label mb-2">Gotas / día</p>
              <p className="mono text-[28px] font-medium leading-none text-[var(--text-primary)]">
                {data.dropsPerDay}
              </p>
              <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">promedio diario</p>
            </div>
          )}
        </div>
      )}

      {/* ── Pain zones ─────────────────────────────────────────── */}
      {data.averagePain && (
        <div>
          <p className="section-label">Dolor promedio por zona</p>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)]">
            {PAIN_ZONES.map(({ key, label }, i) => {
              const score = data.averagePain![key];
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3.5",
                    i < PAIN_ZONES.length - 1 && "border-b border-[var(--border)]",
                  )}
                >
                  <span className="w-[76px] shrink-0 text-[13px] text-[var(--text-muted)]">
                    {label}
                  </span>
                  <div
                    aria-label={`${label}: ${score.toFixed(1)}`}
                    className="h-[5px] flex-1 rounded-full"
                    style={{ background: painGradient(score) }}
                  />
                  <span
                    className="mono w-[30px] shrink-0 text-right text-[13px] font-medium"
                    style={{ color: painColor(score) }}
                  >
                    {score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top triggers ───────────────────────────────────────── */}
      {data.topTriggers.length > 0 && (
        <div>
          <p className="section-label">Triggers frecuentes</p>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)]">
            {data.topTriggers.map((t, i) => (
              <div
                key={t.triggerType}
                className={cn(
                  "flex items-center gap-3 px-5 py-3.5",
                  i < data.topTriggers.length - 1 && "border-b border-[var(--border)]",
                )}
              >
                <span className="flex-1 text-[13px] text-[var(--text-primary)]">
                  {TRIGGER_LABELS[t.triggerType] ?? t.triggerType}
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="h-[3px] w-[52px] overflow-hidden rounded-full bg-[var(--surface-el)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${(t.days / maxTriggerDays) * 100}%` }}
                    />
                  </div>
                  <span className="mono w-[36px] text-right text-[12px] text-[var(--text-muted)]">
                    {t.days}d
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA ────────────────────────────────────────────────── */}
      <div>
        <Button
          className="w-full"
          disabled={!data.hasEnoughData || generating}
          onClick={handleGeneratePDF}
          type="button"
        >
          {generating
            ? "Generando PDF…"
            : data.hasEnoughData
              ? "Generar PDF para médico"
              : `Necesitas ${14 - data.checkInsCount} registros más`}
        </Button>
        {!data.hasEnoughData && (
          <p className="mt-3 text-center text-[12px] text-[var(--text-faint)]">
            {data.checkInsCount}/14 registros · completa al menos 14 días para generar el reporte
          </p>
        )}
      </div>

      {/* ── Hidden charts for PDF capture ──────────────────────── */}
      {data.hasEnoughData && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            pointerEvents: "none",
          }}
        >
          <div
            ref={trendChartRef}
            style={{
              width: 680,
              height: 300,
              background: "#1c1810",
              padding: "16px 8px 8px 8px",
            }}
          >
            <LineChart
              data={data.trendPoints}
              height={268}
              margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
              width={656}
            >
              <CartesianGrid stroke="rgba(46,39,24,0.8)" strokeDasharray="3 3" />
              <XAxis
                dataKey="dayKey"
                interval={trendInterval}
                stroke="#5a4e3a"
                tick={{ fill: "#5a4e3a", fontSize: 10 }}
                tickFormatter={formatTrendLabel}
              />
              <YAxis
                domain={[0, 10]}
                stroke="#5a4e3a"
                tick={{ fill: "#5a4e3a", fontSize: 10 }}
                tickCount={6}
              />
              <Line
                connectNulls
                dataKey="averagePain"
                dot={false}
                name="Promedio"
                stroke="#d4a24c"
                strokeWidth={2.3}
              />
            </LineChart>
          </div>

          {data.correlationPoints.length >= 14 && (
            <div
              ref={scatterChartRef}
              style={{
                width: 680,
                height: 300,
                background: "#1c1810",
                padding: "16px 8px 8px 8px",
              }}
            >
              <ScatterChart
                height={268}
                margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                width={656}
              >
                <CartesianGrid stroke="rgba(46,39,24,0.8)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="sleepHours"
                  domain={[0, 12]}
                  name="Sueño"
                  stroke="#5a4e3a"
                  tick={{ fill: "#5a4e3a", fontSize: 10 }}
                  tickCount={7}
                  unit="h"
                />
                <YAxis
                  dataKey="masseterPain"
                  domain={[0, 10]}
                  name="Masetero"
                  stroke="#5a4e3a"
                  tick={{ fill: "#5a4e3a", fontSize: 10 }}
                  tickCount={6}
                />
                <ReferenceLine stroke="rgba(212,162,76,0.4)" x={6} />
                <Scatter data={data.correlationPoints} fill="#d4a24c" name="Sueño" />
              </ScatterChart>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
