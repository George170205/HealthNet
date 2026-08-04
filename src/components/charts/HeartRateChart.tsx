import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DeviceTelemetry } from '../../types'
import { THRESHOLDS } from '../../types'

interface Props {
  history: DeviceTelemetry[]
  compact?: boolean
  height?: number
}

export default function HeartRateChart({ history, compact = false, height = 220 }: Props) {
  const data = history.map(h => ({
    time: format(h.timestamp, compact ? 'HH:mm:ss' : 'HH:mm:ss', { locale: es }),
    bpm: h.heartRate,
  }))

  if (compact) {
    return (
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="bpm"
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#BBCEE5" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: '#748CAF' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[30, 140]}
          tick={{ fontSize: 10, fill: '#748CAF' }}
          width={36}
        />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #BBCEE5', borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [`${v} bpm`, 'Ritmo cardíaco']}
          labelFormatter={l => `Hora: ${l}`}
        />
        <ReferenceLine y={THRESHOLDS.HR_MAX} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Máx', fill: '#f59e0b', fontSize: 10 }} />
        <ReferenceLine y={THRESHOLDS.HR_MIN} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Mín', fill: '#f59e0b', fontSize: 10 }} />
        <Line
          type="monotone"
          dataKey="bpm"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#ef4444' }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
