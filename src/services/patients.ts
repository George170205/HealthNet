import { AWS_CONFIG, isApiConfigured } from '../config/aws'
import type { UserProfile, AlertConfig } from '../types'

export interface ApiPatient {
  device_id: string
  name: string
  age: string
  gender: string
  weight: string
  height: string
  phone: string
  emergency_contact: string
  hr_min: number
  hr_max: number
  temp_max: string | number
  notifications_active: boolean
  watch_theme: 'light' | 'dark'
}

export interface PatientData {
  deviceId: string
  patientName: string
  profile: UserProfile
  config: AlertConfig
}

/**
 * Convierte un registro de la base de datos (API) al formato interno del frontend
 */
export function mapDbPatientToState(dbPatient: ApiPatient): PatientData {
  return {
    deviceId: dbPatient.device_id,
    patientName: dbPatient.name,
    profile: {
      name: dbPatient.name,
      age: dbPatient.age || '',
      gender: dbPatient.gender || '',
      weight: dbPatient.weight || '',
      height: dbPatient.height || '',
      phone: dbPatient.phone || '',
      emergencyContact: dbPatient.emergency_contact || '',
    },
    config: {
      hrMin: dbPatient.hr_min,
      hrMax: dbPatient.hr_max,
      tempMax: typeof dbPatient.temp_max === 'string' ? parseFloat(dbPatient.temp_max) : dbPatient.temp_max,
      notificationsActive: dbPatient.notifications_active,
      theme: 'light', // Se gestiona globalmente
      watchTheme: dbPatient.watch_theme || 'dark',
    }
  }
}

class PatientsService {
  /**
   * Obtiene la lista de todos los pacientes guardados en la BD
   */
  async getPatients(): Promise<PatientData[]> {
    if (!isApiConfigured()) {
      return [] // En modo demo/local no intentamos descargar
    }

    try {
      const response = await fetch(`${AWS_CONFIG.apiEndpoint}/patients`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiPatient[] = await response.json()
      return data.map(mapDbPatientToState)
    } catch (err) {
      console.error('[PatientsService] Error obteniendo pacientes de la base de datos:', err)
      throw err;
    }
  }

  /**
   * Guarda o actualiza un paciente (perfil y configuración) en la BD
   */
  async savePatient(
    deviceId: string,
    profile: UserProfile,
    config: AlertConfig
  ): Promise<PatientData> {
    if (!isApiConfigured()) {
      // Retornamos los mismos datos simulando éxito
      return { deviceId, patientName: profile.name, profile, config }
    }

    try {
      const payload = {
        deviceId,
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        weight: profile.weight,
        height: profile.height,
        phone: profile.phone,
        emergencyContact: profile.emergencyContact,
        hrMin: config.hrMin,
        hrMax: config.hrMax,
        tempMax: config.tempMax,
        notificationsActive: config.notificationsActive,
        watchTheme: config.watchTheme
      }

      const response = await fetch(`${AWS_CONFIG.apiEndpoint}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiPatient = await response.json()
      return mapDbPatientToState(data)
    } catch (err) {
      console.error(`[PatientsService] Error guardando paciente ${deviceId} en la base de datos:`, err)
      throw err
    }
  }

  /**
   * Elimina un paciente de la base de datos
   */
  async deletePatient(deviceId: string): Promise<void> {
    if (!isApiConfigured()) {
      return
    }

    try {
      const response = await fetch(`${AWS_CONFIG.apiEndpoint}/patients/${deviceId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (err) {
      console.error(`[PatientsService] Error eliminando paciente ${deviceId}:`, err)
      throw err
    }
  }
}

export const patientsService = new PatientsService()
