// Tauri v2 platform implementation
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeFile, writeTextFile, readFile, readTextFile } from '@tauri-apps/plugin-fs'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

export async function showSaveDialog(options = {}) {
  const { defaultPath, filters, binaryContent, content } = options

  // Build Tauri-compatible filters
  const tauriFilters = filters || [{
    name: 'JSON Files',
    extensions: ['json']
  }]

  const filePath = await save({
    title: options.title || '保存文件',
    defaultPath,
    filters: tauriFilters
  })

  if (!filePath) return false

  if (binaryContent) {
    // Binary content (e.g. Excel)
    const data = binaryContent instanceof ArrayBuffer
      ? new Uint8Array(binaryContent)
      : new Uint8Array(binaryContent.buffer || binaryContent)
    await writeFile(filePath, data)
  } else {
    await writeTextFile(filePath, content || '')
  }

  return true
}

export async function showOpenDialog(options = {}) {
  const { filters, binary } = options

  const tauriFilters = filters || [{
    name: 'JSON Files',
    extensions: ['json']
  }]

  const filePath = await open({
    title: options.title || '打开文件',
    filters: tauriFilters,
    multiple: false
  })

  if (!filePath) return null

  if (binary) {
    const data = await readFile(filePath)
    return { content: data.buffer, path: filePath }
  }

  const content = await readTextFile(filePath)
  return { content, path: filePath }
}

export async function copyToClipboard(text) {
  await writeText(text)
  return true
}

// Use localStorage for storage (data volume is small enough)
export function dbPut(key, data) {
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
