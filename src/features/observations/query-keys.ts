export const observationKeys = {
  all: ["observations"] as const,
  list: () => [...observationKeys.all] as const,
  search: (q: string) => [...observationKeys.all, "search", q] as const,
  occurrences: () => [...observationKeys.all, "occurrences"] as const,
  prevAll: () => [...observationKeys.all, "prev"] as const,
  prev: (id: string) => [...observationKeys.all, "prev", id] as const,
  prevDetail: (id: string) => [...observationKeys.all, "prev", id, "detail"] as const,
};
