import { reactive } from 'vue'

export type PigoTabId = 'upload' | 'stats' | 'sync' | 'settings'

interface PigoUiState {
  popupVisible: boolean
  activeTab: PigoTabId
  /** 置顶：面板保持最上层，且 Esc / 点击外部不关闭。 */
  pinned: boolean
  /** 页脚展示的“当前模式”，由各 Tab 主动设置。 */
  modeLabel: string
  /** 同步页的待清理数量；null 表示还没有同步报告。 */
  cleanupCount: number | null
}

const PINNED_STORAGE_KEY = 'siyuan-plugin-pigo:pinned'
const APP_ROOT_SELECTOR = '.siyuan-plugin-pigo-app'
const BASE_Z_INDEX = '9999'
const PINNED_Z_INDEX = '10001'

let lastHiddenAt = 0

export const uiState = reactive<PigoUiState>({
  popupVisible: false,
  activeTab: 'upload',
  pinned: readPinned(),
  modeLabel: '',
  cleanupCount: null,
})

export function showPigoPopup(tab: PigoTabId = 'upload'): void {
  uiState.activeTab = tab
  uiState.popupVisible = true
  applyAppZIndex(uiState.pinned)
}

export function hidePigoPopup(force = false): void {
  if (uiState.pinned && !force) {
    return
  }
  uiState.popupVisible = false
  lastHiddenAt = Date.now()
}

export function togglePigoPopup(tab: PigoTabId = 'upload'): void {
  if (uiState.popupVisible) {
    hidePigoPopup(true)
    return
  }
  // 点击面板外部关闭时，紧接着的同一个点击（例如顶栏图标）不应立即重新打开。
  if (Date.now() - lastHiddenAt < 300) {
    return
  }
  showPigoPopup(tab)
}

export function setPigoPinned(value: boolean): void {
  uiState.pinned = value
  persistPinned(value)
  applyAppZIndex(value)
}

export function togglePigoPinned(): void {
  setPigoPinned(!uiState.pinned)
}

export function setPigoMode(label: string): void {
  uiState.modeLabel = label || ''
}

function readPinned(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return window.localStorage.getItem(PINNED_STORAGE_KEY) === '1'
  }
  catch {
    return false
  }
}

function persistPinned(value: boolean): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(PINNED_STORAGE_KEY, value ? '1' : '0')
  }
  catch {
    // 忽略本地存储失败。
  }
}

/**
 * 置顶只是页面内层级调整（网页层无法做到系统级 always-on-top）。
 */
function applyAppZIndex(pinned: boolean): void {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.querySelector(APP_ROOT_SELECTOR) as HTMLElement | null
  if (root) {
    root.style.zIndex = pinned ? PINNED_Z_INDEX : BASE_Z_INDEX
  }
}
