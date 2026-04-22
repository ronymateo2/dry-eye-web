// ─── Types ────────────────────────────────────────────────────────────────────

export type View = "main" | "calibrating" | "victorias" | "servo";

// ─── Constants ────────────────────────────────────────────────────────────────

export const FRICTION_LEVELS = [
  {
    val: 0,
    label: "FLUJO\nTOTAL",
    desc: "Casi sin esfuerzo. El hábito salió solo.",
  },
  {
    val: 1,
    label: "MUY\nPOCA",
    desc: "Poca dificultad. Lo hiciste con facilidad.",
  },
  {
    val: 2,
    label: "MODERADA",
    desc: "Algo de esfuerzo, pero normal.",
  },
  {
    val: 3,
    label: "NOTABLE",
    desc: "Costó bastante. Lo hiciste igual.",
  },
  {
    val: 4,
    label: "ALTA",
    desc: "Fue difícil. Que lo hayas hecho vale mucho.",
  },
  {
    val: 5,
    label: "MÁXIMA",
    desc: "Muy difícil. Pero aquí estás.",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function identityLabel(n: number): string {
  if (n === 0) return "Despertando";
  if (n <= 4) return "Comenzando";
  if (n <= 9) return "Constante";
  if (n <= 14) return "Disciplinado";
  if (n <= 19) return "Consolidado";
  return "Automatizado";
}
