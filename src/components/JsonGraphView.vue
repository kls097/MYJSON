<template>
  <div class="json-graph-view">
    <div v-if="!json" class="empty-graph">
      <p>No valid JSON to display</p>
    </div>
    <div v-else ref="containerRef" class="graph-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  json: {
    type: [String, Object, Array, null],
    default: null
  }
})

const emit = defineEmits(['node-click', 'extract-path'])

const containerRef = ref(null)
let root = null
let JSONCrackComponent = null
let ReactLib = null
let createRootFn = null

/**
 * Temporarily neutralize Monaco's AMD `define` on window to prevent it from
 * intercepting UMD `define()` calls from reaflow and human-format inside
 * jsoncrack-react's dependency tree.
 *
 * Monaco's loader throws "Can only have one anonymous define call per script file"
 * when it sees these anonymous defines. We replace `window.define` with a shim
 * that:
 *   - Has NO `.amd` property — this forces UMD modules to use their CJS path
 *     (module.exports = factory()), which Vite handles correctly.
 *   - Forwards named defines to Monaco's original loader (Monaco's own modules).
 */
function suppressAmdDefine() {
  const original = window.define
  const self = function (name, deps, factory) {
    // Named define (first arg is string) — forward to Monaco
    if (typeof name === 'string') {
      return original.apply(this, arguments)
    }
    // Anonymous define — should never reach here because we removed .amd,
    // but swallow as safety net.
  }
  // CRITICAL: Do NOT set self.amd. Without .amd, UMD modules will
  // skip the `define` branch and use `module.exports` instead.
  window.define = self
  return original
}

function restoreAmdDefine(original) {
  window.define = original
}

const loadAndRender = async () => {
  if (!containerRef.value || !props.json) return

  try {
    // Lazy load ALL React dependencies dynamically — no static imports
    // to avoid triggering AMD conflict at module parse time.
    if (!JSONCrackComponent) {
      const originalDefine = suppressAmdDefine()
      try {
        const [reactModule, reactDomModule, crackModule] = await Promise.all([
          import('react'),
          import('react-dom/client'),
          import('jsoncrack-react')
        ])
        ReactLib = reactModule
        createRootFn = reactDomModule.createRoot
        JSONCrackComponent = crackModule.JSONCrack
      } finally {
        restoreAmdDefine(originalDefine)
      }
      // Import CSS outside AMD guard (no JS define calls in CSS)
      await import('jsoncrack-react/style.css')
    }

    if (!root) {
      root = createRootFn(containerRef.value)
    }

    root.render(
      ReactLib.createElement(JSONCrackComponent, {
        json: typeof props.json === 'string' ? props.json : JSON.stringify(props.json, null, 2),
        theme: 'dark',
        layoutDirection: 'RIGHT',
        showControls: true,
        showGrid: true,
        centerOnLayout: true,
        maxRenderableNodes: 1500,
        onNodeClick: (node) => {
          emit('node-click', node)
          if (node.path && node.path.length > 0) {
            const pathStr = '$' + node.path.map(p => {
              if (typeof p === 'number') return `[${p}]`
              if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(p)) return `.${p}`
              return `['${p}']`
            }).join('')
            emit('extract-path', pathStr)
          }
        }
      })
    )
  } catch (error) {
    console.error('Failed to render JSON Crack:', error)
  }
}

onMounted(() => {
  loadAndRender()
})

onUnmounted(() => {
  if (root) {
    root.unmount()
    root = null
  }
  JSONCrackComponent = null
})

watch(() => props.json, () => {
  nextTick(() => {
    loadAndRender()
  })
})
</script>

<style scoped>
.json-graph-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #1a1a2e;
  height: 100%;
}

.graph-container {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.empty-graph {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

/* Override jsoncrack styles to fit our layout */
.graph-container :deep(.jsoncrack-space) {
  width: 100% !important;
  height: 100% !important;
}

.graph-container :deep(svg) {
  width: 100% !important;
  height: 100% !important;
}
</style>
