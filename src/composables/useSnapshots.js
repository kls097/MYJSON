import { ref } from 'vue'

const MAX_SNAPSHOTS = 5

export function useSnapshots() {
  const snapshots = ref([])

  const saveSnapshot = (content, label = '') => {
    snapshots.value.unshift({
      content,
      label: label || new Date().toLocaleTimeString(),
      timestamp: Date.now()
    })
    if (snapshots.value.length > MAX_SNAPSHOTS) {
      snapshots.value.pop()
    }
  }

  const hasSnapshots = () => snapshots.value.length > 0
  const getLastSnapshot = () => snapshots.value[0] || null

  const clearSnapshots = () => {
    snapshots.value = []
  }

  return {
    saveSnapshot,
    hasSnapshots,
    getLastSnapshot
  }
}
