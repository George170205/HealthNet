import { useState, useEffect, createContext, useContext } from 'react'
import { login, logout, getAuthenticatedUser } from '../services/auth'
import type { AuthUser } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthenticatedUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const u = await login(email, password)
      setUser(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al iniciar sesión')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await logout()
    setUser(null)
  }

  return { user, loading, error, signIn, signOut }
}
