// Platform detection and unified export

const isTauri = () => !!(window.__TAURI__ || window.__TAURI_INTERNALS__)

let platformModule = null

async function getPlatform() {
  if (platformModule) return platformModule
  if (isTauri()) {
    platformModule = await import('./tauri.js')
  } else {
    platformModule = await import('./browser.js')
  }
  return platformModule
}

export async function showSaveDialog(options) {
  const platform = await getPlatform()
  return platform.showSaveDialog(options)
}

export async function showOpenDialog(options) {
  const platform = await getPlatform()
  return platform.showOpenDialog(options)
}

export async function copyToClipboard(text) {
  const platform = await getPlatform()
  return platform.copyToClipboard(text)
}

export function dbPut(key, data) {
  // DB ops are synchronous and identical across platforms (both use localStorage)
  localStorage.setItem(key, JSON.stringify(data))
  return { ok: true }
}

export function dbGet(key) {
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : null
}

export function dbGetAll(prefix = '') {
  const results = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      const data = localStorage.getItem(key)
      results.push({ _id: key, ...JSON.parse(data) })
    }
  }
  return results
}

export function dbRemove(key) {
  localStorage.removeItem(key)
  return { ok: true }
}

export { isTauri }
