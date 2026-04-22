import { useQuery } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth, useUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ReportScreen, type ReportData } from "@/components/report/report-screen";

type ReportResult = ReportData | { ok: false; message: string };

export default function ReportPage() {
  const user = useUser();
  const { signOut } = useAuth();
  const { data, isLoading } = useQuery<ReportResult>({
    queryKey: ["report"],
    queryFn: api.getReport as () => Promise<ReportResult>,
  });

  if (isLoading || !data) {
    return (
      <section>
        <ScreenHeader
          title="Reporte"
          description="Preparamos un resumen claro para consulta medica y exportacion PDF."
          user={user}
          action={<Button className="px-4 text-[13px]" onClick={signOut} type="button" variant="ghost">Cerrar sesion</Button>}
        />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-md)]" />
          ))}
        </div>
      </section>
    );
  }

  if (!data.ok) {
    return (
      <section>
        <ScreenHeader
          title="Reporte"
          description="Preparamos un resumen claro para consulta medica y exportacion PDF."
          user={user}
          action={<Button className="px-4 text-[13px]" onClick={signOut} type="button" variant="ghost">Cerrar sesion</Button>}
        />
        <p className="text-[var(--pain-high)] text-[14px] px-5 pt-4">
          {data.message}
        </p>
      </section>
    );
  }

  return (
    <section>
      <ScreenHeader
        title="Reporte"
        description="Preparamos un resumen claro para consulta medica y exportacion PDF."
        user={user}
        action={<Button className="px-4 text-[13px]" onClick={signOut} type="button" variant="ghost">Cerrar sesion</Button>}
      />
      <ReportScreen data={data} />
    </section>
  );
}
