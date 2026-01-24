// JSON compressor utility

export function compressJson(jsonStr, escape = false) {
  try {
    const parsed = JSON.parse(jsonStr)
    const compressed = JSON.stringify(parsed) // No spacing

    if (escape) {
      // Escape for embedding in strings (JavaScript, etc.)
      return compressed
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
    }

    return compressed
  } catch (error) {
    throw new Error(`Compression error: ${error.message}`)
  }
}
