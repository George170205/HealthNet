import { useState, useEffect } from 'react'
import { Heart, Thermometer, Wifi, AlertTriangle } from 'lucide-react'
import type { DeviceTelemetry } from '../types'

interface Props {
  telemetry: DeviceTelemetry | null
  patientName: string
  watchTheme: 'light' | 'dark'
  isEmergency?: boolean
  emergencyMsg?: string
}

export default function SmartwatchSimulator({
  telemetry,
  patientName,
  watchTheme,
  isEmergency = false,
  emergencyMsg = '',
}: Props) {
  const [time, setTime] = useState('')
  const [pulse, setPulse] = useState(false)

  // Pulsing heart animation linked to heartRate
  useEffect(() => {
    if (!telemetry?.heartRate) return
    const interval = (60 / telemetry.heartRate) * 1000
    const timer = setInterval(() => {
      setPulse(prev => !prev)
    }, interval)
    return () => clearInterval(timer)
  }, [telemetry?.heartRate])

  // Clock time update
  useEffect(() => {
    const updateTime = () => {
      const d = new Date()
      const hrs = String(d.getHours()).padStart(2, '0')
      const mins = String(d.getMinutes()).padStart(2, '0')
      setTime(`${hrs}:${mins}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000 * 60)
    return () => clearInterval(timer)
  }, [])

  const hasAlert = isEmergency || (telemetry ? telemetry.fallDetected : false)
  const alertText = emergencyMsg || (telemetry?.fallDetected ? '¡CAÍDA DETECTADA!' : '')

  const isDark = watchTheme === 'dark'

  return (
    <div className="flex flex-col items-center select-none">
      {/* Smartwatch Container */}
      <div className="relative flex flex-col items-center">
        {/* Upper Band Strap */}
        <div className="w-20 h-16 bg-slate-800 rounded-t-3xl shadow-inner border-t-2 border-slate-700" />

        {/* Watch Bezel Body */}
        <div className="w-56 h-56 rounded-full bg-slate-900 border-4 border-slate-700 shadow-2xl relative flex items-center justify-center z-10">
          
          {/* Dial Crown / Button (Side crown) */}
          <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-10 bg-slate-700 rounded-r-md border border-slate-600 shadow-md cursor-pointer hover:bg-slate-600 active:scale-95 transition-all" />

          {/* Watch Screen Inside */}
          <div
            className={`w-46 h-46 rounded-full overflow-hidden relative flex flex-col items-center justify-between p-6 transition-all duration-500
              ${hasAlert 
                ? 'bg-red-600 text-white animate-pulse border-2 border-red-400' 
                : isDark 
                  ? 'bg-slate-950 text-white border-2 border-slate-800' 
                  : 'bg-white text-slate-800 border-2 border-slate-200'
              }`}
          >
            {/* Screen Top Bar */}
            <div className="w-full flex items-center justify-between text-[11px] font-bold tracking-tight opacity-75">
              <span>{time}</span>
              <span className="flex items-center gap-0.5">
                <Wifi size={10} className={hasAlert ? 'text-white' : 'text-emerald-500'} />
                <span>LTE</span>
              </span>
            </div>

            {/* Screen Content Area */}
            {hasAlert ? (
              // Alert Emergency Screen
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-bounce">
                <AlertTriangle size={32} className="text-white mb-1" />
                <h4 className="text-[12px] font-black tracking-widest uppercase">SOS</h4>
                <p className="text-[10px] font-bold mt-1 leading-snug">{alertText}</p>
              </div>
            ) : (
              // Normal Active Screen
              <div className="flex-1 flex flex-col items-center justify-center text-center w-full">
                {/* Patient Initials or Name */}
                <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-2 max-w-[120px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {patientName || 'Usuario'}
                </p>

                {/* Heart Rate Display */}
                <div className="flex items-center gap-1.5 justify-center mb-1.5">
                  <Heart
                    size={22}
                    className={`text-red-500 transition-transform duration-200 ${pulse ? 'scale-125' : 'scale-100'}`}
                    fill="currentColor"
                  />
                  <div>
                    <span className="text-2xl font-black tracking-tighter">
                      {telemetry?.heartRate ?? '--'}
                    </span>
                    <span className="text-[9px] font-bold opacity-60 ml-0.5">BPM</span>
                  </div>
                </div>

                {/* Temperature Display */}
                <div className="flex items-center gap-1 justify-center">
                  <Thermometer size={14} className="text-blue-400" />
                  <span className="text-sm font-black">
                    {telemetry?.temperature ? `${telemetry.temperature.toFixed(1)}` : '--'}
                  </span>
                  <span className="text-[9px] font-bold opacity-60">°C</span>
                </div>
              </div>
            )}

            {/* Screen Bottom Bar */}
            <div className="w-full flex items-center justify-center text-[9px] font-extrabold tracking-wider opacity-60 uppercase">
              {hasAlert ? 'Alerta Vital' : 'Health Net'}
            </div>
          </div>
        </div>

        {/* Lower Band Strap */}
        <div className="w-20 h-16 bg-slate-800 rounded-b-3xl shadow-inner border-b-2 border-slate-700" />
      </div>

      {/* Helper text */}
      <span className="text-[10px] text-hn-400 font-semibold uppercase tracking-widest mt-2">
        Brazalete IoT
      </span>
    </div>
  )
}
