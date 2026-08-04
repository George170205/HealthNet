import { create } from 'zustand'
import type { DeviceState, DeviceTelemetry, Alert, AlertConfig, UserProfile } from '../types'
import { THRESHOLDS } from '../types'
import { patientsService } from '../services/patients'

interface DeviceStore {
  devices: Record<string, DeviceState>
  alerts: Alert[]
  theme: 'light' | 'dark'

  // Actions
  loadPatientsFromDb: () => Promise<void>
  upsertTelemetry: (data: DeviceTelemetry) => void
  acknowledgeAlert: (alertId: string) => void
  clearAlerts: (deviceId?: string) => void
  removeDevice: (deviceId: string) => Promise<void>
  updateDeviceProfile: (deviceId: string, prof: Partial<UserProfile>) => Promise<void>
  updateDeviceConfig: (deviceId: string, cfg: Partial<AlertConfig>) => Promise<void>
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

function detectAlerts(prev: DeviceState | undefined, data: DeviceTelemetry, config: AlertConfig, patientName: string): Alert[] {
  const alerts: Alert[] = []
  const now = Date.now()

  if (data.fallDetected) {
    alerts.push({
      id: generateAlertId(),
      deviceId: data.deviceId,
      type: 'fall',
      message: `¡Caída detectada en ${patientName}!`,
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

  loadPatientsFromDb: async () => {
    try {
      const patients = await patientsService.getPatients()
      if (patients.length === 0) return

      set((state) => {
        const updatedDevices = { ...state.devices }
        patients.forEach((p) => {
          const prev = updatedDevices[p.deviceId]
          
          // Guardar en copia local de respaldo
          const settingsMap = loadSettingsMap()
          settingsMap[p.deviceId] = {
            profile: p.profile,
            config: p.config
          }
          saveSettingsMap(settingsMap)

          updatedDevices[p.deviceId] = {
            deviceId: p.deviceId,
            patientName: p.patientName,
            connected: prev?.connected ?? false,
            lastSeen: prev?.lastSeen ?? 0,
            latest: prev?.latest ?? null,
            history: prev?.history ?? [],
            alerts: prev?.alerts ?? [],
            profile: p.profile,
            config: p.config,
          }
        })
        return { devices: updatedDevices }
      })
    } catch (err) {
      console.error('[Store] Error cargando pacientes de la BD:', err)
    }
  },

  upsertTelemetry: (data) => {
    set((state) => {
      const prev = state.devices[data.deviceId]
      
      // Carga o inicializa perfil y configuración del paciente
      const settingsMap = loadSettingsMap()
      let settings = settingsMap[data.deviceId]
      
      if (!settings && prev?.profile && prev?.config) {
        settings = {
          profile: prev.profile,
          config: prev.config
        }
        settingsMap[data.deviceId] = settings
        saveSettingsMap(settingsMap)
      } else if (!settings) {
        settings = {
          profile: createDefaultProfile(data.patientName || data.deviceId),
          config: { ...DEFAULT_CONFIG }
        }
        settingsMap[data.deviceId] = settings
        saveSettingsMap(settingsMap)

        // Registrar paciente nuevo en la base de datos de manera asíncrona
        patientsService.savePatient(data.deviceId, settings.profile, settings.config)
          .catch(err => console.error('[Store] Error al auto-registrar paciente nuevo en BD:', err))
      } else if (data.patientName && settings.profile.name !== data.patientName) {
        // Auto-actualizar el nombre si es una simulación nueva con nombre diferente (ej. de Ana García a Josuar Andreo)
        settings.profile.name = data.patientName
        settingsMap[data.deviceId] = settings
        saveSettingsMap(settingsMap)

        patientsService.savePatient(data.deviceId, settings.profile, settings.config)
          .catch(err => console.error('[Store] Error al actualizar nombre de paciente en la BD:', err))
      }

      const patientName = settings.profile.name || data.patientName || data.deviceId
      const newAlerts = detectAlerts(prev, data, settings.config, patientName)

      const history = [
        ...(prev?.history ?? []),
        data,
      ].slice(-THRESHOLDS.HISTORY_SIZE)

      const device: DeviceState = {
        deviceId: data.deviceId,
        patientName: patientName,
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

  removeDevice: async (deviceId) => {
    try {
      await patientsService.deletePatient(deviceId)
    } catch (err) {
      console.error('[Store] Error eliminando paciente de la BD:', err)
    }

    const settingsMap = loadSettingsMap()
    delete settingsMap[deviceId]
    saveSettingsMap(settingsMap)

    set((state) => {
      const { [deviceId]: _, ...rest } = state.devices
      return {
        devices: rest,
        alerts: state.alerts.filter(a => a.deviceId !== deviceId),
      }
    })
  },

  updateDeviceProfile: async (deviceId, prof) => {
    const { devices } = useDeviceStore.getState()
    const device = devices[deviceId]
    if (!device) return

    const updatedProfile = { ...device.profile!, ...prof }
    const updatedConfig = device.config || DEFAULT_CONFIG

    try {
      await patientsService.savePatient(deviceId, updatedProfile, updatedConfig)
    } catch (err) {
      console.error('[Store] Error guardando perfil en la BD:', err)
    }

    // Copia local de respaldo
    const settingsMap = loadSettingsMap()
    settingsMap[deviceId] = {
      profile: updatedProfile,
      config: updatedConfig
    }
    saveSettingsMap(settingsMap)

    // Actualizar en el estado de memoria
    set((state) => {
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

  updateDeviceConfig: async (deviceId, cfg) => {
    const { devices } = useDeviceStore.getState()
    const device = devices[deviceId]
    if (!device) return

    const updatedProfile = device.profile || createDefaultProfile(device.patientName || deviceId)
    const updatedConfig = { ...device.config!, ...cfg }

    try {
      await patientsService.savePatient(deviceId, updatedProfile, updatedConfig)
    } catch (err) {
      console.error('[Store] Error guardando configuración en la BD:', err)
    }

    // Copia local de respaldo
    const settingsMap = loadSettingsMap()
    settingsMap[deviceId] = {
      profile: updatedProfile,
      config: updatedConfig
    }
    saveSettingsMap(settingsMap)

    // Actualizar en el estado de memoria
    set((state) => {
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
