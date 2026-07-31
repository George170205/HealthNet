/**
 * iotService — conecta el dashboard a AWS IoT Core via MQTT/WebSocket
 * y despacha la telemetría al deviceStore.
 *
 * La URL de WebSocket para IoT Core se firma con SigV4 usando las
 * credenciales de Cognito Identity Pool.
 *
 * En modo DEMO (sin .env configurado), simula la recepción en memoria.
 */
import mqtt from 'mqtt'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MqttClient = any
import { AWS_CONFIG, isAwsConfigured } from '../config/aws'
import { useDeviceStore } from '../store/deviceStore'
import type { DeviceTelemetry } from '../types'

// ── SigV4 helper (browser) ────────────────────────────────────────────
async function sha256(message: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  return crypto.subtle.digest('SHA-256', enc.encode(message))
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmac(key: ArrayBuffer | string, message: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const k = typeof key === 'string'
    ? await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    : await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', k, enc.encode(message))
}

async function buildIotWsUrl(credentials: {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}): Promise<string> {
  const { accessKeyId, secretAccessKey, sessionToken } = credentials
  const endpoint = AWS_CONFIG.iot.endpoint
  const region   = AWS_CONFIG.region
  const now      = new Date()
  const date     = now.toISOString().slice(0, 10).replace(/-/g, '')
  const time     = now.toISOString().slice(11, 19).replace(/:/g, '')
  const datetime = `${date}T${time}Z`

  const scope      = `${date}/${region}/iotdevicegateway/aws4_request`
  const algorithm  = 'AWS4-HMAC-SHA256'
  const queryBase  = `X-Amz-Algorithm=${algorithm}&X-Amz-Credential=${encodeURIComponent(`${accessKeyId}/${scope}`)}&X-Amz-Date=${datetime}&X-Amz-SignedHeaders=host`
  const canonRequest = ['GET', '/mqtt', queryBase, `host:${endpoint}\n`, 'host', await toHex(await sha256(''))].join('\n')
  const strToSign    = [algorithm, datetime, scope, await toHex(await sha256(canonRequest))].join('\n')

  const signingKey = await hmac(
    await hmac(await hmac(await hmac(`AWS4${secretAccessKey}`, date), region), 'iotdevicegateway'),
    'aws4_request'
  )
  const signature = await toHex(await hmac(signingKey, strToSign))

  let url = `wss://${endpoint}/mqtt?${queryBase}&X-Amz-Signature=${signature}`
  if (sessionToken) url += `&X-Amz-Security-Token=${encodeURIComponent(sessionToken)}`
  return url
}

// ── IoT Service class ─────────────────────────────────────────────────
class IotService {
  private client: MqttClient | null = null
  private subscribed = false

  async connect(credentials?: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
  }): Promise<void> {
    if (this.client?.connected) return

    if (!isAwsConfigured()) {
      console.warn('[IoT] Modo demo — sin conexión real a AWS IoT Core (Falta configuración en .env)')
      return
    }
    if (!credentials) {
      console.warn('[IoT] No se recibieron credenciales temporales de Cognito')
      return
    }

    const url = await buildIotWsUrl(credentials)
    this.client = mqtt.connect(url, {
      clientId: `healthnet-dashboard-${Math.random().toString(36).slice(2, 9)}`,
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 5000,
    })

    this.client.on('connect', () => {
      console.log('[IoT] Conectado a AWS IoT Core')
      this.subscribe()
    })

    this.client.on('message', (_topic: string, payload: Buffer) => {
      try {
        const data: DeviceTelemetry = JSON.parse(payload.toString())
        useDeviceStore.getState().upsertTelemetry(data)
      } catch (e) {
        console.error('[IoT] Error parseando mensaje:', e)
      }
    })

    this.client.on('error', (err: Error) => {
      console.error('[IoT] Error:', err.message)
    })
  }

  private subscribe() {
    if (!this.client || this.subscribed) return
    const topic = `${AWS_CONFIG.iot.topicPrefix}/+/telemetry`
    this.client.subscribe(topic, (err) => {
      if (!err) {
        console.log(`[IoT] Suscrito a ${topic}`)
        this.subscribed = true
      }
    })
  }

  /** Publica telemetría (usado por el simulador) */
  async publish(deviceId: string, data: DeviceTelemetry): Promise<void> {
    const topic = `${AWS_CONFIG.iot.topicPrefix}/${deviceId}/telemetry`
    if (this.client?.connected) {
      this.client.publish(topic, JSON.stringify(data))
    }
    // En modo demo también actualizamos el store directamente
    useDeviceStore.getState().upsertTelemetry(data)
  }

  disconnect() {
    this.client?.end()
    this.client = null
    this.subscribed = false
  }
}

export const iotService = new IotService()
