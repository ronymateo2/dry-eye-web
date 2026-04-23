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

  return (
    <section className="space-y-8 px-5 pt-4 pb-8">
      {/* ── Summary card ─────────────────────────────── */}
      <div>
        <p className="section-label mb-3">Resumen del periodo</p>
        <div className="space-y-6 rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-5">
          <div>
            <p className="screen-title text-[17px]">{data.checkInsCount} registros</p>
            <p className="screen-subtitle text-[13px]">{data.dateRange}</p>
          </div>

          {data.averageSleepHours !== null && (
            <div>
              <p className="section-label">Sueno promedio</p>
              <p className="text-[15px] text-[var(--text-primary)]">
                {data.averageSleepHours}h
                {data.averageSleepQuality !== null && (
                  <span className="text-[var(--text-muted)]">
                    {" "}
                    · calidad {data.averageSleepQuality} / 10
                  </span>
                )}
              </p>
            </div>
          )}

          <div>
            <p className="section-label">Correlacion sueno ↔ dolor</p>
            {data.spearman !== null ? (
              <>
                <p className="mono text-[22px] font-normal">r = {data.spearman}</p>
                <p className="screen-subtitle text-[13px] mt-1">
                  {data.correlationLabel.charAt(0).toUpperCase() +
                    data.correlationLabel.slice(1)}
                  . Se destacara en la portada del PDF.
                </p>
              </>
            ) : (
              <p className="screen-subtitle text-[13px]">
                {data.correlationPoints.length < 14
                  ? `Faltan ${14 - data.correlationPoints.length} registros matutinos con datos de sueno.`
                  : "No hay suficiente variacion para calcular correlacion."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── PDF button ───────────────────────────────── */}
      <Button
        className="w-full"
        disabled={!data.hasEnoughData || generating}
        onClick={handleGeneratePDF}
        type="button"
        style={!data.hasEnoughData ? { opacity: 0.4 } : undefined}
      >
        {generating
          ? "Generando PDF…"
          : data.hasEnoughData
            ? "Generar PDF para médico"
            : `Necesitas al menos 14 días de datos (${data.checkInsCount}/14)`}
      </Button>

      {/* ── Hidden charts for PDF capture ───────────── */}
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
                  name="Sueno"
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
                <Scatter data={data.correlationPoints} fill="#d4a24c" name="Sueno" />
              </ScatterChart>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
