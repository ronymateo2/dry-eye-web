import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { ReportScreen, type ReportData } from "@/components/report/report-screen";

type ReportResult = ReportData | { ok: false; message: string };

export default function ReportPage() {
  const { data, isLoading } = useQuery<ReportResult>({
    queryKey: ["report"],
    queryFn: api.getReport as () => Promise<ReportResult>,
  });

  if (isLoading || !data) {
    return (
      <section>
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
        <p className="text-[var(--pain-high)] text-[14px] px-5 pt-4">
          {data.message}
        </p>
      </section>
    );
  }

  return (
    <section>
      <ReportScreen data={data} />
    </section>
  );
}
