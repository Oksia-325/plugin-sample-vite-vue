# Pigo 图床

[English](./README.md)

个人使用的思源笔记 S3 兼容图床插件。

> 当前状态：Phase 0 基线。插件外壳、构建流程和项目元信息已就绪；上传 / 统计 / 同步 / 设置功能正在 `pigo` 分支开发中。

## 开发

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

运行 `pnpm dev` 前，请在 `.env` 中把 `VITE_SIYUAN_WORKSPACE_PATH` 设置为你的思源工作空间路径。

## 文档

- [开发步骤.md](./开发步骤.md) — 分阶段开发步骤与自测清单
- [Process.md](./Process.md) — 各阶段开发记录
