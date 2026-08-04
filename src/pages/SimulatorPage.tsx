import { useState, useEffect, useCallback } from 'react'
import {
  PlusCircle, Play, Square, Zap, Trash2,
  Cpu, RefreshCw, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { simulatorService } from '../services/simulator'
import { useDeviceStore } from '../store/deviceStore'
import type { SimulatedDevice } from '../types'

const PATIENT_NAMES = [
  'Ana García', 'Carlos López', 'María Martínez', 'José Rodríguez',
  'Laura Hernández', 'Miguel González', 'Carmen Sánchez', 'Luis Torres',
  'Rosa Flores', 'Pedro Ramírez',
]

const DEFAULT_INTERVAL = 3000

function nextDeviceId(): string {
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `ESP32-${rand}`
}

interface DeviceRow {
  config: SimulatedDevice
  running: boolean
  packetsSent: number
}

export default function SimulatorPage() {
  const storeDevices = useDeviceStore(s => Object.values(s.devices))
  const removeDevice = useDeviceStore(s => s.removeDevice)

  const [rows, setRows]               = useState<DeviceRow[]>([])
  const [newName, setNewName]         = useState('')
  const [newInterval, setNewInterval] = useState(DEFAULT_INTERVAL)
  const [showConfig, setShowConfig]   = useState(false)
  const [ticker, setTicker]           = useState(0)

  // Sync running state every second
  useEffect(() => {
    const id = setInterval(() => setTicker(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const syncRows = useCallback(() => {
    const svcDevices = simulatorService.getDevices()
    setRows(prev => {
      const packetsMap = new Map(prev.map(r => [r.config.deviceId, r.packetsSent]))
      return svcDevices.map(d => ({
        config: d,
        running: d.running,
        packetsSent: (packetsMap.get(d.deviceId) || 0) + (d.running ? 1 : 0)
      }))
    })
  }, [])

  // Sync database patients to simulator on mount/update
  useEffect(() => {
    let changed = false
    storeDevices.forEach(d => {
      if (!simulatorService.getDevices().some(sd => sd.deviceId === d.deviceId)) {
        simulatorService.addDevice({
          deviceId: d.deviceId,
          patientName: d.patientName,
          intervalMs: DEFAULT_INTERVAL,
          running: false
        })
        changed = true
      }
    })
    if (changed || ticker === 0) {
      syncRows()
    }
  }, [storeDevices, ticker, syncRows])

  useEffect(() => {
    if (ticker > 0) {
      syncRows()
    }
  }, [ticker, syncRows])

  const addDevice = () => {
    const name = newName.trim() || PATIENT_NAMES[rows.length % PATIENT_NAMES.length]
    const config: SimulatedDevice = {
      deviceId:    nextDeviceId(),
      patientName: name,
      intervalMs:  newInterval,
      running:     false,
    }
    simulatorService.addDevice(config)
    syncRows()
    setNewName('')
  }

  const addBatch = (n: number) => {
    for (let i = 0; i < n; i++) addDevice()
  }

  const toggleDevice = (deviceId: string, running: boolean) => {
    if (running) simulatorService.stopDevice(deviceId)
    else         simulatorService.startDevice(deviceId)
    setRows(prev => prev.map(r =>
      r.config.deviceId === deviceId ? { ...r, running: !running } : r
    ))
  }

  const deleteDevice = (deviceId: string) => {
    simulatorService.removeDevice(deviceId)
    removeDevice(deviceId)
    syncRows()
  }

  const triggerFall = (deviceId: string) => {
    simulatorService.triggerFall(deviceId)
  }

  const startAll = () => {
    simulatorService.startAll()
    setRows(prev => prev.map(r => ({ ...r, running: true })))
  }

  const stopAll = () => {
    simulatorService.stopAll()
    setRows(prev => prev.map(r => ({ ...r, running: false })))
  }

  const runningCount = rows.filter(r => simulatorService.isRunning(r.config.deviceId)).length

  return (
    <div className="min-h-screen bg-hn-50 pt-20 pb-8">
      <div className="max-w-screen-lg mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-hn-800">Simulador de Dispositivos</h1>
            <p className="text-sm text-hn-500 mt-0.5">
              Emula ESP32s enviando telemetría vía AWS IoT Core MQTT
            </p>
          </div>
          <div className="flex items-center gap-2">
            {rows.length > 0 && (
              <>
                <button
                  onClick={stopAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-hn-300
                    text-hn-700 text-sm hover:bg-hn-50 transition-colors shadow-sm"
                >
                  <Square size={13} />
                  Detener todo
                </button>
                <button
                  onClick={startAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-hn-800 text-white
                    text-sm hover:bg-hn-900 transition-colors shadow-sm"
                >
                  <Play size={13} />
                  Iniciar todo
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-hn-200 px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-hn-800">{rows.length}</p>
            <p className="text-xs text-hn-500">Dispositivos creados</p>
          </div>
          <div className="bg-white rounded-xl border border-hn-200 px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{runningCount}</p>
            <p className="text-xs text-hn-500">Enviando datos</p>
          </div>
          <div className="bg-white rounded-xl border border-hn-200 px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-hn-700">{rows.length - runningCount}</p>
            <p className="text-xs text-hn-500">Detenidos</p>
          </div>
        </div>

        {/* Add device panel */}
        <div className="bg-white rounded-2xl border border-hn-200 shadow-sm mb-5">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-hn-50 rounded-2xl transition-colors"
          >
            <div className="flex items-center gap-2 text-hn-800 font-semibold">
              <PlusCircle size={18} className="text-hn-700" />
              Agregar dispositivo
            </div>
            {showConfig ? <ChevronUp size={16} className="text-hn-400" /> : <ChevronDown size={16} className="text-hn-400" />}
          </button>

          {showConfig && (
            <div className="px-5 pb-5 border-t border-hn-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-hn-600 mb-1">Nombre del paciente</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder={`Ej: ${PATIENT_NAMES[rows.length % PATIENT_NAMES.length]}`}
                    className="w-full px-3 py-2.5 rounded-xl border border-hn-300 text-sm text-hn-800
                      placeholder:text-hn-300 focus:outline-none focus:ring-2 focus:ring-hn-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hn-600 mb-1">
                    Intervalo (ms)
                  </label>
                  <input
                    type="number"
                    value={newInterval}
                    onChange={e => setNewInterval(Math.max(500, Number(e.target.value)))}
                    min={500}
                    step={500}
                    className="w-full px-3 py-2.5 rounded-xl border border-hn-300 text-sm text-hn-800
                      focus:outline-none focus:ring-2 focus:ring-hn-500"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={addDevice}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-hn-800 text-white text-sm
                    font-semibold hover:bg-hn-900 transition-colors shadow-sm"
                >
                  <Cpu size={15} />
                  Agregar 1 dispositivo
                </button>
                {[3, 5, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => addBatch(n)}
                    className="px-4 py-2.5 rounded-xl bg-hn-100 text-hn-800 text-sm font-medium
                      hover:bg-hn-200 transition-colors"
                  >
                    + {n} a la vez
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Device rows */}
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-hn-200 py-16 flex flex-col items-center gap-3">
            <Cpu size={40} className="text-hn-300" />
            <p className="text-hn-600 font-semibold">Sin dispositivos</p>
            <p className="text-hn-400 text-sm text-center max-w-xs">
              Usa el panel de arriba para agregar uno o varios dispositivos virtuales ESP32.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(({ config, running: _running }) => {
              const isRunning = simulatorService.isRunning(config.deviceId)
              return (
                <div
                  key={config.deviceId}
                  className={`bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-4
                    ${isRunning ? 'border-emerald-300' : 'border-hn-200'}`}
                >
                  {/* Status dot */}
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-hn-300'}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-hn-800 text-sm truncate">{config.patientName}</p>
                    <p className="text-xs text-hn-400">{config.deviceId} · {config.intervalMs}ms</p>
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium hidden sm:inline-block
                    ${isRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-hn-100 text-hn-600'}`}>
                    {isRunning ? 'Enviando' : 'Detenido'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Force fall */}
                    <button
                      onClick={() => triggerFall(config.deviceId)}
                      title="Simular caída"
                      className="p-2 rounded-lg hover:bg-amber-50 text-amber-500 hover:text-amber-600 transition-colors"
                    >
                      <AlertTriangle size={15} />
                    </button>

                    {/* Start/Stop */}
                    <button
                      onClick={() => toggleDevice(config.deviceId, isRunning)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                        ${isRunning
                          ? 'bg-red-50 text-red-500 hover:bg-red-100'
                          : 'bg-hn-800 text-white hover:bg-hn-900'
                        }`}
                    >
                      {isRunning ? <><Square size={12} /> Detener</> : <><Play size={12} /> Iniciar</>}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteDevice(config.deviceId)}
                      className="p-2 rounded-lg hover:bg-red-50 text-hn-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* JSON preview */}
        {rows.length > 0 && (
          <div className="mt-6 bg-hn-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw size={13} className="text-hn-300" />
              <p className="text-hn-300 text-xs font-semibold uppercase tracking-widest">
                Estructura JSON publicada en IoT Core
              </p>
            </div>
            <pre className="text-hn-100 text-xs leading-relaxed overflow-x-auto">
{`{
  "deviceId":    "ESP32-001",
  "patientName": "Ana García",
  "timestamp":   ${Date.now()},
  "heartRate":   72,
  "temperature": 36.5,
  "fallDetected": false,
  "batteryLevel": 85,
  "accelerometer": { "x": 0.02, "y": -0.01, "z": 9.81 }
}

Topic: healthnet/devices/{deviceId}/telemetry`}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
