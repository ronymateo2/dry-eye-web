import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storeTokenFromUrl } from "@/lib/auth";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = storeTokenFromUrl();
    navigate(token ? "/register" : "/?auth_error=no_token", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-svh items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>
  );
}
