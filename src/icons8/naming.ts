import { EMOJI_DIR } from "./types"

const UNSAFE_CHARS = '<>:"/\\|?*'

export function sanitizeName(name: string): string {
  let result = String(name ?? "")
  for (const char of UNSAFE_CHARS) {
    result = result.split(char).join("_")
  }
  result = result.trim().replace(/^\.+/, "").replace(/\.+$/, "")
  return result || "unnamed"
}

export function emojiDirPath(collectionName: string): string {
  return `${EMOJI_DIR}/${sanitizeName(collectionName).toLowerCase()}`
}

export function emojiFilePath(collectionName: string, filename: string): string {
  return `${emojiDirPath(collectionName)}/${filename}`
}
