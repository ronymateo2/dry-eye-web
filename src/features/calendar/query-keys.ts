export const calendarKeys = {
  all: ["calendar"] as const,
  eventsToday: () => [...calendarKeys.all, "events-today"] as const,
  status: () => [...calendarKeys.all, "status"] as const,
};
