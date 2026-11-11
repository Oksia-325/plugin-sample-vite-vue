import type {
  CollectionInfo,
  IconInfo,
  PluginSettings,
} from "./types"
import { forwardProxy } from "@/api"

const API_BASE_URL = "https://api-icons.icons8.com"
const DOWNLOAD_BASE_URL = "https://img.icons8.com/"
const COLLECTION_LIMIT = 150
const PAGE_SIZE = 50
const API_TIMEOUT = 30000
const DOWNLOAD_TIMEOUT = 60000

export class Icons8Error extends Error {
  readonly status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = "Icons8Error"
    this.status = status
  }
}

export class UnauthorizedError extends Icons8Error {
  constructor(message = "Unauthorized (401)") {
    super(message, 401)
    this.name = "UnauthorizedError"
  }
}

export class Icons8Client {
  constructor(private getSettings: () => PluginSettings) {}

  async getCollections(): Promise<CollectionInfo[]> {
    const params = new URLSearchParams({
      previewCount: "5", // 为 0 会报错
      limit: String(COLLECTION_LIMIT),
      select: "id,apiCode,totalIcons,name",
      sort: "-updatedAt",
    })
    const data = await this.requestJson(`${API_BASE_URL}/siteApi/collections/v2?${params.toString()}`)
    if (!data?.success) {
      throw new Icons8Error("Icons8 API returned failure")
    }
    return (data.docs ?? []).map((doc: any) => ({
      id: String(doc.id),
      apiCode: String(doc.apiCode ?? ""),
      name: String(doc.name ?? "unnamed"),
      totalIcons: Number(doc.totalIcons ?? 0),
    }))
  }

  async getCollectionIcons(apiCode: string): Promise<IconInfo[]> {
    const icons: IconInfo[] = []
    let page = 1
    while (true) {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
      })
      const url = `${API_BASE_URL}/siteApi/collections/v2/${encodeURIComponent(apiCode)}/icons?${params.toString()}`
      const data = await this.requestJson(url)
      if (!data?.success) {
        throw new Icons8Error("Icons8 API returned failure")
      }
      for (const doc of data.docs ?? []) {
        icons.push({
          id: String(doc.id),
          name: String(doc.name ?? "unnamed"),
          platform: String(doc.platform ?? "unknown"),
          formats: Array.isArray(doc.formats) ? doc.formats.map(String) : [],
        })
      }
      const totalPages = Number(data.pages ?? 1)
      if (page >= totalPages) {
        break
      }
      page++
    }
    return icons
  }

  async downloadIcon(iconId: string): Promise<Blob> {
    const {
      downloadSize,
      downloadFormat,
    } = this.getSettings()
    const url = `${DOWNLOAD_BASE_URL}?size=${downloadSize}&id=${encodeURIComponent(iconId)}&format=${downloadFormat}`
    // 下载 CDN 通常允许跨域：优先直连，失败（CORS/网络）回退内核代理
    try {
      const resp = await fetch(url)
      if (resp.ok) {
        return await resp.blob()
      }
    } catch {
      // fallthrough to forwardProxy
    }
    const res = await forwardProxy(url, "GET", {}, [], DOWNLOAD_TIMEOUT, "text/html", "base64").catch(() => null)
    if (!res) {
      throw new Icons8Error("Icon download failed (forwardProxy)")
    }
    if (res.status >= 400) {
      throw new Icons8Error(`Icon download failed: HTTP ${res.status}`, res.status)
    }
    const contentType = res.contentType || (downloadFormat === "svg" ? "image/svg+xml" : "image/png")
    return decodeForwardProxyBody(res.body, contentType, res.bodyEncoding)
  }

  private async requestJson(url: string): Promise<any> {
    const settings = this.getSettings()
    if (settings.autoProxy) {
      const direct = await this.requestJsonDirect(url, settings.authorization)
      if (direct !== null) {
        return direct
      }
    }

    const token = settings.authorization
    // 思源内核 forwardProxy 的 headers 格式为对象数组: [{ "Header-Name": "value" }]
    const headers = [{ Authorization: `Bearer ${token}` }]
    const res = await forwardProxy(url, "GET", {}, headers, API_TIMEOUT, "text/html").catch(() => null)
    if (!res) {
      throw new Icons8Error(settings.autoProxy
        ? "Icons8 API request failed (system proxy / forwardProxy)"
        : "Icons8 API request failed (forwardProxy)")
    }
    if (res.status === 401) {
      throw new UnauthorizedError()
    }
    if (res.status >= 400) {
      throw new Icons8Error(`Icons8 API HTTP ${res.status}`, res.status)
    }
    try {
      return JSON.parse(res.body)
    } catch {
      throw new Icons8Error("Invalid JSON response from Icons8 API")
    }
  }

  /**
   * 直接走 Chromium 网络栈（跟随系统代理）。Icons8 API 已允许跨域，
   * 失败时返回 null 以便回退到思源内核代理。
   */
  private async requestJsonDirect(url: string, token: string): Promise<any | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT)
    try {
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      })
      if (resp.status === 401) {
        throw new UnauthorizedError()
      }
      if (!resp.ok) {
        return null
      }
      try {
        return await resp.json()
      } catch {
        return null
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        throw err
      }
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}

function decodeForwardProxyBody(body: string, contentType: string, bodyEncoding?: string): Blob {
  if (bodyEncoding === "text") {
    return new Blob([body], { type: contentType })
  }
  try {
    const bin = atob(body.replace(/\s+/g, ""))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i)
    }
    return new Blob([bytes], { type: contentType })
  } catch {
    return new Blob([body], { type: contentType })
  }
}
