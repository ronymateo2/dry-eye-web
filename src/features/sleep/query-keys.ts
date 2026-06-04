export const sleepKeys = {
  all: ["sleep"] as const,
  today: () => [...sleepKeys.all, "today"] as const,
};
