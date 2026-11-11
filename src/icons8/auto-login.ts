export type AutoLoginReason = "ok" | "windows" | "other" | "web"
export type AutoLoginErrorCode = "unsupported" | "no-firefox" | "no-session" | "timeout" | "failed"

export interface AutoLoginSupport {
  supported: boolean
  platform: string
  reason: AutoLoginReason
}

export type AutoLoginResult =
  | { ok: true, token: string }
  | { ok: false, code: AutoLoginErrorCode, message: string }

type NodeRequire = (id: string) => any

interface FirefoxProfile {
  dir: string
  mtime: number
}

const FIREFOX_PROFILE_FILES = [
  "cookies.sqlite",
  "cookies.sqlite-wal",
  "cookies.sqlite-shm",
  "prefs.js",
  "cert9.db",
  "key4.db",
  "permissions.sqlite",
]
const MAX_PROFILE_ATTEMPTS = 3
const CONNECT_TIMEOUT = 20000
const COMMAND_TIMEOUT = 45000

function getNodeRequire(): NodeRequire | null {
  const runtime = window as any
  const req = runtime.require ?? (globalThis as any).require
  return typeof req === "function" ? req : null
}

export function getAutoLoginSupport(): AutoLoginSupport {
  const req = getNodeRequire()
  if (!req) {
    return {
      supported: false,
      platform: "web",
      reason: "web",
    }
  }
  let platform = "unknown"
  try {
    platform = String(req("node:process").platform ?? "unknown")
  } catch {
    // Electron/browser runtime without Node process access.
  }
  if (platform === "linux") {
    return {
      supported: true,
      platform,
      reason: "ok",
    }
  }
  if (platform === "win32") {
    return {
      supported: false,
      platform,
      reason: "windows",
    }
  }
  return {
    supported: false,
    platform,
    reason: "other",
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function listFirefoxProfiles(fs: any, os: any, path: any): FirefoxProfile[] {
  const home = os.homedir()
  const roots = [
    path.join(home, ".mozilla", "firefox"),
    path.join(home, ".config", "mozilla", "firefox"),
    path.join(home, "snap", "firefox", "common", ".mozilla", "firefox"),
    path.join(home, ".var", "app", "org.mozilla.firefox", ".mozilla", "firefox"),
  ]
  const seen = new Set<string>()
  const profiles: FirefoxProfile[] = []

  for (const root of roots) {
    let entries: any[] = []
    try {
      entries = fs.readdirSync(root, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }
      const dir = path.join(root, entry.name)
      if (seen.has(dir)) {
        continue
      }
      const db = path.join(dir, "cookies.sqlite")
      if (!fs.existsSync(db)) {
        continue
      }
      seen.add(dir)
      // 只对可能包含 Icons8 令牌的配置文件启动浏览器，避免无意义启动。
      let hasToken = false
      for (const file of [db, `${db}-wal`]) {
        try {
          if (fs.existsSync(file) && fs.readFileSync(file).includes("i8token")) {
            hasToken = true
            break
          }
        } catch {
          // Ignore unreadable cookie stores.
        }
      }
      if (!hasToken) {
        continue
      }
      let mtime = 0
      try {
        mtime = fs.statSync(db).mtimeMs
      } catch {
        // Sort by mtime when available.
      }
      profiles.push({
        dir,
        mtime,
      })
    }
  }

  return profiles.sort((a, b) => b.mtime - a.mtime)
}

function findFirefoxBinary(fs: any, env: any): string | null {
  const candidates = [
    env.FIREFOX_BIN,
    "/usr/bin/firefox",
    "/usr/local/bin/firefox",
    "/snap/bin/firefox",
    "/usr/lib/firefox/firefox",
  ].filter(Boolean) as string[]
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate
      }
    } catch {
      // Continue with the next candidate.
    }
  }
  return null
}

function prepareProfile(fs: any, path: any, source: string, target: string, port: number): void {
  fs.mkdirSync(target, { recursive: true })
  for (const name of FIREFOX_PROFILE_FILES) {
    const from = path.join(source, name)
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, path.join(target, name))
    }
  }
  const userJs = [
    `user_pref("marionette.port", ${port});`,
    "user_pref(\"browser.shell.checkDefaultBrowser\", false);",
    "user_pref(\"browser.startup.page\", 0);",
    "user_pref(\"browser.startup.homepage\", \"about:blank\");",
    "user_pref(\"browser.sessionstore.resume_from_crash\", false);",
    "user_pref(\"datareporting.policy.dataSubmissionEnabled\", false);",
    "user_pref(\"toolkit.telemetry.enabled\", false);",
    "user_pref(\"app.update.enabled\", false);",
    "user_pref(\"browser.aboutwelcome.enabled\", false);",
  ].join("\n")
  fs.writeFileSync(path.join(target, "user.js"), userJs, "utf8")
}

