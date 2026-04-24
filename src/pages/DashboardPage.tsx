import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { DashboardScreen, type DashboardData } from "@/components/dashboard/dashboard-screen";

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard as () => Promise<DashboardData>,
  });

  if (isLoading || !data) {
    return (
      <section>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <DashboardScreen data={data} />
    </section>
  );
}
