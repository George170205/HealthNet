import { useState } from 'react'
import { useDeviceStore } from '../store/deviceStore'
import { Heart, Thermometer, AlertTriangle, Activity, User, TrendingUp, Calendar } from 'lucide-react'
import HeartRateChart from '../components/charts/HeartRateChart'
import TempChart from '../components/charts/TempChart'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function MonitoringPage() {
  const devices = useDeviceStore(s => Object.values(s.devices))
  const [selectedId, setSelectedId] = useState<string>(devices[0]?.deviceId || '')

  const device = devices.find(d => d.deviceId === selectedId) || devices[0]

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-hn-100 dark:bg-hn-500/10 flex items-center justify-center mb-4">
          <Activity size={28} className="text-hn-600 dark:text-hn-400 animate-pulse" />
        </div>
        <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200">Sin datos de monitoreo</h2>
        <p className="text-sm text-slate-400 max-w-xs mt-1">
          Inicia la simulación en el **Simulador IoT** o conecta un dispositivo real para ver el monitoreo en tiempo real.
        </p>
      </div>
    )
  }

  // Set default selected ID if not set
  if (!selectedId && device) {
    setSelectedId(device.deviceId)
  }

  const { latest, history, alerts } = device
  const fallsList = alerts.filter(a => a.type === 'fall')

  // Stats calculation
  const avgHR = history.length
    ? Math.round(history.reduce((s, h) => s + h.heartRate, 0) / history.length)
    : latest?.heartRate ?? 0
  const avgTemp = history.length
    ? (history.reduce((s, h) => s + h.temperature, 0) / history.length).toFixed(1)
    : latest?.temperature.toFixed(1) ?? '0.0'

  return (
    <div className="space-y-6">
      {/* Top Selector Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">Monitoreo Clínico</h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide">
            Signos Vitales y Alertas de Caídas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <User size={16} className="text-slate-400" />
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-hn-500 transition-all cursor-pointer"
          >
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.patientName} ({d.deviceId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {device && latest && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Frecuencia Cardíaca Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                  <Heart size={18} className="text-red-500" fill="currentColor" />
                  Ritmo Cardíaco
                </span>
                <span className="bg-red-50 dark:bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  BPM
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
                  {latest.heartRate}
                </span>
                <span className="text-sm font-bold text-slate-400">BPM actual</span>
              </div>

              {/* Chart */}
              <div className="w-full mb-6">
                <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                  <TrendingUp size={12} /> Histórico de Lecturas (Minutos)
                </p>
                <div className="h-44 w-full">
                  <HeartRateChart history={history} />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 flex items-center justify-between text-sm font-bold">
              <span className="text-slate-500">Promedio Frecuencia:</span>
              <span className="text-slate-800 dark:text-white">{avgHR} BPM</span>
            </div>
          </div>

          {/* Temperatura Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                  <Thermometer size={18} className="text-blue-500" />
                  Temperatura
                </span>
                <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  °C
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
                  {latest.temperature.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-slate-400">°C actual</span>
              </div>

              {/* Chart */}
              <div className="w-full mb-6">
                <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                  <TrendingUp size={12} /> Histórico de Lecturas (Minutos)
                </p>
                <div className="h-44 w-full">
                  <TempChart history={history} />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 flex items-center justify-between text-sm font-bold">
              <span className="text-slate-500">Promedio Temperatura:</span>
              <span className="text-slate-800 dark:text-white">{avgTemp}°C</span>
            </div>
          </div>

          {/* Registro de Caídas Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                <AlertTriangle size={18} className="text-red-500 animate-pulse" />
                Detección de Caídas
              </span>
              <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                {fallsList.length} caídas
              </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[300px] pr-1 mt-2">
              {fallsList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 py-10">
                  <Activity size={32} className="opacity-40 mb-2" />
                  <p className="text-xs font-bold">Sin caídas registradas</p>
                  <p className="text-[10px] mt-0.5">El paciente no ha reportado accidentes.</p>
                </div>
              ) : (
                [...fallsList].reverse().map(fall => (
                  <div
                    key={fall.id}
                    className="p-3 bg-red-50/50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {format(fall.timestamp, 'dd MMM, yyyy', { locale: es })}
                      </p>
                      <p className="text-[13px] font-black text-red-600 dark:text-red-400 mt-0.5">
                        Caída Detectada
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 font-bold">
                        {format(fall.timestamp, 'HH:mm:ss')}
                      </p>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase mt-1
                        ${fall.acknowledged
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700 animate-pulse'
                        }`}
                      >
                        {fall.acknowledged ? 'Atendida' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
