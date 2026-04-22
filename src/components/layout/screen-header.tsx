import { Link } from "react-router-dom";

type Props = {
  title: string;
  description: string;
  action?: React.ReactNode;
  user?: { name?: string | null; image?: string | null } | null;
};

function initials(name: string | null | undefined): string {
  if (!name) return "U";
  return name.trim().split(/\s+/).slice(0, 2).map((t) => t[0]?.toUpperCase() ?? "").join("") || "U";
}

export function ScreenHeader({ title, description, action, user }: Props) {
  const showUser = Boolean(user?.name || user?.image);
  return (
    <header className="mb-8">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="section-label mb-0">NeuroEye Log</p>
        {!showUser && (action ?? null)}
      </div>
      {showUser && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link to="/profile" className="flex min-h-12 flex-1 items-center gap-3 rounded-[var(--radius-full)] border border-[var(--info-border)] bg-[var(--info-bg)] px-3 py-2">
            {user?.image ? (
              <img alt="Foto de usuario" className="h-8 w-8 rounded-full object-cover border border-[rgba(212,162,76,0.35)]" referrerPolicy="no-referrer" src={user.image} />
            ) : (
              <div className="mono flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(212,162,76,0.35)] bg-[var(--surface-el)] text-[11px] font-medium text-[var(--accent)]">
                {initials(user?.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="m-0 text-[10px] font-semibold tracking-[0.12em] text-[var(--text-faint)] uppercase">Sesion</p>
              <p className="m-0 truncate text-[13px] font-medium text-[var(--accent)]">{user?.name ?? "Usuario"}</p>
            </div>
          </Link>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <h1 className="screen-title">{title}</h1>
      <p className="screen-subtitle">{description}</p>
    </header>
  );
}
