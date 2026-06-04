export const checkInKeys = {
  all: ["check-ins"] as const,
  last: () => [...checkInKeys.all, "last"] as const,
};
