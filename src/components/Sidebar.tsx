import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Bell, History, Watch, User, Settings, Cpu,
  LogOut, Sun, Moon, Menu, X
} from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../hooks/useAuth'
import { useDeviceStore } from '../store/deviceStore'

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileOpen, setMobileOpen] = useState(false)

  // Get store details
  const theme = useDeviceStore(s => s.theme)
  const setGlobalTheme = useDeviceStore(s => s.setGlobalTheme)
  const unreadAlertsCount = useDeviceStore(s => s.alerts.filter(a => !a.acknowledged).length)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleTheme = () => {
    setGlobalTheme(theme === 'light' ? 'dark' : 'light')
  }

  const menuItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/monitoring', label: 'Monitoreo', icon: Activity },
    {
      to: '/alerts',
      label: 'Alertas',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined
    },
    { to: '/history', label: 'Historial', icon: History },
    { to: '/profile', label: 'Pacientes y Brazalete', icon: User },
    { to: '/simulator', label: 'Simulador IoT', icon: Cpu },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors duration-300">
      {/* Sidebar Header with Logo */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <Logo size="sm" />
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all active:scale-95"
          title="Cambiar tema del Dashboard"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map(({ to, label, icon: Icon, badge }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-bold transition-all relative group
                ${active
                  ? 'bg-hn-800 text-white dark:bg-hn-500 dark:text-slate-950 shadow-md shadow-hn-900/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={16} className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white dark:text-slate-950' : 'text-slate-400'}`} />
                <span>{label}</span>
              </span>
              {badge !== undefined && (
                <span className={`min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-extrabold rounded-full px-1 border transition-colors
                  ${active
                    ? 'bg-white text-hn-800 border-white dark:bg-slate-950 dark:text-hn-400 dark:border-slate-950'
                    : 'bg-red-500 text-white border-red-500 animate-pulse'
                  }`}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-hn-800 text-white dark:bg-hn-500 dark:text-slate-950 flex items-center justify-center font-black text-xs">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-none">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-1 capitalize font-medium">
              Médico ({user?.role})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-40 transition-colors duration-300">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:block fixed top-0 bottom-0 left-0 w-64 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay / Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 max-w-xs flex flex-col h-full animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
