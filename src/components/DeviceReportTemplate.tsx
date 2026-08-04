import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Heart, Thermometer, AlertTriangle, Activity, ShieldAlert, FileText } from 'lucide-react'
import type { DeviceState, DeviceTelemetry } from '../types'
import { THRESHOLDS } from '../types'
import HeartRateChart from './charts/HeartRateChart'
import TempChart from './charts/TempChart'

interface Props {
  device: DeviceState
}

interface FallPattern {
  detected: boolean
  count: number
  startTime?: Date
  endTime?: Date
}

/**
 * Detects if a patient has fallen 5 or more times in a span of less than 20 minutes
 * within the last 10 hours of history.
 */
export function detectFallPattern(history: DeviceTelemetry[]): FallPattern {
  const tenHoursAgo = Date.now() - 10 * 60 * 60 * 1000
  const falls = history
    .filter(h => h.fallDetected && h.timestamp >= tenHoursAgo)
    .map(h => h.timestamp)
    .sort((a, b) => a - b)

  if (falls.length < 5) {
    return { detected: false, count: 0 }
  }

  const windowMs = 20 * 60 * 1000 // 20 minutes

  for (let i = 0; i <= falls.length - 5; i++) {
    const start = falls[i]
    // Check the 5th fall in the sorted list
    const end = falls[i + 4]
    if (end - start <= windowMs) {
      // Find all falls that fell into this specific window to get the exact count
      const fallsInWindow = falls.filter(t => t >= start && t <= start + windowMs)
      return {
        detected: true,
        count: fallsInWindow.length,
        startTime: new Date(start),
        endTime: new Date(fallsInWindow[fallsInWindow.length - 1]),
      }
    }
  }

  return { detected: false, count: 0 }
}

function getAlertLabel(type: string) {
  switch (type) {
    case 'fall':
      return 'Caída Detectada'
    case 'high_hr':
      return 'Ritmo Cardíaco Elevado'
    case 'low_hr':
      return 'Ritmo Cardíaco Bajo'
    case 'high_temp':
      return 'Temperatura Elevada'
    case 'disconnected':
      return 'Dispositivo Desconectado'
    default:
      return 'Alerta Vital'
  }
}

