import { Skeleton } from "@/components/ui/skeleton";

export function FeedSkeleton() {
  return (
    <div className="space-y-8">
      {[["checkin", "slim", "slim"], ["checkin", "slim"], ["slim", "checkin"]].map((group, i) => (
        <div key={i} className="space-y-2.5">
          <Skeleton className="h-7 w-24 rounded-full" />
          {group.map((type, j) => (
            <Skeleton
              key={j}
              className={
                type === "checkin"
                  ? "h-28 w-full rounded-[14px]"
                  : "h-14 w-full rounded-[14px]"
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
