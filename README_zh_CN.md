# Icon8Sync

将 [Icons8](https://icons8.com/) 个人收藏夹中的图标增量同步到思源笔记表情库（`data/emojis/`）。

## 功能

- 一键增量同步：以图标 ID 为唯一标识，只下载新增图标
- 收藏夹映射为表情分组目录（小写），同步后即可在思源表情面板中使用
- 授权 Token 通过设置窗口填写，无需手动编辑配置文件
- 保存前先实测验证 Token（识别 401 失效）
- 并发下载限流、文件名净化与 `(1)` 式重名去重
- 同步完成后自动刷新表情列表（失败则提示重启）

## 使用

1. 启用插件后，点击顶栏图片图标（或 `设置 → 市场 → Icon8Sync → 设置`）打开窗口。
2. 在「设置」页粘贴 Icons8 的 `Authorization`：
   - 登录 icons8.com → F12 打开开发者工具 → Network 面板 → 任选一个请求 → 复制请求头 `Authorization` 的值（可去掉 `Bearer ` 前缀）。
3. 点击「验证并保存」。
4. 切到「同步」页，点击「开始同步」。

"Favorites" 和 "Downloaded" 收藏夹会被忽略；云端已删除的图标本地保留。

## 开发

```bash
pnpm i
cp .env.example .env   # 设置 VITE_SIYUAN_WORKSPACE_PATH
pnpm dev               # 监听构建到 <workspace>/data/plugins/icon8-sync
pnpm build             # 产出 dist/ + package.zip
```
