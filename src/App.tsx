import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth, storeTokenFromUrl } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { AppShell } from "@/components/layout/app-shell";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ReportPage = lazy(() => import("@/pages/ReportPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const DropTypesPage = lazy(() => import("@/pages/DropTypesPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));

function AppRoutes() {
  const { auth } = useAuth();
  const isAuthenticated = auth.status === "authenticated";
  const isLoading = auth.status === "loading";

  if (isLoading) {
    return (
      <div
        className="flex min-h-svh items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div className="h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <AppShell isAuthenticated={isAuthenticated}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {isAuthenticated ? (
            <>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/drop-types" element={<DropTypesPage />} />
              <Route path="/login" element={<Navigate to="/register" replace />} />
              <Route path="*" element={<Navigate to="/register" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </Suspense>
    </AppShell>
  );
}

function TokenInit() {
  useEffect(() => {
    storeTokenFromUrl();
  }, []);
  return null;
}

function IosPwaLayoutInit() {
  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const nav = navigator as Navigator & { standalone?: boolean };
    const update = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
      document.documentElement.toggleAttribute("data-ios-pwa", isIOS && isStandalone);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <TokenInit />
      <IosPwaLayoutInit />
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
