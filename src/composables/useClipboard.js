// Clipboard operations composable
import { copyToClipboard as platformCopy } from '../platform/index.js'

export function useClipboard() {
  const copyToClipboard = (text) => {
    return platformCopy(text)
  }

  return { copyToClipboard }
}
