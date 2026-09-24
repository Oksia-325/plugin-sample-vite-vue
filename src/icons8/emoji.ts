import { fetchSyncPost } from "siyuan"

export async function reloadEmoji(): Promise<boolean> {
  try {
    const resp = await fetchSyncPost("/api/emoji/reloadEmoji", {})
    return resp?.code === 0
  } catch {
    return false
  }
}
