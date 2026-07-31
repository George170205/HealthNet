import { useState } from 'react'
import { useDeviceStore } from '../store/deviceStore'
import { Bell, ShieldAlert, Check, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AlertsPage() {
  const alerts = useDeviceStore(s => s.alerts)
  const devices = useDeviceStore(s => s.devices)
  const acknowledgeAlert = useDeviceStore(s => s.acknowledgeAlert)
  const clearAlerts = useDeviceStore(s => s.clearAlerts)

  const [filter, setFilter] = useState<'all' | 'pending' | 'attended'>('all')

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'pending') return !a.acknowledged
    if (filter === 'attended') return a.acknowledged
    return true
  })

  // Group alerts by severity
  const getSeverity = (type: string) => {
    switch (type) {
      case 'fall':
        return { label: 'Emergencia', color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', dot: 'bg-red-500' }
      case 'high_hr':
      case 'low_hr':
      case 'high_temp':
        return { label: 'Advertencia', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', dot: 'bg-amber-500' }
      default:
        return { label: 'Normal', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', dot: 'bg-emerald-500' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">Concentrador de Alertas</h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide">
            Notificaciones e Historial de Incidentes
          </p>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={() => clearAlerts()}
            className="flex items-center gap-1.5 px-4 py-2 border border-red-200 dark:border-red-500/10 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-xl text-xs font-bold transition-all"
            title="Limpiar historial"
          >
            <Trash2 size={14} />
            Borrar Todo
          </button>
        )}
      </div>

      {/* Filters & Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors shadow-sm">
        {/* Filters Top bar */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            {(['all', 'pending', 'attended'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${filter === f
                    ? 'bg-hn-800 text-white dark:bg-hn-500 dark:text-slate-950'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'
                  }`}
              >
                {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Atendidas'}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
            {filteredAlerts.length} Alerta(s)
          </span>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto w-full">
          {filteredAlerts.length === 0 ? (
            <div className="py-24 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center">
              <Check size={36} className="text-emerald-500 mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">¡Historial Limpio!</h3>
              <p className="text-xs max-w-xs mt-1">No hay alertas que coincidan con el filtro seleccionado.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider bg-slate-50/20 dark:bg-slate-950/10">
                  <th className="px-6 py-3.5">Fecha y Hora</th>
                  <th className="px-6 py-3.5">Paciente</th>
                  <th className="px-6 py-3.5">Mensaje del Evento</th>
                  <th className="px-6 py-3.5">Severidad</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-[13px] font-medium">
                {[...filteredAlerts].reverse().map(alert => {
                  const severity = getSeverity(alert.type)
                  const patientName = devices[alert.deviceId]?.patientName || alert.deviceId

                  return (
                    <tr key={alert.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500 dark:text-slate-400">
                        {format(alert.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                        {patientName}
                      </td>
                      <td className="px-6 py-4 leading-normal">
                        {alert.message}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${severity.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${severity.dot}`} />
                          {severity.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase
                          ${alert.acknowledged
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 animate-pulse'
                          }`}
                        >
                          {alert.acknowledged ? 'Atendida' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {!alert.acknowledged ? (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white dark:bg-hn-500 dark:hover:bg-hn-600 dark:text-slate-950 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 mx-auto"
                          >
                            <Check size={12} />
                            Resolver
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
