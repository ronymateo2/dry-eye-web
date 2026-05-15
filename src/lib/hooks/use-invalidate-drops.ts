import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateDrops() {
  const queryClient = useQueryClient();
  return (dropTypeId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["drops/last"] });
    void queryClient.invalidateQueries({ queryKey: ["drops/last-per-type"] });
    void queryClient.invalidateQueries({
      queryKey: dropTypeId ? ["drops/recent", dropTypeId] : ["drops/recent"],
    });
    void queryClient.invalidateQueries({ queryKey: ["drops/recent-all"] });
    void queryClient.invalidateQueries({ queryKey: ["vials/active"] });
    void queryClient.invalidateQueries({ queryKey: ["calendar/events/today"] });
  };
}
