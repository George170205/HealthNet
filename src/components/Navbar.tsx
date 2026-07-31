import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Cpu, LogOut, Bell,
  X, Check, AlertTriangle, AlertCircle, ShieldAlert,
} from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../hooks/useAuth'
import { useDeviceStore } from '../store/deviceStore'
import type { Alert } from '../types'

function getAlertIcon(type: Alert['type']) {
  switch (type) {
    case 'fall':
      return { Icon: AlertTriangle, color: 'text-red-500 bg-red-50' }
    case 'high_hr':
    case 'low_hr':
      return { Icon: AlertCircle, color: 'text-amber-500 bg-amber-50' }
    case 'high_temp':
      return { Icon: ShieldAlert, color: 'text-orange-500 bg-orange-50' }
    default:
      return { Icon: Bell, color: 'text-hn-500 bg-hn-50' }
  }
}

function formatTime(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 10) return 'Ahora'
  if (seconds < 60) return `Hace ${seconds} s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `Hace ${hours} h`
}

export default function Navbar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadAlertsList = useDeviceStore(s => s.alerts.filter(a => !a.acknowledged))
  const devices = useDeviceStore(s => s.devices)
  const acknowledgeAlert = useDeviceStore(s => s.acknowledgeAlert)
  const clearAlerts = useDeviceStore(s => s.clearAlerts)

  const unreadAlertsCount = unreadAlertsList.length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/simulator', label: 'Simulador', icon: Cpu },
  ]

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-hn-300 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Logo size="sm" />

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${active
                    ? 'bg-hn-100 text-hn-800'
                    : 'text-hn-700 hover:bg-hn-50 hover:text-hn-800'
                  }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Alerts badge dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`relative p-2 rounded-lg transition-colors hover:bg-hn-50 focus:outline-none ${dropdownOpen ? 'bg-hn-50 text-hn-800' : 'text-hn-700'}`}
              title="Alertas"
            >
              <Bell size={18} />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                  {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-hn-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-hn-100 flex items-center justify-between bg-hn-50">
                  <h3 className="text-xs font-extrabold text-hn-800">Alertas Activas</h3>
                  {unreadAlertsCount > 0 && (
                    <button
                      onClick={() => {
                        clearAlerts()
                        setDropdownOpen(false)
                      }}
                      className="text-[10px] text-hn-500 hover:text-red-500 font-bold transition-colors"
                    >
                      Limpiar todas
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-hn-100">
                  {unreadAlertsCount === 0 ? (
                    <div className="p-8 text-center text-hn-400">
                      <Check size={24} className="mx-auto text-emerald-500 mb-2" />
                      <p className="text-xs font-bold text-hn-800">¡Todo bajo control!</p>
                      <p className="text-[10px] mt-0.5">No hay alertas sin leer.</p>
                    </div>
                  ) : (
                    unreadAlertsList.map(alert => {
                      const { Icon, color } = getAlertIcon(alert.type)
                      const patientName = devices[alert.deviceId]?.patientName || alert.deviceId
                      return (
                        <div key={alert.id} className="p-3.5 hover:bg-hn-50 transition-colors flex gap-3 items-start group">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                            <Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-bold text-hn-800 truncate">{patientName}</p>
                              <span className="text-[9px] text-hn-400 font-medium whitespace-nowrap">{formatTime(alert.timestamp)}</span>
                            </div>
                            <p className="text-xs text-hn-600 mt-0.5 font-medium leading-normal">{alert.message}</p>
                            <p className="text-[9px] text-hn-400 mt-1 font-mono">ID: {alert.deviceId}</p>
                          </div>
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="p-1 rounded hover:bg-hn-200 text-hn-400 hover:text-hn-700 transition-colors flex-shrink-0"
                            title="Marcar como leída"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User */}
          <div className="flex items-center gap-2 pl-3 border-l border-hn-300">
            <div className="w-8 h-8 rounded-full bg-hn-800 flex items-center justify-center text-white text-xs font-bold">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-hn-800 leading-none">{user?.email}</p>
              <p className="text-[10px] text-hn-500 leading-none mt-0.5 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-hn-500 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
