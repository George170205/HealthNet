import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hn-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-hn-300 border-t-hn-800 rounded-full animate-spin" />
          <p className="text-hn-700 text-sm">Verificando sesión…</p>
        </div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />
}
