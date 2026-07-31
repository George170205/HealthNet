import { useState, useMemo } from 'react'
import { useDeviceStore } from '../store/deviceStore'
import {
  Calendar, FileDown, Search, Activity, Heart, Thermometer,
  TrendingUp, ArrowLeftRight
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend
} from 'recharts'

interface HistoricalData {
  time: string
  bpm: number
  temp: number
}

export default function HistoryPage() {
  const devices = useDeviceStore(s => Object.values(s.devices))
  const [selectedId, setSelectedId] = useState<string>(devices[0]?.deviceId || '')
  const [range, setRange] = useState<'hoy' | 'semana' | 'mes'>('hoy')

  const device = devices.find(d => d.deviceId === selectedId) || devices[0]

  // Generate mock historical trend data based on selected range and patient
  const mockTrendData = useMemo((): HistoricalData[] => {
    if (!device) return []

    // Seed based on patientName length to make trends look consistent
    const seed = device.patientName.length
    const pointsCount = range === 'hoy' ? 24 : range === 'semana' ? 7 : 30
    const list: HistoricalData[] = []

    const baseHR = 70 + (seed % 10)
    const baseTemp = 36.5 + ((seed % 5) * 0.1)

    for (let i = pointsCount - 1; i >= 0; i--) {
      // Calculate times
      let label = ''
      const now = new Date()
      if (range === 'hoy') {
        const hr = new Date(now.getTime() - i * 60 * 60 * 1000)
        label = `${String(hr.getHours()).padStart(2, '0')}:00`
      } else if (range === 'semana') {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        label = day.toLocaleDateString('es-ES', { weekday: 'short' })
      } else {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        label = `${day.getDate()}/${day.getMonth() + 1}`
      }

      // Add slight random fluctuation
      const flucHR = Math.sin((i + seed) * 0.5) * 8 + (Math.random() * 4 - 2)
      const flucTemp = Math.cos((i + seed) * 0.3) * 0.4 + (Math.random() * 0.2 - 0.1)

      list.push({
        time: label,
        bpm: Math.round(baseHR + flucHR),
        temp: parseFloat((baseTemp + flucTemp).toFixed(1)),
      })
    }

    return list
  }, [device, range])

  const handleExportCSV = () => {
    if (!device || mockTrendData.length === 0) return

    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'Fecha/Hora,Ritmo Cardiaco (BPM),Temperatura (C)\n'

    mockTrendData.forEach(d => {
      csvContent += `${d.time},${d.bpm},${d.temp}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Historial_${device.patientName.replace(/\s+/g, '_')}_${range}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-hn-100 dark:bg-hn-500/10 flex items-center justify-center mb-4">
          <Activity size={28} className="text-hn-600 dark:text-hn-400" />
        </div>
        <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200">Sin datos históricos</h2>
        <p className="text-sm text-slate-400 max-w-xs mt-1">
          Inicia la simulación para guardar registros de telemetría y poder realizar consultas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Filter Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">Consultas Históricas</h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide">
            Análisis Estadístico por Periodo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Patient Selector */}
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none transition-all cursor-pointer"
          >
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.patientName}
              </option>
            ))}
          </select>

          {/* Time range selector */}
          <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl">
            {(['hoy', 'semana', 'mes'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize
                  ${range === r
                    ? 'bg-hn-800 text-white dark:bg-hn-500 dark:text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-hn-800 text-white hover:bg-hn-900 dark:bg-hn-500 dark:text-slate-950 dark:hover:bg-hn-600 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-hn-950/10"
          >
            <FileDown size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      {device && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Trend Chart Panel */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-1.5 uppercase tracking-wide">
              <TrendingUp size={16} className="text-hn-500" />
              Tendencia de Signos Vitales ({range === 'hoy' ? '24 Horas' : range === 'semana' ? '7 Días' : '30 Días'})
            </h3>
            
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis yAxisId="left" domain={[50, 130]} tick={{ fontSize: 10, fill: '#ef4444' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[35, 41]} tick={{ fontSize: 10, fill: '#3b82f6' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #cbd5e1',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#0f172a'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="bpm"
                    name="Ritmo Cardíaco (BPM)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={range !== 'mes'}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="temp"
                    name="Temperatura (°C)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={range !== 'mes'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Table Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm flex flex-col">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-1.5 uppercase tracking-wide flex-shrink-0">
              <ArrowLeftRight size={16} className="text-hn-500" />
              Registros Almacenados
            </h3>

            <div className="flex-1 overflow-y-auto max-h-[320px] pr-1 divide-y divide-slate-100 dark:divide-slate-800">
              {mockTrendData.map((data, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wide">
                      {range === 'hoy' ? 'Hora' : 'Fecha'}
                    </p>
                    <p className="text-[13px] font-black text-slate-800 dark:text-slate-200 mt-0.5">
                      {data.time}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <Heart size={10} className="text-red-500" fill="currentColor" /> HR
                      </span>
                      <p className="text-[13px] font-black text-slate-800 dark:text-slate-100 mt-0.5">
                        {data.bpm} <span className="text-[9px] font-bold text-slate-400">bpm</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <Thermometer size={10} className="text-blue-500" /> TEMP
                      </span>
                      <p className="text-[13px] font-black text-slate-800 dark:text-slate-100 mt-0.5">
                        {data.temp.toFixed(1)} <span className="text-[9px] font-bold text-slate-400">°C</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
