<template>
  <div class="compare-view">
    <CompareToolbar
      :stats="stats"
      :current-index="currentDiffIndex"
      @format="handleFormat"
      @sort="handleSort"
      @swap="handleSwap"
      @next="handleNext"
      @prev="handlePrev"
      @compare-immediate="handleCompareImmediate"
      @close="$emit('close')"
    />

    <div class="compare-editors">
      <CompareEditor
        v-model="leftJson"
        :display-content="alignedLeft"
        side="left"
        title="左侧 (原始)"
        :diffs="diffs"
        :line-types="lineTypes"
        :current-diff-index="currentDiffIndex"
        :scroll-top="scrollState.left.scrollTop"
        :scroll-left="scrollState.left.scrollLeft"
        @scroll="handleScroll"
        @user-edit-complete="handleUserEditComplete"
      />

      <div class="compare-divider"></div>

      <CompareEditor
        v-model="rightJson"
        :display-content="alignedRight"
        side="right"
        title="右侧 (对比)"
        :diffs="diffs"
        :line-types="lineTypes"
        :current-diff-index="currentDiffIndex"
        :scroll-top="scrollState.right.scrollTop"
        :scroll-left="scrollState.right.scrollLeft"
        @scroll="handleScroll"
        @user-edit-complete="handleUserEditComplete"
      />
    </div>

    <CompareStatusBar
      :stats="stats"
      :current-diff="currentDiff"
    />

    <!-- 错误提示 -->
    <div v-if="compareError" class="error-toast">
      {{ compareError }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from 'vue'
import CompareToolbar from './CompareToolbar.vue'
import CompareEditor from './CompareEditor.vue'
import CompareStatusBar from './CompareStatusBar.vue'
import { useJsonComparison } from '../composables/useJsonComparison'

const props = defineProps({
  initialLeft: {
    type: String,
    default: ''
  },
  initialRight: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

// 使用比较 composable
const {
  leftJson,
  rightJson,
  alignedLeft,
  alignedRight,
  lineTypes,
  diffs,
  currentDiff,
  currentDiffIndex,
  stats,
  compareError,
  compare,
  compareImmediate,
  formatBoth,
  sortBoth,
  nextDiff,
  prevDiff,
  swap,
  setInitialData
} = useJsonComparison()

// 滚动同步状态
const scrollState = reactive({
  left: { scrollTop: 0, scrollLeft: 0 },
  right: { scrollTop: 0, scrollLeft: 0 }
})

// 滚动锁：防止左右编辑器滚动事件互相触发导致无限循环
let scrollSource = null

// 处理滚动同步
const handleScroll = (e) => {
  const { side, scrollTop, scrollLeft } = e

  // 如果这次滚动是由另一侧同步触发的，忽略它
  if (scrollSource && scrollSource !== side) {
    return
  }

  scrollSource = side
  const otherSide = side === 'left' ? 'right' : 'left'

  // 同步到另一侧
  scrollState[otherSide].scrollTop = scrollTop
  scrollState[otherSide].scrollLeft = scrollLeft

  // 在下一帧释放锁
  requestAnimationFrame(() => {
    scrollSource = null
  })
}

// 初始化数据
onMounted(() => {
  if (props.initialLeft || props.initialRight) {
    setInitialData(props.initialLeft, props.initialRight)
  } else {
    setInitialData('', '')
  }
})

// 事件处理
const handleFormat = () => {
  formatBoth()
}

const handleSort = () => {
  sortBoth()
}

const handleSwap = () => {
  swap()
}

const handleNext = () => {
  nextDiff()
}

const handlePrev = () => {
  prevDiff()
}

// 立即比较（手动修复后使用）
const handleCompareImmediate = () => {
  // 直接使用 composable 中的方法
  if (compareImmediate) {
    compareImmediate()
  }
}

// 用户编辑完成后触发重新比较
const handleUserEditComplete = () => {
  // 延迟一点以确保所有状态都已更新
  setTimeout(() => {
    compareImmediate()
  }, 50)
}

// 暴露方法给父组件
defineExpose({
  setInitialData,
  compareImmediate
})
</script>

<style scoped>
.compare-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
}

.compare-editors {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.compare-editors .compare-editor {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}

.compare-divider {
  width: 2px;
  background: var(--border);
  flex: 0 0 2px;
}

/* 错误提示 */
.error-toast {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: var(--error);
  color: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  font-size: 13px;
  z-index: 1000;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
