import { useEffect, useState } from "react";
import { MoonIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { SleepSheet } from "@/components/forms/sleep-sheet";
import { api } from "@/lib/api";

export function SleepNudge() {
  const [hasSleep, setHasSleep] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.getTodaySleep()
      .then((record) => setHasSleep(Boolean(record)))
      .catch(() => setHasSleep(false));
  }, []);

  if (hasSleep !== false) return null;

  return (
    <>
      <div className="flex items-center justify-between rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] px-4 py-3">
        <div className="flex items-center gap-3">
          <MoonIcon size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Sin registro de sueno hoy
          </p>
        </div>
        <Button variant="subtle" className="shrink-0" onClick={() => setOpen(true)}>
          Registrar
        </Button>
      </div>

      <MobileSheet
        description="Registra las horas y calidad de sueno de anoche."
        open={open}
        title="Sueno de hoy"
        onClose={() => setOpen(false)}
      >
        <SleepSheet onSaved={() => { setOpen(false); setHasSleep(true); }} />
      </MobileSheet>
    </>
  );
}
