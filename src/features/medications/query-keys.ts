export const medicationKeys = {
  all: ["medications"] as const,
  list: () => [...medicationKeys.all] as const,
  archived: () => [...medicationKeys.all, "archived"] as const,
  intakesToday: () => [...medicationKeys.all, "intakes", "today"] as const,
  intakesLastPerMed: () => [...medicationKeys.all, "intakes", "last-per-med"] as const,
};
