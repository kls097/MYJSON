// Comment remover using JSON5
import JSON5 from 'json5'

export function removeComments(jsonStr) {
  try {
    // JSON5 can parse JSON with comments
    const parsed = JSON5.parse(jsonStr)

    // Convert to standard JSON (no comments)
    return JSON.stringify(parsed, null, 2)
  } catch (error) {
    throw new Error(`Failed to parse: ${error.message}`)
  }
}
