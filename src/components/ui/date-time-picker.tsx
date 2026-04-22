import { useState, type ChangeEvent } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateTimePickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  max?: Date;
  className?: string;
};

function parseValue(iso: string | null): { date: Date | undefined; timeStr: string } {
  if (!iso) return { date: undefined, timeStr: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: undefined, timeStr: "" };
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return { date: d, timeStr: `${hh}:${mm}` };
}

function buildISO(date: Date, timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":");
  const d = new Date(date);
  d.setHours(Number(hStr ?? 0), Number(mStr ?? 0), 0, 0);
  return d.toISOString();
}

function formatDate(date: Date): string {
  const s = date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  return s.replace(/\b([a-z]{3})\b/, (m) => m[0].toUpperCase() + m.slice(1));
}

export function DateTimePicker({ value, onChange, max, className }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const ceiling = max ?? new Date();
  const { date, timeStr } = parseValue(value);

  function handleDateSelect(selected: Date | undefined) {
    if (!selected) { onChange(null); return; }
    const time = timeStr || `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    onChange(buildISO(selected, time));
    setOpen(false);
  }

  function handleTimeChange(e: ChangeEvent<HTMLInputElement>) {
    const t = e.target.value;
    if (!t) { onChange(null); return; }
    onChange(buildISO(date ?? new Date(), t));
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex min-h-12 flex-1 items-center justify-between gap-2",
              "rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4",
              "text-[15px] outline-none transition-colors duration-[160ms]",
              "hover:border-[var(--text-faint)] focus:border-[var(--accent)]",
              date ? "text-[var(--text-primary)]" : "text-[var(--text-faint)]",
            )}
          >
            <span>{date ? formatDate(date) : "Seleccionar fecha"}</span>
            <CaretDownIcon className={cn("size-4 flex-shrink-0 text-[var(--text-muted)] transition-transform duration-[160ms]", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" collisionPadding={12}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            defaultMonth={date ?? ceiling}
            disabled={{ after: ceiling }}
            locale={es}
          />
        </PopoverContent>
      </Popover>

      {/* NOTE: Do NOT add appearance-none or color-scheme:dark — breaks <input type="time"> on iOS Safari */}
      <input
        type="time"
        value={timeStr}
        onChange={handleTimeChange}
        className={cn(
          "h-12 w-28 flex-shrink-0 rounded-[10px] border border-[var(--border)] bg-[var(--surface)]",
          "px-3 font-mono text-base text-[var(--text-primary)] outline-none",
          "transition-colors duration-[160ms] focus:border-[var(--accent)]",
          "[&::-webkit-calendar-picker-indicator]:opacity-0",
          !timeStr && "text-[var(--text-faint)]",
        )}
        placeholder="--:--"
      />
    </div>
  );
}