function findFreePort(net: any): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port = typeof address === "object" && address ? address.port : 0
      server.close(() => {
        if (port > 0) {
          resolve(port)
        } else {
          reject(new Error("Unable to allocate a local port"))
        }
      })
    })
  })
}

class MarionetteClient {
  private socket: any = null
  private buffer: any = null
  private frames: any[] = []
  private waiters: Array<{ resolve: (value: any) => void, reject: (error: any) => void }> = []
  private nextId = 0
  private closed = false

  constructor(private net: any, private BufferCtor: any) {}

  async connect(port: number): Promise<void> {
    const deadline = Date.now() + CONNECT_TIMEOUT
    let lastError: any = null
    while (!this.closed && Date.now() < deadline) {
      try {
        const socket = await this.connectOnce(port)
        this.socket = socket
        this.buffer = this.BufferCtor.alloc(0)
        socket.setTimeout(COMMAND_TIMEOUT)
        socket.on("data", (chunk: any) => this.onData(chunk))
        socket.on("timeout", () => this.fail(new Error("Marionette command timed out")))
        socket.on("error", (error: any) => this.fail(error))
        socket.on("close", () => this.fail(new Error("Marionette connection closed")))
        return
      } catch (error) {
        lastError = error
        await delay(250)
      }
    }
    throw lastError ?? new Error("Unable to connect to the headless browser")
  }

  private connectOnce(port: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const socket = this.net.createConnection({
        host: "127.0.0.1",
        port,
      })
      socket.setNoDelay(true)
      socket.once("connect", () => {
        socket.removeAllListeners("error")
        resolve(socket)
      })
      socket.once("error", (error: any) => {
        socket.destroy()
        reject(error)
      })
    })
  }

  async readFrame(): Promise<any> {
    if (this.frames.length > 0) {
      return this.frames.shift()
    }
    return new Promise((resolve, reject) => {
      this.waiters.push({
        resolve,
        reject,
      })
    })
  }

  async command(name: string, params: any = {}): Promise<any> {
    if (!this.socket) {
      throw new Error("Marionette is not connected")
    }
    const id = ++this.nextId
    const payload = this.BufferCtor.from(JSON.stringify([0, id, name, params]), "utf8")
    const prefix = this.BufferCtor.from(`${payload.length}:`, "utf8")
    this.socket.write(this.BufferCtor.concat([prefix, payload]))

    while (true) {
      const frame = await this.readFrame()
      if (!Array.isArray(frame) || frame[1] !== id) {
        continue
      }
      if (frame[2]) {
        const error = frame[2]
        throw new Error(typeof error === "string" ? error : error?.message ?? "Marionette command failed")
      }
      return frame[3]
    }
  }

  close(): void {
    this.closed = true
    try {
      this.socket?.destroy()
    } catch {
      // Ignore close errors.
    }
    this.socket = null
  }

  private fail(error: any): void {
    const waiters = this.waiters.splice(0)
    for (const waiter of waiters) {
      waiter.reject(error)
    }
  }

  private onData(chunk: any): void {
    this.buffer = this.BufferCtor.concat([this.buffer, chunk])
    while (true) {
      const colon = this.buffer.indexOf(0x3A)
      if (colon < 0) {
        return
      }
      const length = Number(this.buffer.subarray(0, colon).toString("utf8"))
      const frameStart = colon + 1
      if (!Number.isFinite(length) || length <= 0 || this.buffer.length < frameStart + length) {
        return
      }
      const raw = this.buffer.subarray(frameStart, frameStart + length).toString("utf8")
      this.buffer = this.buffer.subarray(frameStart + length)
      let frame: any
      try {
        frame = JSON.parse(raw)
      } catch {
        continue
      }
      const waiter = this.waiters.shift()
      if (waiter) {
        waiter.resolve(frame)
      } else {
        this.frames.push(frame)
      }
    }
  }
}

function tokenIsFresh(BufferCtor: any, token: string): boolean {
  if (!token) {
    return false
  }
  const parts = token.split(".")
  if (parts.length !== 3) {
    // Opaque tokens are validated by the Icons8 API afterwards.
    return true
  }
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(BufferCtor.from(normalized, "base64").toString("utf8"))
    const expiry = Number(payload?.exp)
    if (!Number.isFinite(expiry) || expiry <= 0) {
      return true
    }
    return expiry * 1000 > Date.now() + 60_000
  } catch {
    return true
  }
}

async function readToken(client: MarionetteClient): Promise<string> {
  const result = await client.command("WebDriver:ExecuteScript", {
    script: "return document.cookie;",
    args: [],
  })
  const cookies = String(result?.value ?? "")
  for (const item of cookies.split(";")) {
    const value = item.trim()
    if (!value.startsWith("i8token=")) {
      continue
    }
    try {
      return decodeURIComponent(value.slice("i8token=".length))
    } catch {
      return value.slice("i8token=".length)
    }
  }
  return ""
}

