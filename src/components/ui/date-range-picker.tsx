import { DateTimePicker } from "@/components/ui/date-time-picker";

type DateRangePickerProps = {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
  className?: string;
};

export function DateRangePicker({ from, to, onChange, className }: DateRangePickerProps) {
  return (
    <div className={className}>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <p className="text-[11px] text-[var(--text-faint)]">Inicio</p>
          <DateTimePicker
            value={from}
            onChange={(v) => onChange(v, to)}
            dateOnly
          />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-[11px] text-[var(--text-faint)]">Fin</p>
          <DateTimePicker
            value={to}
            onChange={(v) => onChange(from, v)}
            dateOnly
          />
        </div>
      </div>
    </div>
  );
}
