import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth, storeTokenFromUrl } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { FontProvider } from "@/lib/font";
import { AppShell } from "@/components/layout/app-shell";
import { SplashScreen } from "@/components/layout/splash-screen";
import { ErrorBoundary } from "@/components/layout/error-boundary";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const TodayPage = lazy(() => import("@/pages/TodayPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ReportPage = lazy(() => import("@/pages/ReportPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const TreatmentsPage = lazy(() => import("@/pages/TreatmentsPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));

function AppRoutes() {
  const { auth } = useAuth();
  const location = useLocation();
  const isAuthenticated = auth.status === "authenticated";
  const isLoading = auth.status === "loading";

  return (
    <>
      <SplashScreen isLoading={isLoading} />
      {!isLoading && (
        <AppShell isAuthenticated={isAuthenticated}>
          <ErrorBoundary key={location.pathname}>
          <Suspense fallback={null}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              <Routes location={location}>
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                {isAuthenticated ? (
                  <>
                    <Route path="/today" element={<TodayPage />} />
                    <Route path="/check-in" element={<RegisterPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/report" element={<ReportPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/treatments" element={<TreatmentsPage />} />
                    <Route path="/login" element={<Navigate to="/today" replace />} />
                    <Route path="*" element={<Navigate to="/today" replace />} />
                  </>
                ) : (
                  <>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </>
                )}
              </Routes>
            </motion.div>
          </Suspense>
          </ErrorBoundary>
        </AppShell>
      )}
    </>
  );
}

function TokenInit() {
  useEffect(() => {
    storeTokenFromUrl();
  }, []);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const frame = document.querySelector(".app-frame");
    if (frame) frame.scrollTop = 0;
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <TokenInit />
      <AuthProvider>
        <FontProvider>
        <ThemeProvider>
          <AppRoutes />
          <Toaster />
        </ThemeProvider>
        </FontProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