export default function DeviceReportTemplate({ device }: Props) {
  const { latest, history, alerts } = device
  if (!latest) return null

  // Signos vitales actuales
  const hrMin = device.config?.hrMin ?? THRESHOLDS.HR_MIN
  const hrMax = device.config?.hrMax ?? THRESHOLDS.HR_MAX
  const tempMax = device.config?.tempMax ?? THRESHOLDS.TEMP_MAX

  const hrOk = latest.heartRate >= hrMin && latest.heartRate <= hrMax
  const tempOk = latest.temperature <= tempMax

  // Cálculos estadísticos en base al histórico
  const avgHR = history.length
    ? Math.round(history.reduce((s, h) => s + h.heartRate, 0) / history.length)
    : latest.heartRate
  const maxHR = history.length ? Math.max(...history.map(h => h.heartRate)) : latest.heartRate

  const avgTemp = history.length
    ? history.reduce((s, h) => s + h.temperature, 0) / history.length
    : latest.temperature
  const maxTemp = history.length ? Math.max(...history.map(h => h.temperature)) : latest.temperature

  // Detección del patrón crítico de caídas
  const pattern = detectFallPattern(history)
  const totalFalls = history.filter(h => h.fallDetected).length

  return (
    <div
      id={`report-template-${device.deviceId}`}
      className="bg-white text-slate-800 font-sans"
      style={{ width: '800px', boxSizing: 'border-box' }}
    >
      {/* PAGE 1: Encabezado, Perfil, Vitals y Gráficos */}
      <div style={{ height: '1120px', padding: '40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {/* Encabezado del Reporte */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-5 mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 text-white p-2.5 rounded-xl">
                <Activity size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">HEALTH NET</h1>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Sistema de Monitoreo Clínico IoT
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded-lg text-xs uppercase tracking-wide border border-slate-200">
                <FileText size={12} />
                Reporte de Estado Médico
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Generado: {format(new Date(), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}
              </p>
            </div>
          </div>

          {/* Información del Paciente */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-5">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Datos del Paciente</h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 font-semibold text-slate-500">Nombre completo:</td>
                    <td className="py-1 font-bold text-slate-900">{device.patientName}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-500">ID Dispositivo:</td>
                    <td className="py-1 font-medium text-slate-700">{device.deviceId}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-500">Última lectura:</td>
                    <td className="py-1 font-medium text-slate-700">
                      {format(device.lastSeen, "HH:mm:ss dd/MM/yyyy")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estado del Canal</h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 font-semibold text-slate-500">Batería del Sensor:</td>
                    <td className="py-1 font-bold text-slate-900">{latest.batteryLevel}%</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-500">Conectividad:</td>
                    <td className="py-1 font-bold text-emerald-600">ACTIVA (MQTT AWS Core)</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-500">Total de Registros:</td>
                    <td className="py-1 font-medium text-slate-700">{history.length} lecturas</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerta Roja de Patrón de Caídas */}
          {pattern.detected && (
            <div className="mb-5 flex items-start gap-4 bg-rose-50 border-2 border-rose-300 rounded-2xl p-4">
              <AlertTriangle size={24} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-rose-800 font-extrabold text-sm mb-0.5">
                  ⚠ ALERTA MÉDICA: Patrón Crítico de Caídas Detectado
                </h3>
                <p className="text-rose-700 text-xs leading-normal">
                  El sistema identificó un comportamiento de alto riesgo: el paciente sufrió{' '}
                  <span className="font-bold text-rose-900">{pattern.count} caídas</span> en un intervalo menor a 20 minutos
                  entre las <span className="font-bold text-rose-900">{format(pattern.startTime!, 'HH:mm:ss')}</span> y las{' '}
                  <span className="font-bold text-rose-900">{format(pattern.endTime!, 'HH:mm:ss')}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Resumen Analítico de Signos Vitales */}
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Resumen Analítico de Signos Vitales
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Heart Rate Stats */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mb-2">
                <Heart size={14} className="text-red-500" fill="currentColor" />
                <span className="font-bold text-slate-800 text-xs">Ritmo Cardíaco (BPM)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Actual</p>
                  <p className={`text-base font-black ${hrOk ? 'text-slate-800' : 'text-red-600'}`}>{latest.heartRate}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Promedio</p>
                  <p className="text-base font-black text-slate-700">{avgHR}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Máximo</p>
                  <p className="text-base font-black text-slate-700">{maxHR}</p>
                </div>
              </div>
            </div>

            {/* Temperature Stats */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mb-2">
                <Thermometer size={14} className="text-blue-500" />
                <span className="font-bold text-slate-800 text-xs">Temperatura (°C)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Actual</p>
                  <p className={`text-base font-black ${tempOk ? 'text-slate-800' : 'text-red-600'}`}>
                    {latest.temperature.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Promedio</p>
                  <p className="text-base font-black text-slate-700">{avgTemp.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Máximo</p>
                  <p className="text-base font-black text-slate-700">{maxTemp.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Historial de Gráficos */}
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Gráficos Históricos (Últimas lecturas)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50" style={{ marginBottom: '30px' }}>
              <p className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                <Heart size={12} className="text-red-500" fill="currentColor" /> Histórico del Ritmo Cardíaco
              </p>
              <div className="w-full" style={{ height: '140px' }}>
                <HeartRateChart history={history.slice(-30)} height={140} />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <p className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                <Thermometer size={12} className="text-blue-500" /> Histórico de Temperatura Corporal
              </p>
              <div className="w-full" style={{ height: '140px' }}>
                <TempChart history={history.slice(-30)} height={140} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 2: Registro de Caídas e Historial Tabular */}
      <div style={{ height: '1120px', padding: '40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Registro Detallado de Caídas y Alertas ({totalFalls} caídas registradas)
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase border-b border-slate-200">
                  <th className="px-4 py-3.5 font-bold">Fecha / Hora</th>
                  <th className="px-4 py-3.5 font-bold">Tipo de Alerta</th>
                  <th className="px-4 py-3.5 font-bold">Estado de Confirmación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-slate-400 text-center font-medium">
                      No se registraron incidentes de caídas ni alertas en este periodo.
                    </td>
                  </tr>
                ) : (
                  alerts.slice(-12).map(alert => (
                    <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-500 font-bold">
                        {format(alert.timestamp, 'HH:mm:ss dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded font-extrabold uppercase text-[9px] tracking-wide ${
                            alert.type === 'fall'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {getAlertLabel(alert.type)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-bold ${alert.acknowledged ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {alert.acknowledged ? 'Confirmada por Personal' : 'Pendiente de Confirmar'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie de página del Reporte */}
        <div className="border-t border-slate-200 pt-4 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            © {new Date().getFullYear()} HealthNet Inc. · Monitoreo Clínico Automatizado
          </p>
        </div>
      </div>
    </div>
  )
}