function stopChild(child: any): Promise<void> {
  if (!child || child.exitCode !== null) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      try {
        child.kill("SIGKILL")
      } catch {
        // Ignore kill errors.
      }
      resolve()
    }, 3000)
    child.once("exit", () => {
      window.clearTimeout(timer)
      resolve()
    })
    try {
      child.kill("SIGTERM")
    } catch {
      window.clearTimeout(timer)
      resolve()
    }
  })
}

interface RuntimeModules {
  fs: any
  os: any
  path: any
  process: any
  childProcess: any
  net: any
  BufferCtor: any
}

function loadRuntime(req: NodeRequire): RuntimeModules | null {
  try {
    return {
      fs: req("node:fs"),
      os: req("node:os"),
      path: req("node:path"),
      process: req("node:process"),
      childProcess: req("node:child_process"),
      net: req("node:net"),
      BufferCtor: req("node:buffer").Buffer,
    }
  } catch {
    return null
  }
}

async function tryProfile(
  runtime: RuntimeModules,
  profile: FirefoxProfile,
  firefoxBinary: string,
  tempRoot: string,
  index: number,
): Promise<string> {
  const {
    fs,
    path,
    process,
    childProcess,
    net,
    BufferCtor,
  } = runtime
  const profileDir = path.join(tempRoot, `profile-${index}`)
  const port = await findFreePort(net)
  prepareProfile(fs, path, profile.dir, profileDir, port)

  const child = childProcess.spawn(
    firefoxBinary,
    [
      "--headless",
      "--no-remote",
      "--profile",
      profileDir,
      "--marionette",
    ],
    {
      env: {
        ...process.env,
        MOZ_HEADLESS: "1",
      },
      stdio: "ignore",
      windowsHide: true,
    },
  )
  let client: MarionetteClient | null = null

  try {
    const spawnError = new Promise<never>((_, reject) => {
      child.once("error", reject)
    })
    client = new MarionetteClient(net, BufferCtor)
    await Promise.race([
      client.connect(port),
      spawnError,
    ])
    await client.readFrame()
    await client.command("WebDriver:NewSession", {
      capabilities: {},
    })
    await client.command("WebDriver:Navigate", {
      url: "https://icons8.com/robots.txt",
    })

    let token = await readToken(client)
    if (!tokenIsFresh(BufferCtor, token)) {
      // Let the Icons8 app refresh an expired token with its SSO cookies.
      await client.command("WebDriver:Navigate", {
        url: "https://icons8.com/",
      })
      await delay(1800)
      token = await readToken(client)
    }

    try {
      await client.command("WebDriver:DeleteSession", {})
    } catch {
      // The browser may already be tearing down.
    }
    return tokenIsFresh(BufferCtor, token) ? token : ""
  } finally {
    client?.close()
    await stopChild(child)
    try {
      fs.rmSync(profileDir, {
        recursive: true,
        force: true,
      })
    } catch {
      // Temporary directory is best-effort cleanup.
    }
  }
}

export async function autoLoginFromFirefox(): Promise<AutoLoginResult> {
  const support = getAutoLoginSupport()
  if (!support.supported) {
    return {
      ok: false,
      code: "unsupported",
      message: `Auto login is not supported on ${support.platform}`,
    }
  }
  const req = getNodeRequire()
  if (!req) {
    return {
      ok: false,
      code: "unsupported",
      message: "Node runtime is unavailable",
    }
  }
  const runtime = loadRuntime(req)
  if (!runtime) {
    return {
      ok: false,
      code: "failed",
      message: "Required runtime modules are unavailable",
    }
  }
  const {
    fs,
    os,
    path,
  } = runtime
  const profiles = listFirefoxProfiles(fs, os, path)
  if (profiles.length === 0) {
    return {
      ok: false,
      code: "no-firefox",
      message: "No Firefox profile with an Icons8 session was found",
    }
  }
  const firefoxBinary = findFirefoxBinary(fs, runtime.process.env ?? {})
  if (!firefoxBinary) {
    return {
      ok: false,
      code: "no-firefox",
      message: "Firefox executable was not found",
    }
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "icons8-auto-login-"))
  try {
    fs.chmodSync(tempRoot, 0o700)
  } catch {
    // chmod is not supported on every filesystem.
  }

  let timedOut = false
  try {
    for (let index = 0; index < Math.min(profiles.length, MAX_PROFILE_ATTEMPTS); index++) {
      try {
        const token = await tryProfile(runtime, profiles[index], firefoxBinary, tempRoot, index)
        if (token) {
          return {
            ok: true,
            token,
          }
        }
      } catch (error) {
        if (error instanceof Error && /timed out|timeout/i.test(error.message)) {
          timedOut = true
        }
      }
    }
    return {
      ok: false,
      code: timedOut ? "timeout" : "no-session",
      message: "No valid Icons8 session was found in Firefox",
    }
  } finally {
    try {
      fs.rmSync(tempRoot, {
        recursive: true,
        force: true,
      })
    } catch {
      // Temporary directory is best-effort cleanup.
    }
  }
}
