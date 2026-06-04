import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/report-error";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, `render${info.componentStack?.split("\n")[1] ?? ""}`);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "24px",
          textAlign: "center",
          background: "var(--bg)",
          color: "var(--text-primary)",
        }}
      >
        <p style={{ fontSize: "18px", fontWeight: 600 }}>Algo salió mal</p>
        <p style={{ color: "var(--text-muted)", maxWidth: "320px" }}>
          Ocurrió un error inesperado. Tus datos están guardados.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "12px 24px",
            borderRadius: "var(--radius-full)",
            background: "var(--accent)",
            color: "var(--bg)",
            fontWeight: 600,
          }}
        >
          Recargar
        </button>
      </div>
    );
  }
}
