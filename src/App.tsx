import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext, useAuthState } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SimulatorPage from './pages/SimulatorPage'
import MonitoringPage from './pages/MonitoringPage'
import AlertsPage from './pages/AlertsPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import { iotService } from './services/iot'
import { getCredentials } from './services/auth'
import { useDeviceStore } from './store/deviceStore'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 lg:pl-64 min-w-0 flex flex-col">
        <main className="flex-1 p-6 md:p-8 pt-20 lg:pt-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const auth = useAuthState()
  const theme = useDeviceStore(s => s.theme)
  const loadPatientsFromDb = useDeviceStore(s => s.loadPatientsFromDb)

  // Listen to global theme change and apply dark class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    if (auth.loading) return

    let active = true

    if (auth.user) {
      // Cargar pacientes desde la Base de Datos al iniciar sesión
      loadPatientsFromDb()

      const initIot = async () => {
        try {
          const creds = await getCredentials()
          if (active) {
            await iotService.connect(creds)
          }
        } catch (err) {
          console.error('[App] Error conectando a IoT:', err)
        }
      }
      initIot()
    } else {
      iotService.disconnect()
    }

    return () => {
      active = false
    }
  }, [auth.user, auth.loading, loadPatientsFromDb])

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout><DashboardPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoring"
            element={
              <ProtectedRoute>
                <Layout><MonitoringPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Layout><AlertsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <Layout><HistoryPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout><ProfilePage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulator"
            element={
              <ProtectedRoute>
                <Layout><SimulatorPage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
