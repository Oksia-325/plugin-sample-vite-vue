# AGENTS.md

SiYuan (思源笔记) plugin `siyuan-trans`: translates docs via DashScope qwen-mt, writing results back into the notebook. Forked from the `siyuan/plugin-sample-vite-vue` template. Vue 3 + TypeScript + Vite, bundled as a single CJS `index.js`.

## Commands

- `pnpm dev` — `vite build --watch`. Builds into the SiYuan workspace at `data/plugins/siyuan-trans` (the dir name comes from `plugin.json` `name`, **not** `package.json` name). Requires `.env` with `VITE_SIYUAN_WORKSPACE_PATH` (already present, gitignored). Watch mode has LiveReload, minify off. This is the dev loop — reload the SiYuan UI to test.
- `pnpm build` — writes `dist/` then zips `package.zip`. This is the **only** verification step: there are no tests, no lint script, no typecheck script.
- `pnpm release:*` — `release.js` bumps `version` in both `plugin.json` and `package.json`, then runs `git add/commit/push` + tags `v<version>`. **This directory is not a git repo**, so release scripts will fail until `git init` + remote are set up.
- ESLint is currently **broken**: `eslint.config.mjs` imports `./src/utils/eslint/i18n-validate-keys.mjs` which does not exist, so any `eslint` invocation crashes immediately. Don't rely on it; verify with `pnpm build`.

## Architecture

- Entry: `src/index.ts` — plugin class. Registers the topbar icon menu, a command (hotkey `⌥⇧⌘T`), and context-menu entries via `eventBus` events (`switch-protyle` tracks the active doc, `open-menu-content`, `open-menu-doctree`).
- Core logic lives in `src/trans/` and is a **port of a Python project (`siyuan_trans`)**: code comments map 1:1 to the Python module/function names (`_classify_block`, `_collect_translatable`, ...). Preserve that mapping when editing.
  - `engine.ts` — `TranslationEngine` orchestration: collect blocks → classify → protect `$...$` formulas → concurrent translate → write back. Three write modes (`write_mode`): `append` (bilingual append), `replace` (translation only), `new_doc` (creates `"<title> (译文)"` doc in the same notebook via `createDocWithMd`). List blocks are handled differently per mode: append/replace recursively descend into list items; `new_doc` translates the whole list block as one unit.
  - `detector.ts` — pure functions: CJK detection, "already translated" heuristic (tail 30% of text has ≥60% CJK), image/html/formula detection, heading prefix / list prefix stripping.
  - `translator.ts` — calls DashScope through SiYuan's kernel `forwardProxy` API (`src/api.ts`) to avoid browser CORS. Request body carries `translation_options` (source/target lang, terms, tm_list, domains).
  - `siyuan.ts` — thin wrapper over `src/api.ts`.
  - `config.ts` — config persisted via `plugin.loadData/saveData("config.json")` (defaults in `DEFAULT_CONFIG`; always merged, don't break missing-field merging).
  - `types.ts` — `Block` here is a custom rich type: `getChildBlocks` really returns `content`/`markdown` (and camelCase `subType`), unlike the sample's incomplete `IResGetChildBlock`.
- UI: `src/main.ts` mounts Vue components into fresh SiYuan `Dialog`s (`openMountedDialog`, retries per-frame until the mount div appears). Dialogs: `TranslateDialog.vue` (3-phase: input/running/done), `SettingPanel.vue`. All `trans-*` styling lives in the global `src/index.scss` (bundled into the plugin CSS, shared across dialogs).
- `src/api.ts` — hand-rolled thin wrappers over SiYuan kernel HTTP endpoints via `fetchSyncPost`. Global types (`BlockId`, `DocumentId`, `IRes*`, `SyFrontendTypes`) are declared as ambient types in `src/types/*.d.ts`.
- The `@/` import alias maps to `src/`.

## Conventions & gotchas

- Code comments and docstrings are in Chinese; keep new comments in the same style.
- UI strings in the Vue components are **hardcoded Chinese**; `src/i18n/*.json` only feeds topbar/command labels via `this.i18n`. The json files are copied to `dist/i18n/` by `viteStaticCopy` (along with `README*.md`, `icon.png`, `preview.png`, `plugin.json`).
- `package.json` `name` is still the template remnant (`plugin-sample-vite-vue`) — don't be confused; the real plugin name/version live in `plugin.json`.
- Document IDs look like `20260529110932-dubkz1x`; `extractDocId` in `TranslateDialog.vue` also accepts `siyuan://blocks/<id>` links.
- `siyuan` is an external dependency (never bundled); its types plus `src/types/*.d.ts` provide the plugin API.
- `plugin.json` `readme` points to `README_trans.md` (marketplace readme), not `README*.md`.
