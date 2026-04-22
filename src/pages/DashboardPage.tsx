import { useQuery } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth, useUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DashboardScreen, type DashboardData } from "@/components/dashboard/dashboard-screen";

export default function DashboardPage() {
  const user = useUser();
  const { signOut } = useAuth();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard as () => Promise<DashboardData>,
  });

  if (isLoading || !data) {
    return (
      <section>
        <ScreenHeader
          title="Dashboard"
          description="Las correlaciones importan mas que las entradas aisladas. Aqui veremos patrones de dolor, sueno y triggers."
          user={user}
          action={<Button className="px-4 text-[13px]" onClick={signOut} type="button" variant="ghost">Cerrar sesion</Button>}
        />
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
      <ScreenHeader
        title="Dashboard"
        description="Las correlaciones importan mas que las entradas aisladas. Aqui veremos patrones de dolor, sueno y triggers."
        user={user}
        action={<Button className="px-4 text-[13px]" onClick={signOut} type="button" variant="ghost">Cerrar sesion</Button>}
      />
      <DashboardScreen data={data} />
    </section>
  );
}
