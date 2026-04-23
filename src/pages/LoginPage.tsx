import { ScreenHeader } from "@/components/layout/screen-header";
import { GoogleLogoIcon } from "@phosphor-icons/react";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export default function LoginPage() {
  return (
    <section>
      <ScreenHeader
        title="Registro rapido"
        description="Registra dolor y sueno con el minimo esfuerzo posible, incluso en un mal dia."
      />
      <div className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-5">
        <p className="text-[13px] text-[var(--text-muted)]">
          Para continuar, primero inicia sesion con Google.
        </p>
        <a
          href={`${API_BASE}/auth/google`}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[999px] bg-[var(--accent)] px-5 text-[15px] font-medium text-[#121008] hover:bg-[var(--accent-bright)] transition-colors"
        >
          <GoogleLogoIcon size={20} weight="bold" />
          Continuar con Google
        </a>
      </div>
    </section>
  );
}
