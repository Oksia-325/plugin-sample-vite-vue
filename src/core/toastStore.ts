import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface PigoToastItem {
  id: number
  type: ToastType
  text: string
}

const MAX_ITEMS = 3
const DEFAULT_TIMEOUT = 3200

export const toastState = reactive<{ items: PigoToastItem[] }>({
  items: [],
})

let sequence = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()

/**
 * 统一的底部浮层提示：不参与页面布局，不推挤主要内容。
 */
export function pushToast(type: ToastType, text: string, timeout = DEFAULT_TIMEOUT): number {
  const message = (text || '').trim()
  if (!message) {
    return 0
  }

  const id = ++sequence
  toastState.items.push({ id, type, text: message })
  trimOverflow()

  if (timeout > 0) {
    timers.set(id, setTimeout(() => dismissToast(id), timeout))
  }

  return id
}

export function dismissToast(id: number): void {
  const index = toastState.items.findIndex((item) => item.id === id)
  if (index >= 0) {
    toastState.items.splice(index, 1)
  }
  clearTimer(id)
}

export function clearToasts(): void {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  toastState.items.splice(0, toastState.items.length)
}

function trimOverflow(): void {
  while (toastState.items.length > MAX_ITEMS) {
    const removed = toastState.items.shift()
    if (!removed) {
      break
    }
    clearTimer(removed.id)
  }
}

function clearTimer(id: number): void {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}
