import { useState, useEffect } from 'react'
import { useDeviceStore } from '../store/deviceStore'
import {
  User, Shield, AlertTriangle, Save, Key, CheckCircle,
  Watch, Cpu, Wifi, Battery, Calendar, Bell, Sliders, Activity
} from 'lucide-react'
import SmartwatchSimulator from '../components/SmartwatchSimulator'

export default function ProfilePage() {
  const devices = useDeviceStore(s => Object.values(s.devices))
  const updateDeviceProfile = useDeviceStore(s => s.updateDeviceProfile)
  const updateDeviceConfig = useDeviceStore(s => s.updateDeviceConfig)

  const [selectedId, setSelectedId] = useState<string>(devices[0]?.deviceId || '')

  const device = devices.find(d => d.deviceId === selectedId) || devices[0]

  // Local state for profile inputs
  const [profileForm, setProfileForm] = useState({
    name: '',
    age: '',
    gender: '',
    weight: '',
    height: '',
    phone: '',
    emergencyContact: '',
  })

  // Local state for alert threshold configuration
  const [hrMin, setHrMin] = useState('50')
  const [hrMax, setHrMax] = useState('110')
  const [tempMax, setTempMax] = useState('38.0')
  const [watchTheme, setWatchTheme] = useState<'light' | 'dark'>('dark')
  const [notificationsActive, setNotificationsActive] = useState(true)

  const [profileSuccess, setProfileSuccess] = useState(false)
  const [configSuccess, setConfigSuccess] = useState(false)
  const [loadedId, setLoadedId] = useState('')

  // Sync state only when the selected device changes (not on every telemetry packet tick)
  useEffect(() => {
    if (device && device.deviceId !== loadedId) {
      setProfileForm({
        name: device.profile?.name || '',
        age: device.profile?.age || '',
        gender: device.profile?.gender || '',
        weight: device.profile?.weight || '',
        height: device.profile?.height || '',
        phone: device.profile?.phone || '',
        emergencyContact: device.profile?.emergencyContact || '',
      })
      if (device.config) {
        setHrMin(String(device.config.hrMin))
        setHrMax(String(device.config.hrMax))
        setTempMax(String(device.config.tempMax))
        setWatchTheme(device.config.watchTheme)
        setNotificationsActive(device.config.notificationsActive)
      }
      setLoadedId(device.deviceId)
    }
  }, [device, loadedId])

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-hn-100 dark:bg-hn-500/10 flex items-center justify-center mb-4">
          <Activity size={28} className="text-hn-600 dark:text-hn-400" />
        </div>
        <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200">Sin datos de pacientes</h2>
        <p className="text-sm text-slate-400 max-w-xs mt-1">
          Inicia la simulación en el **Simulador IoT** para registrar pacientes y configurar sus perfiles y brazaletes.
        </p>
      </div>
    )
  }

  // Set default selected ID if not set
  if (!selectedId && device) {
    setSelectedId(device.deviceId)
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    updateDeviceProfile(selectedId, profileForm)
    setProfileSuccess(true)
    setTimeout(() => setProfileSuccess(false), 3000)
  }

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    updateDeviceConfig(selectedId, {
      hrMin: parseInt(hrMin),
      hrMax: parseInt(hrMax),
      tempMax: parseFloat(tempMax),
      watchTheme,
      notificationsActive,
    })
    setConfigSuccess(true)
    setTimeout(() => setConfigSuccess(false), 3000)
  }

  const serialNumber = `HN-ESP32-${device.deviceId.replace(/[^0-9]/g, '') || '90481'}`

  return (
    <div className="space-y-6">
      {/* Top Header & Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">Perfil y Configuración de Pacientes</h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide">
            Administración Centralizada de Dispositivos y Parámetros Clínicos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <User size={16} className="text-slate-400" />
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none transition-all cursor-pointer"
          >
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.patientName} ({d.deviceId})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Forms */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Patient Profile Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2">
              <User size={16} className="text-hn-600 dark:text-hn-400" />
              Datos Fisiológicos del Paciente
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all font-bold"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Edad
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.age}
                    onChange={e => setProfileForm({ ...profileForm, age: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all font-bold"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Género
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.gender}
                    onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all font-bold"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Peso
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.weight}
                    onChange={e => setProfileForm({ ...profileForm, weight: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all font-bold"
                  />
                </div>

                {/* Height */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Estatura
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.height}
                    onChange={e => setProfileForm({ ...profileForm, height: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all font-bold"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all font-bold"
                  />
                </div>
              </div>

              {/* Emergency contact */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Contacto de Emergencia
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.emergencyContact}
                  onChange={e => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all font-bold"
                />
              </div>

              {/* Save profile */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-hn-800 text-white hover:bg-hn-900 dark:bg-hn-500 dark:text-slate-950 dark:hover:bg-hn-600 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-hn-950/10"
                >
                  <Save size={13} />
                  Guardar Perfil
                </button>
                {profileSuccess && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fade-in">
                    <CheckCircle size={14} />
                    Datos de perfil actualizados.
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Alert Threshold & Watch Style Config Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2">
              <Sliders size={16} className="text-hn-600 dark:text-hn-400" />
              Configuración y Umbrales Médicos
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              
              {/* Threshold limits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Min HR */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Activity size={12} className="text-red-500" /> Ritmo Mín (BPM)
                  </label>
                  <input
                    type="number"
                    required
                    value={hrMin}
                    onChange={e => setHrMin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all font-bold"
                  />
                </div>

                {/* Max HR */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Activity size={12} className="text-red-500" /> Ritmo Máx (BPM)
                  </label>
                  <input
                    type="number"
                    required
                    value={hrMax}
                    onChange={e => setHrMax(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all font-bold"
                  />
                </div>

                {/* Max Temp */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Activity size={12} className="text-blue-500" /> Temp Máxima (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={tempMax}
                    onChange={e => setTempMax(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Watch face theme */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Watch size={12} className="text-slate-400" /> Tema del Reloj
                  </label>
                  <select
                    value={watchTheme}
                    onChange={e => setWatchTheme(e.target.value as 'light' | 'dark')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none cursor-pointer font-bold"
                  >
                    <option value="light">Tema Claro (Esfera Blanca)</option>
                    <option value="dark">Tema Oscuro (Esfera Negra)</option>
                  </select>
                </div>

                {/* Notifications active */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Bell size={12} className="text-slate-400" /> Notificaciones
                  </label>
                  <button
                    type="button"
                    onClick={() => setNotificationsActive(!notificationsActive)}
                    className={`w-full flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold
                      ${notificationsActive ? 'text-hn-700 dark:text-hn-400' : 'text-slate-400'}`}
                  >
                    <span>{notificationsActive ? 'Notificaciones Activas' : 'Notificaciones Silenciadas'}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${notificationsActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  </button>
                </div>
              </div>

              {/* Save config */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-hn-800 text-white hover:bg-hn-900 dark:bg-hn-500 dark:text-slate-950 dark:hover:bg-hn-600 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-hn-950/10"
                >
                  <Save size={13} />
                  Guardar Ajustes
                </button>
                {configSuccess && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fade-in">
                    <CheckCircle size={14} />
                    Límites de alertas y tema guardados.
                  </span>
                )}
              </div>
            </form>
          </div>

        </div>

        {/* Right Side: Bracelet Specs & Live Watch Simulator */}
        <div className="space-y-6">
          
          {/* Smartwatch Simulator Preview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm flex flex-col items-center justify-center min-h-[350px]">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wide w-full text-center mb-6">
              Brazalete Inteligente en Vivo
            </h3>

            <SmartwatchSimulator
              telemetry={device.latest}
              patientName={profileForm.name || device.patientName}
              watchTheme={watchTheme}
            />
          </div>

          {/* Technical Specs Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Cpu size={16} className="text-hn-600 dark:text-hn-400" />
              Especificaciones de Hardware
            </h3>

            <div className="space-y-3.5 text-xs font-bold">
              <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                <span className="text-slate-400 uppercase tracking-wider text-[9px]">ID del Dispositivo:</span>
                <span className="text-slate-800 dark:text-slate-200 font-mono">{device.deviceId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                <span className="text-slate-400 uppercase tracking-wider text-[9px]">Número de Serie:</span>
                <span className="text-slate-800 dark:text-slate-200 font-mono">{serialNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                <span className="text-slate-400 uppercase tracking-wider text-[9px]">Batería Restante:</span>
                <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Battery size={14} className="text-emerald-500" />
                  {device.latest?.batteryLevel ?? 100}%
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                <span className="text-slate-400 uppercase tracking-wider text-[9px]">Estado de Red:</span>
                <span className="inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md text-[10px]">
                  <Wifi size={10} className="animate-pulse" />
                  CONECTADO
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400 uppercase tracking-wider text-[9px]">Fecha de Registro:</span>
                <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" />
                  16 Jul, 2026
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
