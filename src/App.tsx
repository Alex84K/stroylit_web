import type { FC } from "react"
import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { useAppDispatch } from "./app/hooks"
import { AppLayout } from "./components/AppLayout"
import { Navbar } from "./components/Navbar"
import { fetchMeAsync } from "./features/auth/authSlice"
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute"
import { PublicOnlyRoute } from "./features/auth/components/PublicOnlyRoute"
import { ForgotPasswordPage } from "./features/auth/pages/ForgotPasswordPage"
import { LoginPage } from "./features/auth/pages/LoginPage"
import { ProfilePage } from "./features/auth/pages/ProfilePage"
import { ProjectsPage } from "./features/projects/pages/ProjectsPage"
import { ProjectDetailPage } from "./features/projects/pages/ProjectDetailPage"
import { EstimateBuilderPage } from "./features/estimates/pages/EstimateBuilderPage"
import { RegisterPage } from "./features/auth/pages/RegisterPage"
import { ResetPasswordPage } from "./features/auth/pages/ResetPasswordPage"
import { VerifyEmailPage } from "./features/auth/pages/VerifyEmailPage"
import { PublicEstimatePage } from "./features/estimates/pages/PublicEstimatePage"
import { LandingPage } from "./pages/LandingPage"
import { PrivacyPage } from "./pages/PrivacyPage"
import { PriceListPage } from "./pages/PriceListPage"
import { getAccessToken, getRefreshToken } from "./utils/api"

/** Shared Navbar + Footer shell wrapper for public auth pages */
const Shell: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-vh-100 d-flex flex-column bg-body-tertiary">
    <Navbar />
    <main className="flex-grow-1">{children}</main>
    <footer className="py-3 bg-surface text-center text-muted border-top">
      <small>© {new Date().getFullYear()} Stroylit. All rights reserved.</small>
    </footer>
  </div>
)

export const App: FC = () => {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const hasToken = getAccessToken() ?? getRefreshToken()
    if (hasToken) {
      void dispatch(fetchMeAsync())
    }
  }, [dispatch])

  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone pages — own layout, no shared Navbar */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Auth routes — use shared shell */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Shell>
                <LoginPage />
              </Shell>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Shell>
                <RegisterPage />
              </Shell>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <Shell>
                <ForgotPasswordPage />
              </Shell>
            </PublicOnlyRoute>
          }
        />

        {/* Public utility routes */}
        <Route
          path="/reset-password"
          element={
            <Shell>
              <ResetPasswordPage />
            </Shell>
          }
        />
        <Route
          path="/verify-email"
          element={
            <Shell>
              <VerifyEmailPage />
            </Shell>
          }
        />
        <Route path="/estimate" element={<PublicEstimatePage />} />

        {/* Protected routes — use AppLayout with Sidebar */}
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProjectsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProjectDetailPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/estimate"
          element={
            <ProtectedRoute>
              <AppLayout>
                <EstimateBuilderPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/estimates/:estimateId"
          element={
            <ProtectedRoute>
              <AppLayout>
                <EstimateBuilderPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/price-list"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PriceListPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
