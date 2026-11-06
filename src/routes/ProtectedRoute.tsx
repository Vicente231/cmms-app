import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-muted-foreground">
      Loading…
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}
