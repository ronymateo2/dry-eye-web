import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi, dashboardKeys } from "@/features/dashboard";
import { DashboardScreen, type DashboardSummaryData, type DashboardCorrelationsData } from "@/components/dashboard/dashboard-screen";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

export default function DashboardPage() {
  const [showCorrelations, setShowCorrelations] = useLocalStorage("weqe_show_correlations", false);

  const { data: summary, isLoading: isLoadingSummary } = useQuery<DashboardSummaryData>({
    queryKey: dashboardKeys.summary(),
    queryFn: dashboardApi.getSummary as () => Promise<DashboardSummaryData>,
  });

  const { data: correlations, isLoading: isLoadingCorrelations } = useQuery<DashboardCorrelationsData>({
    queryKey: dashboardKeys.correlations(),
    queryFn: dashboardApi.getCorrelations as () => Promise<DashboardCorrelationsData>,
    enabled: showCorrelations,
  });

  if (isLoadingSummary || !summary) {
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
    <section className="space-y-10">
      <DashboardScreen summary={summary} correlations={correlations} />

      {!showCorrelations && !correlations && (
        <div className="flex justify-center pb-6">
          <Button 
            variant="subtle" 
            onClick={() => setShowCorrelations(true)}
            className="w-full max-w-[300px]"
          >
            Generar Analíticas Clínicas
          </Button>
        </div>
      )}

      {showCorrelations && isLoadingCorrelations && !correlations && (
        <section className="space-y-10">
          <section>
            <p className="section-label">Correlacion sueno ↔ dolor</p>
            <div className="h-[200px] w-full animate-pulse rounded-[16px] bg-[var(--surface-card)]" />
          </section>
        </section>
      )}
    </section>
  );
}
