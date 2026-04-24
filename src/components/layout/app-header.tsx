import { Link } from "react-router-dom";
import { CalendarIcon } from "@phosphor-icons/react";
import { useUser } from "@/lib/auth";

function formatDate(): string {
  return new Date().toLocaleDateString("es", { day: "numeric", month: "short" }).replace(".", "");
}

function initials(name: string | null | undefined): string {
  if (!name) return "U";
  return name.trim().split(/\s+/).slice(0, 2).map((t) => t[0]?.toUpperCase() ?? "").join("") || "U";
}

export function AppHeader() {
  const user = useUser();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__brand-icon" aria-hidden="true">◎</span>
        <span className="app-header__brand-name">NeuroEye</span>
      </div>
      <div className="app-header__actions">
        <div className="app-header__date-pill" aria-label="Fecha actual">
          <CalendarIcon size={13} />
          <span>{formatDate()}</span>
        </div>
        <Link to="/profile" className="app-header__avatar-link" aria-label="Ir a perfil">
          {user.image ? (
            <img
              alt="Foto de usuario"
              className="app-header__avatar"
              referrerPolicy="no-referrer"
              src={user.image}
            />
          ) : (
            <div className="app-header__avatar app-header__avatar--initials">
              {initials(user.name)}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
