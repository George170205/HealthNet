import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { isAwsConfigured } from '../config/aws'
import Logo from '../components/Logo'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const demo = !isAwsConfigured()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role: 'admin' | 'viewer') => {
    setEmail(role === 'admin' ? 'admin@healthnet.com' : 'viewer@healthnet.com')
    setPassword('Demo1234!')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hn-50 via-white to-hn-100 flex items-center justify-center p-4">
      {/* Background decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-hn-300 opacity-20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-hn-500 opacity-15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-hn-200 overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-r from-hn-800 to-hn-700 px-8 py-8 flex flex-col items-center">
            <Logo size="lg" />
            <p className="text-hn-300 text-sm mt-4 text-center">
              Sistema de Monitoreo de Salud en Tiempo Real
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-hn-800 font-bold text-xl mb-6">Iniciar sesión</h2>

            {/* Demo banner */}
            {demo && (
              <div className="mb-5 bg-hn-50 border border-hn-300 rounded-xl p-4">
                <p className="text-xs font-semibold text-hn-700 mb-2">
                  🧪 Modo demo — sin AWS configurado
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemo('admin')}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-hn-800 text-white hover:bg-hn-900 transition-colors"
                  >
                    Admin demo
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('viewer')}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-hn-500 text-white hover:bg-hn-700 transition-colors"
                  >
                    Viewer demo
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-hn-700 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-hn-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-hn-300 text-sm text-hn-800 placeholder:text-hn-300
                      focus:outline-none focus:ring-2 focus:ring-hn-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-hn-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-hn-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-hn-300 text-sm text-hn-800 placeholder:text-hn-300
                      focus:outline-none focus:ring-2 focus:ring-hn-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-hn-400 hover:text-hn-700"
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-hn-800 hover:bg-hn-900 text-white font-semibold text-sm
                  transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verificando…
                  </span>
                ) : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-hn-400 mt-4">
          © {new Date().getFullYear()} Health Net · Monitoreo IoT
        </p>
      </div>
    </div>
  )
}
