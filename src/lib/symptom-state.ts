import type { SymptomIntensities, SymptomState } from "@/types/domain";

export function calcSymptomState(s: SymptomIntensities): SymptomState {
  const vals = [
    s.dryness,
    s.burning,
    s.photophobia,
    s.blurry_vision,
    s.stinging ?? 0,
    s.pressure ?? 0,
  ];
  const max = Math.max(...vals);
  const nonZero = vals.filter((v) => v > 0);
  const avg = nonZero.length > 0 ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;

  if (max >= 9 || (max >= 8 && avg >= 6)) return "brote";
  if (max >= 7 || avg >= 5.5) return "reactivo";
  if (max >= 5 || avg >= 3.5) return "sensible";
  if (max >= 2) return "leve";
  return "calmado";
}

export const SYMPTOM_STATE_COLOR: Record<SymptomState, string> = {
  calmado: "var(--pain-low)",
  leve: "var(--pain-low)",
  sensible: "var(--pain-mid)",
  reactivo: "var(--pain-mid)",
  brote: "var(--pain-high)",
};

export const SYMPTOM_STATE_COPY: Record<SymptomState, string> = {
  calmado: "Tu ojo está tranquilo",
  leve: "Leve molestia",
  sensible: "Tu ojo está más sensible hoy",
  reactivo: "Reacción intensa",
  brote: "Brote — considera medidas",
};

export const SYMPTOM_STATE_LABEL: Record<SymptomState, string> = {
  calmado: "Calmado",
  leve: "Leve",
  sensible: "Sensible",
  reactivo: "Reactivo",
  brote: "Brote",
};
