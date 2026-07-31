import { create } from 'zustand'
import type { DeviceState, DeviceTelemetry, Alert, AlertConfig, UserProfile } from '../types'
import { THRESHOLDS } from '../types'

interface DeviceStore {
  devices: Record<string, DeviceState>
  alerts: Alert[]
  theme: 'light' | 'dark'

  // Actions
  upsertTelemetry: (data: DeviceTelemetry) => void
  acknowledgeAlert: (alertId: string) => void
  clearAlerts: (deviceId?: string) => void
  removeDevice: (deviceId: string) => void
  updateDeviceProfile: (deviceId: string, prof: Partial<UserProfile>) => void
  updateDeviceConfig: (deviceId: string, cfg: Partial<AlertConfig>) => void
  setGlobalTheme: (theme: 'light' | 'dark') => void
}

const DEFAULT_CONFIG: AlertConfig = {
  hrMin: THRESHOLDS.HR_MIN,
  hrMax: THRESHOLDS.HR_MAX,
  tempMax: THRESHOLDS.TEMP_MAX,
  notificationsActive: true,
  theme: 'light',
  watchTheme: 'dark',
}

const createDefaultProfile = (name: string): UserProfile => ({
  name: name || 'Paciente Nuevo',
  age: '60',
  gender: 'No especificado',
  weight: '70 kg',
  height: '1.70 m',
  phone: '—',
  emergencyContact: '—',
})

const loadSettingsMap = (): Record<string, { profile: UserProfile, config: AlertConfig }> => {
  try {
    const raw = localStorage.getItem('healthnet_device_settings')
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error(e)
  }
  return {}
}

const saveSettingsMap = (map: Record<string, { profile: UserProfile, config: AlertConfig }>) => {
  try {
    localStorage.setItem('healthnet_device_settings', JSON.stringify(map))
  } catch (e) {
    console.error(e)
  }
}

const loadSystemTheme = (): 'light' | 'dark' => {
  try {
    const raw = localStorage.getItem('healthnet_global_theme')
    if (raw === 'dark' || raw === 'light') return raw
  } catch (e) {
    console.error(e)
  }
  return 'light'
}

