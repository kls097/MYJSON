# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-11
**Commit:** dacde25
**Branch:** feature/monaco-editor

## OVERVIEW
uTools JSON plugin — format, compress, validate, query, compare, merge, convert JSON. Vue 3 + Vite, runs inside uTools desktop framework (NOT a web app).

## STRUCTURE
```
./
├── plugin.json          # uTools manifest: 8 features with codes → app modes
├── preload.js           # Node.js context: exposes readFile/writeFile via window.preloadUtils
├── src/
│   ├── App.vue          # Orchestrator: mode-switching via utools.onPluginEnter({code})
│   ├── main.js          # Standard Vue 3 mount
│   ├── components/      # 25 Vue SFCs — all UI components
│   ├── composables/     # 11 Composition API modules — all business logic
│   ├── utils/           # 14 pure JS functions — zero Vue dependency
│   └── styles/          # CSS files (theme-light, fonts, main)
├── scripts/             # Build: copy-files.js, pack.js
├── test/                # Ad-hoc Node test scripts (.mjs, .js)
└── docs/                # Chinese feature/bug reports (markdown)
```

## WHERE TO LOOK

| Task | Location | Key Files |
|------|----------|-----------|
| Add JSON operation | `src/utils/` → `src/composables/useJsonOperations.js` → `src/App.vue` | New util → integrate into composable → wire handler in App.vue → button in ToolbarActions.vue |
| Add new plugin mode | `plugin.json` (feature) → `src/App.vue` (onPluginEnter routing) | Add feature entry, add mode ref + conditional render |
| Fix JSON parsing | `src/utils/jsonFixer.js` | 6-tier progressive repair chain |
| Add view component | `src/components/` | Follow PascalCase naming, emit events upward |
| File I/O changes | `preload.js` + dual-mode checks in App.vue | Always check `window.utools` before using |
| Build/packaging | `vite.config.js`, `scripts/` | Chunks: vendor, json-tools, excel, quicktype, jsoncrack |
| Query execution | `src/composables/useJsonPath.js` | JSONPath (jsonpath-plus) + JMESPath |
| Schema validation | `src/composables/useSchemaValidator.js`, `src/utils/schemaValidator.js` | JSON Schema draft-07 |
| JSON merge | `src/composables/useJsonMerge.js`, `src/utils/jsonMerger.js` | Multiple merge strategies |

## CONVENTIONS

- **No Vuex/Pinia**: State = composables (reactive refs) + provide/inject for deep trees + props for children
- **Dual environment**: Every uTools API call needs browser fallback (`if (window.utools && ...)`)
- **History pattern**: `pushHistory()` before AND after mutations in App.vue; `isUndoRedo` flag prevents recording during undo/redo
- **Pure utils**: `src/utils/` = stateless pure functions. No Vue imports. Testable standalone.
- **Composables**: Import from utils, wrap in reactive state, return refs + methods
- **preload.js**: Must remain unminified (uTools requirement). Never compress.
- **No TypeScript**: JS-only project. No .eslintrc, no .prettierrc.
- **Vite base**: Always `./` — required for uTools local file loading
- **Component naming**: PascalCase files in components/, camelCase JS files in utils/ and composables/

## ANTI-PATTERNS (THIS PROJECT)

- **Never** import Vue reactive APIs in `src/utils/` — they are pure functions
- **Never** use `window.utools` APIs without environment check — breaks dev server
- **Never** minify preload.js — uTools requires it readable
- **Never** use `base: '/'` in vite.config — must be `./` for uTools
- **Never** add routing (vue-router) — mode switching via plugin.json codes only
- **Never** batch `pushHistory` — call before AND after each mutation separately
- **Never** skip `validate()` after content changes — UI state depends on it

## UNIQUE STYLES

- **6-tier JSON repair**: Standard parse → jsonrepair → JSON5 → preprocessing combos — each level tried sequentially
- **Multi-mode rendering**: Single App.vue conditionally renders completely different UIs based on plugin.json feature code
- **Event-driven entry**: `utools.onPluginEnter({code, type, payload})` drives entire app state
- **Cross-editor support**: Monaco (new) + CodeMirror 6 (legacy) — MonacoEditor.vue and JsonEditor.vue coexist
- **React in Vue**: jsoncrack-react visualization loaded in isolated chunk
- **Excel bidirectional**: JSON ↔ Excel via xlsx library with schema inference

## COMMANDS
```bash
npm run dev    # Vite dev server :5173, load in uTools dev tools
npm run build  # Vite build + copy plugin files to dist/
npm run pack   # Zip dist/ → myjson-plugin.upx
```

## NOTES
- 2 TODOs in App.vue: payload passing to merge/three-way-merge panels (lines ~439, ~448)
- `test/` uses ad-hoc Node scripts, no test framework — files are .mjs/.js with manual assertions
- `docs/` is Chinese-language internal documentation (feature specs, bug reports)
- Branch `feature/monaco-editor` suggests Monaco migration in progress alongside CodeMirror
