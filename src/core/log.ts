import { reactive } from 'vue'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  time: number
  level: LogLevel
  message: string
  detail?: string
}

const MAX_ENTRIES = 200

export const logState = reactive<{
  enabled: boolean
  entries: LogEntry[]
}>({
  enabled: false,
  entries: [],
})

let sequence = 0

export function setDebugLogging(enabled: boolean): void {
  logState.enabled = Boolean(enabled)
}

export function isDebugLogging(): boolean {
  return logState.enabled
}

export function logDebug(message: string, detail?: string): void {
  if (!logState.enabled) {
    return
  }
  push('debug', message, detail)
}

export function logInfo(message: string, detail?: string): void {
  push('info', message, detail)
}

export function logWarn(message: string, detail?: string): void {
  push('warn', message, detail)
}

export function logError(message: string, error?: unknown): void {
  push('error', message, error === undefined ? undefined : errorDetail(error))
}

export function getRecentLogs(limit = MAX_ENTRIES): LogEntry[] {
  const size = Math.max(0, Math.min(limit, logState.entries.length))
  return logState.entries.slice(logState.entries.length - size)
}

export function clearLogs(): void {
  logState.entries.splice(0, logState.entries.length)
}

export function formatLogEntry(entry: LogEntry): string {
  const time = new Date(entry.time).toLocaleString()
  const lines = [`[${time}] [${entry.level.toUpperCase()}] ${entry.message}`]
  if (entry.detail) {
    lines.push(entry.detail)
  }
  return lines.join('\n')
}

export function formatLogs(entries: LogEntry[] = getRecentLogs()): string {
  return entries.map(formatLogEntry).join('\n\n')
}

function push(level: LogLevel, message: string, detail?: string): void {
  const entry: LogEntry = {
    id: ++sequence,
    time: Date.now(),
    level,
    message,
    detail: detail ? sanitize(detail) : undefined,
  }

  logState.entries.push(entry)
  if (logState.entries.length > MAX_ENTRIES) {
    logState.entries.splice(0, logState.entries.length - MAX_ENTRIES)
  }

  if (logState.enabled) {
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
    // eslint-disable-next-line no-console
    console[method](`[Pigo] ${message}`, detail ?? '')
  }
}

function sanitize(value: string): string {
  return value
    .replace(/(secretAccessKey|accessKeyId|secretId|secretKey|authorization)["']?\s*[:=]\s*["']?[^"'\s,}]+/gi, '$1: ***')
    .slice(0, 4000)
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`
  }
  return String(error)
}
