// Browser fallback implementation (for development mode)

export async function showSaveDialog(options = {}) {
  const { defaultPath = 'file.json', binaryContent } = options
  const content = binaryContent || options.content || ''

  const blob = new Blob([content], {
    type: binaryContent ? 'application/octet-stream' : 'application/json;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultPath
  a.click()
  URL.revokeObjectURL(url)
  return true
}

export async function showOpenDialog(options = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = options.filters?.[0]?.extensions?.map(e => `.${e}`).join(',') || '*'

    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) {
        resolve(null)
        return
      }

      const content = options.binary
        ? await file.arrayBuffer()
        : await file.text()

      resolve({ content, path: file.name })
    }

    input.click()
  })
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Copy failed:', err)
    return false
  }
}

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
