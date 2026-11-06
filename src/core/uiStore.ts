import { reactive } from 'vue'

export type PigoTabId = 'upload' | 'stats' | 'sync' | 'settings'

interface PigoUiState {
  popupVisible: boolean
  activeTab: PigoTabId
}

export const uiState = reactive<PigoUiState>({
  popupVisible: false,
  activeTab: 'upload',
})

export function showPigoPopup(tab: PigoTabId = 'upload'): void {
  uiState.activeTab = tab
  uiState.popupVisible = true
}

export function hidePigoPopup(): void {
  uiState.popupVisible = false
}

export function togglePigoPopup(tab: PigoTabId = 'upload'): void {
  if (uiState.popupVisible) {
    hidePigoPopup()
    return
  }
  showPigoPopup(tab)
}
