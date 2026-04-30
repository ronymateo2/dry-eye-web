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

// ─── UI color helpers ─────────────────────────────────────────────────────

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

  const isLight = document.documentElement.dataset.theme === "light";
  const chartColors = {
    bg:     isLight ? "#FFFFFF"               : "#1c1810",
    grid:   isLight ? "rgba(237,234,245,0.8)" : "rgba(46,39,24,0.8)",
    axis:   isLight ? "#7E7BA2"               : "#5a4e3a",
    accent: isLight ? "#7C6DCD"               : "#d4a24c",
    refLine: isLight ? "rgba(124,109,205,0.4)" : "rgba(212,162,76,0.4)",
  };

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

      // ─── Color palette (theme-aware) ──────────────────────────────
      const light = document.documentElement.dataset.theme === "light";
      const chartBg = light ? "#FFFFFF" : "#1c1810";

      const bg: [number, number, number]          = light ? [240, 239, 248] : [18,  16,  8];
      const surface: [number, number, number]     = light ? [255, 255, 255] : [28,  24,  16];
      const surfaceEl: [number, number, number]   = light ? [234, 232, 248] : [37,  32,  20];
      const border: [number, number, number]      = light ? [237, 234, 245] : [46,  39,  24];
      const textPrimary: [number, number, number] = light ? [30,  26,  60]  : [240, 228, 200];
      const textMuted: [number, number, number]   = light ? [92,  89,  133] : [168, 147, 117];
      const textFaint: [number, number, number]   = light ? [126, 123, 162] : [122, 106, 79];
      const accent: [number, number, number]      = light ? [124, 109, 205] : [212, 162, 76];
      const painLow: [number, number, number]     = light ? [92,  200, 160] : [92,  184, 90];
      const painMid: [number, number, number]     = light ? [244, 162, 90]  : [224, 147, 42];
      const painHigh: [number, number, number]    = light ? [244, 112, 112] : [204, 63,  48];

      const getPainRgb = (score: number): [number, number, number] =>
        score >= 7 ? painHigh : score >= 4 ? painMid : painLow;

      const getCorrRgb = (r: number): [number, number, number] =>
        r <= -0.3 ? painLow : r >= 0.3 ? painHigh : painMid;

      const fillPage = () => {
        doc.setFillColor(...bg);
        doc.rect(0, 0, pageW, pageH, "F");
      };

      const accentStripe = () => {
        doc.setFillColor(...accent);
        doc.rect(0, 0, pageW, 2.5, "F");
      };

      const card = (x: number, y: number, w: number, h: number) => {
        doc.setFillColor(...surface);
        doc.setDrawColor(...border);
        doc.rect(x, y, w, h, "FD");
      };

      const sLabel = (text: string, x: number, y: number) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...textFaint);
        doc.text(text.toUpperCase(), x, y);
      };

      const today = new Date().toLocaleDateString("es-CO", {
        day: "2-digit", month: "long", year: "numeric",
      });

      // ─── PAGE 1: Cover ────────────────────────────────────────────
      fillPage();
      accentStripe();

      // Left accent bar
      doc.setFillColor(...accent);
      doc.rect(margin, 36, 3, 34, "F");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(...textPrimary);
      doc.text("Reporte para Médico", margin + 9, 49);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(...textMuted);
      doc.text("NeuroEye Log", margin + 9, 58);

      let metaY = 68;
      if (data.userName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...textPrimary);
        doc.text(data.userName, margin + 9, metaY);
        metaY += 9;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...textMuted);
      doc.text(data.dateRange, margin + 9, metaY);
      doc.text(`Generado el ${today}`, margin + 9, metaY + 7);

      // Correlation hero card
      let nextY = 106;
      if (data.spearman !== null) {
        const corrRgb = getCorrRgb(data.spearman);
        card(margin, nextY, contentW, 56);

        sLabel("Correlación sueño ↔ dolor · Spearman", margin + 5, nextY + 9);

        const rSign = data.spearman > 0 ? "+" : "";
        const rStr = `r = ${rSign}${data.spearman}`;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(34);
        doc.setTextColor(...corrRgb);
        doc.text(rStr, margin + 5, nextY + 32);

        const rWidth = doc.getTextWidth(rStr);
        doc.setFontSize(9);
        doc.text(data.correlationLabel.toUpperCase(), margin + 5 + rWidth + 5, nextY + 32);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...textMuted);
        doc.text(`${data.checkInsCount} registros · ${data.dateRange}`, margin + 5, nextY + 44);

        nextY += 64;
      } else {
        card(margin, nextY, contentW, 44);
        sLabel("Registros totales", margin + 5, nextY + 9);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.setTextColor(...textPrimary);
        doc.text(`${data.checkInsCount}`, margin + 5, nextY + 33);
        nextY += 52;
      }

      // Stats row
      const hasStats = data.averageSleepHours !== null || data.dropsPerDay !== null;
      if (hasStats) {
        const statH = 42;
        const bothStats = data.averageSleepHours !== null && data.dropsPerDay !== null;
        const statW = bothStats ? (contentW - 5) / 2 : contentW;
        let sx = margin;

        if (data.averageSleepHours !== null) {
          card(sx, nextY, statW, statH);
          sLabel("Sueño prom.", sx + 5, nextY + 9);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(...textPrimary);
          doc.text(`${data.averageSleepHours}h`, sx + 5, nextY + 28);
          if (data.averageSleepQuality !== null) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(...textMuted);
            doc.text(`calidad ${data.averageSleepQuality}/10`, sx + 5, nextY + 38);
          }
          sx += statW + 5;
        }

        if (data.dropsPerDay !== null) {
          card(sx, nextY, statW, statH);
          sLabel("Gotas / día", sx + 5, nextY + 9);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(...textPrimary);
          doc.text(`${data.dropsPerDay}`, sx + 5, nextY + 28);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...textMuted);
          doc.text("promedio diario", sx + 5, nextY + 38);
        }
      }

      // Disclaimer footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...textFaint);
      const disclaimer =
        "Este reporte es generado automáticamente por NeuroEye Log y es informativo únicamente. No constituye diagnóstico médico. Los coeficientes de correlación (Spearman) indican asociación estadística, no causalidad.";
      doc.text(doc.splitTextToSize(disclaimer, contentW), margin, 273);

      // ─── PAGE 2: Pain zones + Triggers ───────────────────────────
      doc.addPage();
      fillPage();
      accentStripe();

      let y = 22;

      // Compact summary table
      sLabel("Resumen del período", margin, y);
      y += 7;

      const summaryRows: [string, string][] = [
        ["Registros", `${data.checkInsCount}`],
        ["Período", data.dateRange],
      ];
      if (data.averageSleepHours !== null) {
        summaryRows.push(["Sueño prom.", data.averageSleepQuality !== null
          ? `${data.averageSleepHours}h · calidad ${data.averageSleepQuality}/10`
          : `${data.averageSleepHours}h`]);
      }
      if (data.dropsPerDay !== null) {
        summaryRows.push(["Gotas/día", `${data.dropsPerDay}`]);
      }
      if (data.spearman !== null) {
        summaryRows.push(["Correlación", `r = ${data.spearman} (${data.correlationLabel})`]);
      }

      doc.setFontSize(10);
      for (const [label, value] of summaryRows) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textMuted);
        doc.text(label, margin, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textPrimary);
        doc.text(value, margin + 60, y);
        y += 4;
        doc.setDrawColor(...border);
        doc.line(margin, y, pageW - margin, y);
        y += 8;
      }

      y += 6;

      // Pain zones with gradient bars
      if (data.averagePain) {
        const ap = data.averagePain;
        sLabel("Dolor promedio por zona (0 – 10)", margin, y);
        y += 8;

        const zones: { key: keyof ReportAveragePain; label: string }[] = [
          { key: "eyelid",    label: "Párpados" },
          { key: "temple",    label: "Sienes" },
          { key: "masseter",  label: "Masetero" },
          { key: "cervical",  label: "Cervical" },
          { key: "orbital",   label: "Orbital" },
        ];

        const zLabelW = 30;
        const zScoreW = 18;
        const barX = margin + zLabelW;
        const barW = contentW - zLabelW - zScoreW;
        const barH = 5;
        const zRowH = 16;

        for (const { key, label } of zones) {
          const score = ap[key];
          const painRgb = getPainRgb(score);
          const fillW = (score / 10) * barW;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(...textMuted);
          doc.text(label, margin, y + 4);

          // Track
          doc.setFillColor(...surfaceEl);
          doc.rect(barX, y, barW, barH, "F");

          // Fill
          if (fillW > 0) {
            doc.setFillColor(...painRgb);
            doc.rect(barX, y, Math.max(fillW, 1.5), barH, "F");
          }

          // Score
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(...painRgb);
          doc.text(score.toFixed(1), pageW - margin, y + 4, { align: "right" });

          y += zRowH;
        }

        y += 8;
      }

      // Triggers with relative bars
      if (data.topTriggers.length > 0) {
        sLabel("Triggers frecuentes", margin, y);
        y += 8;

        const maxDays = data.topTriggers[0]?.days ?? 1;
        const tLabelW = 46;
        const tScoreW = 16;
        const tBarX = margin + tLabelW;
        const tBarW = contentW - tLabelW - tScoreW;
        const tBarH = 4;
        const tRowH = 13;

        for (const trigger of data.topTriggers) {
          const fillW = (trigger.days / maxDays) * tBarW;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(...textMuted);
          doc.text(TRIGGER_LABELS[trigger.triggerType] ?? trigger.triggerType, margin, y + 3);

          doc.setFillColor(...surfaceEl);
          doc.rect(tBarX, y, tBarW, tBarH, "F");

          doc.setFillColor(...accent);
          doc.rect(tBarX, y, Math.max(fillW, 1.5), tBarH, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(...textPrimary);
          doc.text(`${trigger.days}d`, pageW - margin, y + 3, { align: "right" });

          y += tRowH;
        }
      }

      // ─── PAGE 3: Trend chart ──────────────────────────────────────
      if (trendChartRef.current && data.trendPoints.length > 0) {
        const canvas = await html2canvas(trendChartRef.current, {
          backgroundColor: chartBg,
          scale: 2,
          useCORS: true,
        });
        doc.addPage();
        fillPage();
        accentStripe();

        y = 22;
        sLabel("Tendencia del dolor", margin, y);
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.setTextColor(...textPrimary);
        doc.text("Evolución del Dolor en el Tiempo", margin, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...textMuted);
        doc.text("Promedio diario de todas las zonas · escala 0 – 10", margin, y);
        y += 8;
        const tImgW = contentW;
        const tImgH = (canvas.height / canvas.width) * tImgW;
        doc.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, tImgW, tImgH);
      }

      // ─── PAGE 4: Scatter chart ────────────────────────────────────
      if (
        scatterChartRef.current &&
        data.correlationPoints.length >= 14 &&
        data.spearman !== null
      ) {
        const canvas = await html2canvas(scatterChartRef.current, {
          backgroundColor: chartBg,
          scale: 2,
          useCORS: true,
        });
        doc.addPage();
        fillPage();
        accentStripe();

        y = 22;
        sLabel("Correlación estadística", margin, y);
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.setTextColor(...textPrimary);
        doc.text("Sueño ↔ Dolor de Masetero", margin, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...textMuted);
        doc.text(
          `Spearman: r = ${data.spearman} · ${data.correlationLabel}`,
          margin,
          y,
        );
        y += 8;
        const sImgW = contentW;
        const sImgH = (canvas.height / canvas.width) * sImgW;
        doc.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, sImgW, sImgH);
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
              background: chartColors.bg,
              padding: "16px 8px 8px 8px",
            }}
          >
            <LineChart
              data={data.trendPoints}
              height={268}
              margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
              width={656}
            >
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="dayKey"
                interval={trendInterval}
                stroke={chartColors.axis}
                tick={{ fill: chartColors.axis, fontSize: 10 }}
                tickFormatter={formatTrendLabel}
              />
              <YAxis
                domain={[0, 10]}
                stroke={chartColors.axis}
                tick={{ fill: chartColors.axis, fontSize: 10 }}
                tickCount={6}
              />
              <Line
                connectNulls
                dataKey="averagePain"
                dot={false}
                name="Promedio"
                stroke={chartColors.accent}
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
                background: chartColors.bg,
                padding: "16px 8px 8px 8px",
              }}
            >
              <ScatterChart
                height={268}
                margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                width={656}
              >
                <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="sleepHours"
                  domain={[0, 12]}
                  name="Sueño"
                  stroke={chartColors.axis}
                  tick={{ fill: chartColors.axis, fontSize: 10 }}
                  tickCount={7}
                  unit="h"
                />
                <YAxis
                  dataKey="masseterPain"
                  domain={[0, 10]}
                  name="Masetero"
                  stroke={chartColors.axis}
                  tick={{ fill: chartColors.axis, fontSize: 10 }}
                  tickCount={6}
                />
                <ReferenceLine stroke={chartColors.refLine} x={6} />
                <Scatter data={data.correlationPoints} fill={chartColors.accent} name="Sueño" />
              </ScatterChart>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
