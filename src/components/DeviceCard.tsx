import { useState } from 'react'
import { Heart, Thermometer, AlertTriangle, Battery, ChevronDown, ChevronUp, Wifi, FileText } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DeviceState } from '../types'
import { THRESHOLDS } from '../types'
import HeartRateChart from './charts/HeartRateChart'
import TempChart from './charts/TempChart'
import { useDeviceStore } from '../store/deviceStore'
import DeviceReportTemplate from './DeviceReportTemplate'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

interface Props {
  device: DeviceState
  expanded: boolean
  onToggleExpanded: () => void
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
      ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {label}
    </span>
  )
}

function BatteryIcon({ level }: { level: number }) {
  const color = level > 40 ? 'text-emerald-500' : level > 20 ? 'text-amber-500' : 'text-red-500'
  return (
    <div className={`flex items-center gap-1 text-xs ${color}`}>
      <Battery size={13} />
      <span>{level}%</span>
    </div>
  )
}

export default function DeviceCard({ device, expanded, onToggleExpanded }: Props) {
  const acknowledgeAlert = useDeviceStore(s => s.acknowledgeAlert)
  const { latest, history, alerts } = device
  const unread = alerts.filter(a => !a.acknowledged)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  if (!latest) return null

  const hrMin = device.config?.hrMin ?? THRESHOLDS.HR_MIN
  const hrMax = device.config?.hrMax ?? THRESHOLDS.HR_MAX
  const tempMax = device.config?.tempMax ?? THRESHOLDS.TEMP_MAX

  const hrOk = latest.heartRate >= hrMin && latest.heartRate <= hrMax
  const tempOk = latest.temperature <= tempMax

  const lastSeen = formatDistanceToNow(device.lastSeen, { addSuffix: true, locale: es })

  const downloadPdf = async () => {
    setGeneratingPdf(true)
    // Wait briefly for DOM to render the off-screen template completely
    await new Promise(resolve => setTimeout(resolve, 300))

    const element = document.getElementById(`report-template-${device.deviceId}`)
    if (!element) {
      setGeneratingPdf(false)
      return
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      })
      
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const safeName = device.patientName.replace(/\s+/g, '_')
      pdf.save(`Reporte_Salud_${safeName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition-all relative
      ${latest.fallDetected ? 'border-red-400 shadow-red-100 dark:border-red-500/50' : 'border-slate-200 dark:border-slate-800'}`}>

      {/* Hidden report template for html2canvas */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
        <DeviceReportTemplate device={device} />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">{device.patientName}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation()
                downloadPdf()
              }}
              disabled={generatingPdf}
              title="Descargar Reporte Médico PDF"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors flex items-center justify-center ml-1"
            >
              {generatingPdf ? (
                <span className="w-3.5 h-3.5 border-2 border-hn-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText size={15} />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{device.deviceId} · {lastSeen}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <BatteryIcon level={latest.batteryLevel} />
          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <Wifi size={11} />
            <span>MQTT</span>
          </div>
        </div>
      </div>

      {/* Fall alert banner */}
      {latest.fallDetected && (
        <div className="mx-4 mb-3 flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-red-600 dark:text-red-400 text-xs font-semibold">¡CAÍDA DETECTADA!</p>
        </div>
      )}

      {/* Vitals */}
      <div className="grid grid-cols-2 gap-3 px-5 pb-4">
        {/* Heart Rate */}
        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Heart size={14} className="text-red-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Ritmo cardíaco</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${hrOk ? 'text-slate-800 dark:text-white' : 'text-red-500'}`}>
              {latest.heartRate}
            </span>
            <span className="text-xs text-slate-400">bpm</span>
          </div>
          <div className="mt-1.5">
            <StatusPill ok={hrOk} label={hrOk ? 'Normal' : (latest.heartRate > hrMax ? 'Elevado' : 'Bajo')} />
          </div>
          {/* Mini chart */}
          <div className="mt-2">
            <HeartRateChart history={history.slice(-20)} compact />
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Thermometer size={14} className="text-blue-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Temperatura</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${tempOk ? 'text-slate-800 dark:text-white' : 'text-red-500'}`}>
              {latest.temperature.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">°C</span>
          </div>
          <div className="mt-1.5">
            <StatusPill ok={tempOk} label={tempOk ? 'Normal' : 'Fiebre'} />
          </div>
          {/* Mini chart */}
          <div className="mt-2">
            <TempChart history={history.slice(-20)} compact />
          </div>
        </div>
      </div>

      {/* Unread alerts */}
      {unread.length > 0 && (
        <div className="px-5 pb-3 space-y-1.5">
          {unread.slice(0, 3).map(alert => (
            <div key={alert.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-amber-500" />
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">{alert.message}</span>
              </div>
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="text-[10px] text-amber-600 hover:text-amber-800 dark:text-amber-400 font-bold ml-2 whitespace-nowrap"
              >
                OK
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Expand / Collapse */}
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-center gap-1 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800 transition-colors"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Ocultar gráficas' : 'Ver gráficas'}
      </button>

      {/* Expanded charts */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4 bg-slate-50/20 dark:bg-slate-950/10">
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <Heart size={12} className="text-red-500" fill="currentColor" /> Histórico ritmo cardíaco
            </p>
            <HeartRateChart history={history} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <Thermometer size={12} className="text-blue-500" /> Histórico temperatura
            </p>
            <TempChart history={history} />
          </div>
        </div>
      )}
    </div>
  )
}
