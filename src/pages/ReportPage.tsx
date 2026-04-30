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
      <section className="space-y-6 pt-2">
        {/* period + count */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-[90px] rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-[160px] rounded-[var(--radius-sm)]" />
          </div>
          <Skeleton className="h-10 w-[52px] rounded-[var(--radius-sm)]" />
        </div>
        {/* correlation hero */}
        <Skeleton className="h-[116px] w-full rounded-[var(--radius-lg)]" />
        {/* stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-[90px] rounded-[var(--radius-lg)]" />
          <Skeleton className="h-[90px] rounded-[var(--radius-lg)]" />
        </div>
        {/* pain zones */}
        <Skeleton className="h-[220px] w-full rounded-[var(--radius-lg)]" />
        {/* cta */}
        <Skeleton className="h-12 w-full rounded-[var(--radius-full)]" />
      </section>
    );
  }

  if (!data.ok) {
    return (
      <section>
        <p className="px-5 pt-4 text-[14px] text-[var(--pain-high)]">
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
