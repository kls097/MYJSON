<!-- Generated: 2026-04-25 | Updated: 2026-04-25 -->

# MYJSON — uTools JSON Plugin

## Purpose
uTools desktop platform JSON processing plugin. Format, compress, validate, query, compare, merge, convert JSON with a Monaco Editor-powered UI. Built with Vue 3 + Vite, runs inside the uTools desktop framework (NOT a standalone web app).

## Key Files
| File | Description |
|------|-------------|
| `plugin.json` | uTools manifest — 7 features with codes that drive app mode routing |
| `preload.js` | Node.js context script — exposes `readFile`/`writeFile` via `window.preloadUtils` (must stay unminified) |
| `package.json` | Dependencies and build scripts (v4.0.0) |
| `vite.config.js` | Vite build config — manual chunks for vendor, monaco, json-tools, excel, quicktype, jsoncrack |
| `index.html` | uTools entry point |
| `logo.png` | Plugin icon |
| `功能介绍.txt` | Feature description (Chinese) |
| `功能概述.txt` | Feature overview (Chinese) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | Application source code — Vue components, composables, utils, styles (see `src/AGENTS.md`) |
| `scripts/` | Build and packaging scripts (see `scripts/AGENTS.md`) |
| `test/` | Ad-hoc Node.js test scripts (see `test/AGENTS.md`) |
| `docs/` | Chinese-language feature specs and bug reports (see `docs/AGENTS.md`) |
| `public/` | Static assets — fonts, SVGs (see `public/AGENTS.md`) |

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
| Table view | `src/composables/useJsonTableView.js`, `src/utils/jsonTableDetector.js` | Smart array detection + editable grid |

## For AI Agents

### Working In This Directory
- Always install dependencies after modifying `package.json`
- Build: `npm run build` | Dev: `npm run dev` (port 5173) | Pack: `npm run pack`
- `preload.js` must remain unminified (uTools requirement)
- No TypeScript — JS-only project
- No Vuex/Pinia — state via composables + provide/inject + props
- Vite base must always be `./` for uTools local file loading

### Testing Requirements
- Run tests: `npm test` (uses `node --test`)
- Utils can be tested standalone (no Vue dependency)
- Some tests use Playwright for browser testing

### Common Patterns
- History pattern: `pushHistory()` before AND after mutations in App.vue
- Dual environment: every uTools API call needs browser fallback
- Event-driven entry: `utools.onPluginEnter({code, type, payload})` drives app state
- Mode switching: single App.vue conditionally renders different UIs per feature code

## CONVENTIONS

- **No Vuex/Pinia**: State = composables (reactive refs) + provide/inject for deep trees + props for children
- **Pure utils**: `src/utils/` = stateless pure functions. No Vue imports. Testable standalone.
- **Composables**: Import from utils, wrap in reactive state, return refs + methods
- **Component naming**: PascalCase files in `components/`, camelCase JS files in `utils/` and `composables/`
- **Dual environment**: Every uTools API call needs browser fallback (`if (window.utools && ...)`)

## ANTI-PATTERNS

- **Never** import Vue reactive APIs in `src/utils/` — they are pure functions
- **Never** use `window.utools` APIs without environment check — breaks dev server
- **Never** minify preload.js — uTools requires it readable
- **Never** use `base: '/'` in vite.config — must be `./` for uTools
- **Never** add routing (vue-router) — mode switching via plugin.json codes only
- **Never** batch `pushHistory` — call before AND after each mutation separately
- **Never** skip `validate()` after content changes — UI state depends on it

## Dependencies

### External
- Vue 3.5 — UI framework
- Monaco Editor 0.55 — code editor (`@guolao/vue-monaco-editor` wrapper)
- jsonrepair — JSON repair
- json5 — JSON5 parser
- jsonpath-plus — JSONPath queries
- jmespath — JMESPath queries
- ajv + ajv-formats — JSON Schema validation
- quicktype-core — JSON-to-code conversion
- xlsx — Excel import/export
- jsoncrack-react + React 19 — graph visualization
- json-schema-faker — mock data generation

## UNIQUE STYLES

- **6-tier JSON repair**: Standard parse → jsonrepair → JSON5 → preprocessing combos — tried sequentially
- **Multi-mode rendering**: Single App.vue conditionally renders completely different UIs based on plugin.json feature code
- **React in Vue**: jsoncrack-react visualization loaded in isolated chunk with AMD conflict suppression
- **Excel bidirectional**: JSON ↔ Excel via xlsx library with schema inference
- **Smart table detection**: Automatically finds arrays suitable for spreadsheet view, supports nested object flattening

## COMMANDS
```bash
npm run dev    # Vite dev server :5173, load in uTools dev tools
npm run build  # Vite build + copy plugin files to dist/
npm run pack   # Build + zip dist/ → myjson-plugin.upx
npm test       # Run Node.js test suite
```

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
