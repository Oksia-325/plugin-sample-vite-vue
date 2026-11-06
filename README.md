# Pigo Picbed

[简体中文](./README.zh-CN.md)

Personal S3-compatible picture bed plugin for [SiYuan](https://b3log.org/siyuan).

> Status: Phase 0 baseline. The plugin shell, build pipeline and project metadata are ready. Upload / statistics / sync / settings features are being developed on the `pigo` branch.

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

Set `VITE_SIYUAN_WORKSPACE_PATH` in `.env` to your SiYuan workspace before running `pnpm dev`.

## Documents

- [开发步骤.md](./开发步骤.md) — phased development plan and self-test checklist
- [Process.md](./Process.md) — stage-by-stage development log
