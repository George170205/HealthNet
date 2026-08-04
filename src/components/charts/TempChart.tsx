import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts'
import { format } from 'date-fns'
import type { DeviceTelemetry } from '../../types'
import { THRESHOLDS } from '../../types'

interface Props {
  history: DeviceTelemetry[]
  compact?: boolean
  height?: number
}

export default function TempChart({ history, compact = false, height = 220 }: Props) {
  const data = history.map(h => ({
    time: format(h.timestamp, 'HH:mm:ss'),
    temp: h.temperature,
  }))

  if (compact) {
    return (
      <ResponsiveContainer width="100%" height={60}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
          <defs>
            <linearGradient id="tempGradCompact" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="temp"
            stroke="#3b82f6"
            strokeWidth={1.5}
            fill="url(#tempGradCompact)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#8CA7C9" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#8CA7C9" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#BBCEE5" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: '#748CAF' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[34, 41]}
          tick={{ fontSize: 10, fill: '#748CAF' }}
          width={36}
        />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #BBCEE5', borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [`${v.toFixed(1)} °C`, 'Temperatura']}
        />
        <ReferenceLine y={THRESHOLDS.TEMP_MAX} stroke="#f59e0b" strokeDasharray="4 2"
          label={{ value: `${THRESHOLDS.TEMP_MAX}°C`, fill: '#f59e0b', fontSize: 10 }} />
        <Area
          type="monotone"
          dataKey="temp"
          stroke="#637FA8"
          strokeWidth={2}
          fill="url(#tempGrad)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
