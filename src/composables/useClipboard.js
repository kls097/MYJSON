// Clipboard operations composable

export function useClipboard() {
  const copyToClipboard = (text) => {
    if (window.utools && window.utools.copyText) {
      window.utools.copyText(text)
      return true
    }

    // Fallback for development
    return navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Copied to clipboard!')
        return true
      })
      .catch(err => {
        console.error('Copy failed:', err)
        return false
      })
  }

  return { copyToClipboard }
}
