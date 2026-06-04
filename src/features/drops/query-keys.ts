export const dropKeys = {
  all: ["drops"] as const,
  last: () => [...dropKeys.all, "last"] as const,
  lastPerType: () => [...dropKeys.all, "last-per-type"] as const,
  statsPerType: () => [...dropKeys.all, "stats-per-type"] as const,
  recent: (dropTypeId: string) => [...dropKeys.all, "recent", dropTypeId] as const,
  recentAll: () => [...dropKeys.all, "recent-all"] as const,
  recentNoVial: (dropTypeId: string, hours: number) =>
    [...dropKeys.all, "recent-no-vial", dropTypeId, hours] as const,
};

export const dropTypeKeys = {
  all: ["drop-types"] as const,
  list: () => [...dropTypeKeys.all] as const,
  archived: () => [...dropTypeKeys.all, "archived"] as const,
};

export const vialKeys = {
  all: ["vials"] as const,
  active: () => [...vialKeys.all, "active"] as const,
  history: () => [...vialKeys.all, "history"] as const,
};