const generateAlertId = () => `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

function detectAlerts(prev: DeviceState | undefined, data: DeviceTelemetry, config: AlertConfig): Alert[] {
  const alerts: Alert[] = []
  const now = Date.now()

  if (data.fallDetected) {
    alerts.push({
      id: generateAlertId(),
      deviceId: data.deviceId,
      type: 'fall',
      message: `¡Caída detectada en ${data.patientName || data.deviceId}!`,
      timestamp: now,
      acknowledged: false,
      status: 'pending',
    })
  }
  if (data.heartRate > config.hrMax) {
    alerts.push({
      id: generateAlertId(),
      deviceId: data.deviceId,
      type: 'high_hr',
      message: `Ritmo cardíaco elevado: ${data.heartRate} bpm`,
      timestamp: now,
      acknowledged: false,
      status: 'pending',
    })
  }
  if (data.heartRate < config.hrMin) {
    alerts.push({
      id: generateAlertId(),
      deviceId: data.deviceId,
      type: 'low_hr',
      message: `Ritmo cardíaco bajo: ${data.heartRate} bpm`,
      timestamp: now,
      acknowledged: false,
      status: 'pending',
    })
  }
  if (data.temperature > config.tempMax) {
    alerts.push({
      id: generateAlertId(),
      deviceId: data.deviceId,
      type: 'high_temp',
      message: `Temperatura elevada: ${data.temperature.toFixed(1)}°C`,
      timestamp: now,
      acknowledged: false,
      status: 'pending',
    })
  }

  // Suppress duplicates if prev already has same type unacknowledged
  if (prev) {
    return alerts.filter(a =>
      !prev.alerts.some(p => p.type === a.type && !p.acknowledged)
    )
  }
  return alerts
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: {},
  alerts: [],
  theme: loadSystemTheme(),

  upsertTelemetry: (data) => {
    set((state) => {
      const prev = state.devices[data.deviceId]
      
      // Load or initialize device-specific profile and config
      const settingsMap = loadSettingsMap()
      let settings = settingsMap[data.deviceId]
      if (!settings) {
        settings = {
          profile: createDefaultProfile(data.patientName || data.deviceId),
          config: { ...DEFAULT_CONFIG }
        }
        settingsMap[data.deviceId] = settings
        saveSettingsMap(settingsMap)
      }

      const newAlerts = detectAlerts(prev, data, settings.config)

      const history = [
        ...(prev?.history ?? []),
        data,
      ].slice(-THRESHOLDS.HISTORY_SIZE)

      const device: DeviceState = {
        deviceId: data.deviceId,
        patientName: settings.profile.name || data.patientName || prev?.patientName || data.deviceId,
        connected: true,
        lastSeen: data.timestamp,
        latest: data,
        history,
        alerts: [...(prev?.alerts ?? []), ...newAlerts],
        profile: settings.profile,
        config: settings.config,
      }

      return {
        devices: { ...state.devices, [data.deviceId]: device },
        alerts: [...state.alerts, ...newAlerts],
      }
    })
  },

  acknowledgeAlert: (alertId) => {
    set((state) => {
      const updatedAlerts = state.alerts.map(a =>
        a.id === alertId ? { ...a, acknowledged: true, status: 'attended' as const } : a
      )
      const updatedDevices = { ...state.devices }
      for (const id in updatedDevices) {
        updatedDevices[id] = {
          ...updatedDevices[id],
          alerts: updatedDevices[id].alerts.map(a =>
            a.id === alertId ? { ...a, acknowledged: true, status: 'attended' as const } : a
          ),
        }
      }
      return { alerts: updatedAlerts, devices: updatedDevices }
    })
  },

  clearAlerts: (deviceId) => {
    set((state) => {
      if (deviceId) {
        const updatedDevices = { ...state.devices }
        if (updatedDevices[deviceId]) {
          updatedDevices[deviceId] = { ...updatedDevices[deviceId], alerts: [] }
        }
        return {
          devices: updatedDevices,
          alerts: state.alerts.filter(a => a.deviceId !== deviceId),
        }
      }
      const updatedDevices = { ...state.devices }
      for (const id in updatedDevices) {
        updatedDevices[id] = { ...updatedDevices[id], alerts: [] }
      }
      return { devices: updatedDevices, alerts: [] }
    })
  },

  removeDevice: (deviceId) => {
    set((state) => {
      const { [deviceId]: _, ...rest } = state.devices
      return {
        devices: rest,
        alerts: state.alerts.filter(a => a.deviceId !== deviceId),
      }
    })
  },

  updateDeviceProfile: (deviceId, prof) => {
    set((state) => {
      const settingsMap = loadSettingsMap()
      const device = state.devices[deviceId]
      const currentSettings = settingsMap[deviceId] || {
        profile: createDefaultProfile(device?.patientName || deviceId),
        config: { ...DEFAULT_CONFIG }
      }

      const updatedProfile = { ...currentSettings.profile, ...prof }
      settingsMap[deviceId] = {
        ...currentSettings,
        profile: updatedProfile
      }
      saveSettingsMap(settingsMap)

      // Update in-memory state
      const updatedDevices = { ...state.devices }
      if (updatedDevices[deviceId]) {
        updatedDevices[deviceId] = {
          ...updatedDevices[deviceId],
          patientName: updatedProfile.name,
          profile: updatedProfile
        }
      }

      return { devices: updatedDevices }
    })
  },

  updateDeviceConfig: (deviceId, cfg) => {
    set((state) => {
      const settingsMap = loadSettingsMap()
      const device = state.devices[deviceId]
      const currentSettings = settingsMap[deviceId] || {
        profile: createDefaultProfile(device?.patientName || deviceId),
        config: { ...DEFAULT_CONFIG }
      }

      const updatedConfig = { ...currentSettings.config, ...cfg }
      settingsMap[deviceId] = {
        ...currentSettings,
        config: updatedConfig
      }
      saveSettingsMap(settingsMap)

      // Update in-memory state
      const updatedDevices = { ...state.devices }
      if (updatedDevices[deviceId]) {
        updatedDevices[deviceId] = {
          ...updatedDevices[deviceId],
          config: updatedConfig
        }
      }

      return { devices: updatedDevices }
    })
  },

  setGlobalTheme: (theme) => {
    set(() => {
      try {
        localStorage.setItem('healthnet_global_theme', theme)
      } catch (e) {
        console.error(e)
      }
      return { theme }
    })
  }
}))
