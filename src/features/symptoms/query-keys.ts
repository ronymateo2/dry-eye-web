export const symptomKeys = {
  all: ["symptoms"] as const,
  today: () => [...symptomKeys.all, "today"] as const,
};
