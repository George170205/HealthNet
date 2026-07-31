// ──────────────────────────────────────────────
// Telemetría enviada por el ESP32 / simulador
// ──────────────────────────────────────────────
export interface DeviceTelemetry {
  deviceId: string
  patientName?: string
  timestamp: number          // Unix ms
  heartRate: number          // bpm
  temperature: number        // °C
  fallDetected: boolean
  batteryLevel: number       // 0-100
  accelerometer: {
    x: number
    y: number
    z: number
  }
}

// ──────────────────────────────────────────────
// Estado de un dispositivo en el store
// ──────────────────────────────────────────────
export interface DeviceState {
  deviceId: string
  patientName: string
  connected: boolean
  lastSeen: number           // Unix ms
  latest: DeviceTelemetry | null
  history: DeviceTelemetry[] // últimas 60 lecturas
  alerts: Alert[]
  profile?: UserProfile
  config?: AlertConfig
}

export interface Alert {
  id: string
  deviceId: string
  type: 'fall' | 'high_hr' | 'low_hr' | 'high_temp' | 'disconnected'
  message: string
  timestamp: number
  acknowledged: boolean
  status: 'pending' | 'attended'
}

// ──────────────────────────────────────────────
// Dispositivo simulado
// ──────────────────────────────────────────────
export interface SimulatedDevice {
  deviceId: string
  patientName: string
  intervalMs: number
  running: boolean
  mqttClientId?: string
}

// ──────────────────────────────────────────────
// Usuario autenticado
// ──────────────────────────────────────────────
export interface AuthUser {
  username: string
  email: string
  role: 'admin' | 'viewer'
}

// ──────────────────────────────────────────────
// Configuración de Alertas y Sistema
// ──────────────────────────────────────────────
export interface AlertConfig {
  hrMin: number
  hrMax: number
  tempMax: number
  notificationsActive: boolean
  theme: 'light' | 'dark'
  watchTheme: 'light' | 'dark'
}

// ──────────────────────────────────────────────
// Perfil del Usuario
// ──────────────────────────────────────────────
export interface UserProfile {
  name: string
  age: string
  gender: string
  weight: string
  height: string
  phone: string
  emergencyContact: string
}

// ──────────────────────────────────────────────
// Umbrales de alerta por defecto
// ──────────────────────────────────────────────
export const THRESHOLDS = {
  HR_MIN: 50,
  HR_MAX: 110,
  TEMP_MAX: 38.0,
  HISTORY_SIZE: 60,
} as const
