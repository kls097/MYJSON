import { ref, computed } from 'vue'

/**
 * 编辑器历史记录管理（撤销/重做）
 * @param {number} maxHistory - 最大历史记录数量
 */
export function useHistory(maxHistory = 50) {
  // 历史记录栈
  const historyStack = ref([])
  // 当前在历史记录中的位置
  const currentIndex = ref(-1)
  // 是否正在执行撤销/重做操作（避免重复记录）
  const isUndoRedo = ref(false)

  // 是否可以撤销
  const canUndo = computed(() => currentIndex.value > 0)

  // 是否可以重做
  const canRedo = computed(() => currentIndex.value < historyStack.value.length - 1)

  /**
   * 记录一条历史
   * @param {string} content - 编辑器内容
   */
  const pushHistory = (content) => {
    // 如果正在执行撤销/重做，不记录
    if (isUndoRedo.value) return

    // 如果内容和当前历史相同，不记录
    if (historyStack.value[currentIndex.value] === content) return

    // 如果当前不在历史末尾，清除后面的历史
    if (currentIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, currentIndex.value + 1)
    }

    // 添加新历史
    historyStack.value.push(content)

    // 限制历史记录数量
    if (historyStack.value.length > maxHistory) {
      historyStack.value.shift()
    } else {
      currentIndex.value++
    }
  }

  /**
   * 撤销操作
   * @returns {string|null} - 上一条历史内容
   */
  const undo = () => {
    if (!canUndo.value) return null

    isUndoRedo.value = true
    currentIndex.value--
    const content = historyStack.value[currentIndex.value]
    isUndoRedo.value = false

    return content
  }

  /**
   * 重做操作
   * @returns {string|null} - 下一条历史内容
   */
  const redo = () => {
    if (!canRedo.value) return null

    isUndoRedo.value = true
    currentIndex.value++
    const content = historyStack.value[currentIndex.value]
    isUndoRedo.value = false

    return content
  }

  /**
   * 清空历史
   */
  const clearHistory = () => {
    historyStack.value = []
    currentIndex.value = -1
  }

  /**
   * 初始化历史（设置初始内容）
   * @param {string} content - 初始内容
   */
  const initHistory = (content) => {
    historyStack.value = [content]
    currentIndex.value = 0
  }

  return {
    canUndo,
    canRedo,
    pushHistory,
    undo,
    redo,
    clearHistory,
    initHistory,
    isUndoRedo
  }
}
