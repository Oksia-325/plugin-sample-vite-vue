import { reactive } from 'vue'
import type { Plugin } from 'siyuan'
import { getFile } from '@/api'
import { logError, logInfo, setDebugLogging } from './log'
import {
  cloneConfig,
  CONFIG_STORAGE_NAME,
  DEFAULT_CONFIG,
  mergeConfig,
  normalizeConfig,
  validateConfig,
  type PigoConfig,
  type ValidationIssue,
} from './config'
import {
  mapLegacyPicgoConfig,
  parseLegacyConfig,
  type LegacyS3ImportResult,
} from './legacyConfig'

interface ConfigState {
  config: PigoConfig
  loaded: boolean
  loading: boolean
  saving: boolean
  error: string
  validation: ValidationIssue[]
}

export type { LegacyS3ImportResult } from './legacyConfig'

const LEGACY_CONFIG_PATH = '/data/storage/syp/picgo/picgo.cfg.json'

export const configState = reactive<ConfigState>({
  config: cloneConfig(DEFAULT_CONFIG),
  loaded: false,
  loading: false,
  saving: false,
  error: '',
  validation: [],
})

let loadPromise: Promise<void> | null = null

export function usePigoConfigStore() {
  return configState
}

export async function ensureConfigLoaded(plugin: Plugin): Promise<void> {
  if (configState.loaded) {
    return
  }

  if (loadPromise) {
    return await loadPromise
  }

  loadPromise = (async () => {
    configState.loading = true
    configState.error = ''
    try {
      const raw = await plugin.loadData(CONFIG_STORAGE_NAME)
      configState.config = mergeConfig(raw)
      configState.loaded = true
      setDebugLogging(configState.config.behavior.debug)
    }
    catch (error) {
      configState.error = errorToMessage(error)
      logError('读取配置失败', error)
    }
    finally {
      configState.loading = false
      loadPromise = null
    }
  })()

  await loadPromise
}

export async function savePigoConfig(plugin: Plugin): Promise<{ ok: boolean, issues: ValidationIssue[] }> {
  const issues = validateConfig(configState.config)
  configState.validation = issues

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  const normalized = normalizeConfig(configState.config)

  configState.saving = true
  configState.error = ''
  try {
    await plugin.saveData(CONFIG_STORAGE_NAME, normalized)
    configState.config = normalized
    configState.loaded = true
    configState.validation = []
    setDebugLogging(normalized.behavior.debug)
    logInfo('配置已保存')
    return { ok: true, issues: [] }
  }
  catch (error) {
    configState.error = errorToMessage(error)
    logError('保存配置失败', error)
    return { ok: false, issues: [{ field: 'config', message: configState.error }] }
  }
  finally {
    configState.saving = false
  }
}

export function resetPigoConfig(): void {
  configState.config = cloneConfig(DEFAULT_CONFIG)
  configState.validation = []
  configState.error = ''
  setDebugLogging(false)
}

/**
 * 只更新行为开关（自动监控等），跳过 S3 字段校验，保证未配置存储时也能保存。
 *
 * 采用“乐观更新 + 失败回滚”：开关点下去立刻生效，写盘失败再恢复。
 */
export async function saveBehaviorPatch(
  plugin: Plugin,
  patch: Partial<PigoConfig['behavior']>
): Promise<{ ok: boolean, error?: string }> {
  await ensureConfigLoaded(plugin)

  const previous = cloneConfig(configState.config)
  const next = normalizeConfig({
    ...configState.config,
    behavior: {
      ...configState.config.behavior,
      ...patch,
    },
  })

  configState.config = next
  configState.saving = true
  configState.error = ''

  try {
    await plugin.saveData(CONFIG_STORAGE_NAME, next)
    setDebugLogging(next.behavior.debug)
    return { ok: true }
  }
  catch (error) {
    configState.config = previous
    configState.error = errorToMessage(error)
    logError('保存行为配置失败', error)
    return { ok: false, error: configState.error }
  }
  finally {
    configState.saving = false
  }
}

/**
 * 当前配置是否可以执行上传/同步等写操作。
 */
export function getConfigIssues(): ValidationIssue[] {
  return validateConfig(configState.config)
}

export function isConfigReady(): boolean {
  return configState.loaded && validateConfig(configState.config).length === 0
}

export async function ensureConfigReady(plugin: Plugin): Promise<{ ok: boolean, issues: ValidationIssue[] }> {
  await ensureConfigLoaded(plugin)
  const issues = validateConfig(configState.config)
  configState.validation = issues
  return { ok: issues.length === 0, issues }
}

export async function readLegacyPicgoS3Config(): Promise<LegacyS3ImportResult | null> {
  let raw: unknown
  try {
    raw = await getFile(LEGACY_CONFIG_PATH)
  }
  catch {
    return null
  }

  const parsed = parseLegacyConfig(raw)
  return parsed ? mapLegacyPicgoConfig(parsed) : null
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
