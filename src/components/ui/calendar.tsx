import { useRef, useEffect, type ComponentProps } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  formatters,
  components,
  ...props
}: ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("group/calendar w-fit p-3 [--cell-size:2.5rem]", className)}
      captionLayout={captionLayout}
      formatters={formatters}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn("relative flex flex-col gap-2", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-1", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between", defaultClassNames.nav),
        button_previous: cn(
          "h-[--cell-size] w-[--cell-size] inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--surface-el)] hover:text-[var(--accent)] transition-colors duration-[160ms] aria-disabled:opacity-30 aria-disabled:pointer-events-none select-none p-0",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "h-[--cell-size] w-[--cell-size] inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--surface-el)] hover:text-[var(--accent)] transition-colors duration-[160ms] aria-disabled:opacity-30 aria-disabled:pointer-events-none select-none p-0",
          defaultClassNames.button_next,
        ),
        month_caption: cn("flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]", defaultClassNames.month_caption),
        caption_label: cn("text-[13px] font-medium text-[var(--text-primary)] select-none capitalize", defaultClassNames.caption_label),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn("w-10 h-10 shrink-0 overflow-hidden flex items-end justify-center pb-1 select-none text-[11px] font-semibold uppercase text-[var(--text-faint)]", defaultClassNames.weekday),
        week: cn("flex", defaultClassNames.week),
        day: cn("group/day relative w-10 shrink-0 select-none p-0 text-center", defaultClassNames.day),
        today: cn("after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:w-3 after:rounded-full after:bg-[var(--accent)] after:content-['']", defaultClassNames.today),
        outside: cn("text-[var(--text-faint)] opacity-40", defaultClassNames.outside),
        disabled: cn("text-[var(--text-faint)] opacity-30 pointer-events-none", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
        ),
        Chevron: ({ orientation, className, ...props }) => {
          if (orientation === "right") return <CaretRightIcon className={cn("size-4", className)} {...props} />;
          return <CaretLeftIcon className={cn("size-4", className)} {...props} />;
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: ComponentProps<typeof DayButton>) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      className={cn(
        "size-[--cell-size] flex-col gap-1 font-normal leading-none",
        "text-[var(--text-primary)] hover:bg-[var(--surface-el)] hover:text-[var(--text-primary)]",
        "data-[selected-single=true]:bg-[var(--accent)] data-[selected-single=true]:text-[#121008] data-[selected-single=true]:hover:bg-[var(--accent-bright)] data-[selected-single=true]:rounded-[var(--radius-sm)]",
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
