# Icon Crawler

一个用于自动同步 [Icons8](https://icons8.com/) 个人收藏图标的 Python 工具。

## 项目简介

Icon Crawler 是一个自动化工具，用于批量下载和同步 Icons8 平台上的个人收藏图标。该工具会自动检测本地与远程收藏夹的差异，仅下载新增的图标，并按照收藏夹结构组织本地文件目录。

### 主要特性

- **自动同步** Icons8 个人收藏夹中的所有图标
- **增量下载**：仅下载新增图标，避免重复下载
- **目录结构映射**：按收藏夹层级自动创建本地目录
- **支持批量处理**：多个子收藏夹并发下载文件
- **双模式运行**：命令行模式 + 图形界面模式
- **Material Design 3**：美观简约的 UI 设计风格

### 目录结构示例

```
src/                     # 源代码
├── main.py              # CLI 入口
├── main_ui.py           # GUI 入口
├── ui/                  # UI 模块
│   ├── app.py          # Flet 应用主类
│   ├── theme.py        # Material Design 3 主题
│   ├── animations.py   # 动画定义
│   ├── components/     # UI 组件
│   │   ├── buttons.py
│   │   ├── cards.py
│   │   ├── progress.py
│   │   └── inputs.py
│   └── pages/          # 页面
│       ├── check_page.py     # 页面1: 启动检查
│       ├── sync_page.py      # 页面2: 同步运行
│       └── complete_page.py  # 页面3: 完成总结
├── config.py           # 配置管理
├── api_client.py       # API 客户端
├── sync_manager.py     # 同步逻辑
├── file_manager.py     # 文件管理
└── manifest_manager.py # 清单管理

icons/                   # 本地图标保存位置
├── .manifest.json      # 图标清单文件
├── Item/               # 子收藏夹
│   ├── Gift.png
│   └── Anchor.png
├── Hardware/
│   └── CPU.png
└── ...

pyproject.toml          # 项目配置
README.md               # 项目文档
UI设计文档.md           # UI设计规范
启动UI.bat              # Windows 一键启动脚本
启动UI(无窗口).vbs      # Windows 无窗口启动脚本
```

## 环境要求

- **Python**: >= 3.12.12
- **包管理器**: [UV](https://github.com/astral-sh/uv)
- **账户**: Icons8 账户及 API 授权令牌

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd icon_crawler

# 同步 uv 环境
uv sync
```

## 配置

在运行程序前，需要配置 Icons8 API 授权令牌：

1. 登录 [Icons8](https://icons8.com/) 账户
2. 打开浏览器开发者工具 (F12) → Network 标签
3. 刷新页面，找到任意一个 API 请求
4. 复制请求头中的 `Authorization` 值（去掉 `Bearer ` 前缀）
5. 编辑 `src/config.json` 文件，将 token 粘贴到 `authorization` 字段

```json
{
    "authorization": "your-token-here",
    "icons_dir": "D:/icons",
    "download_size": 512,
    "download_format": "png"
}
```

## 使用方法

### 方式一：命令行启动（CLI 模式）

```bash
# 使用 uv 运行
uv run python -m src.main

# 或简写
uv run src\main.py
```

### 方式二：Web UI 启动（推荐）

**一键启动（推荐）：**

1. **Windows 一键启动** - 双击 `start_web.bat`
   - 自动检查环境
   - 启动 Web 服务器
   - 打开默认浏览器访问 Web UI

**命令行启动：**

```bash
# 使用一键启动脚本
python start.py

# 或直接使用 uvicorn
uv run uvicorn src.web.main:create_app --factory --host 127.0.0.1 --port 8000
```

### Web UI 功能介绍

Web 界面采用 **Tailwind CSS** + **HTMX** 技术栈，界面现代美观：

#### 页面 1：启动检查
- **网络连接检查** - 验证是否能连接到 Icons8 服务器
- **授权验证** - 验证 Token 是否有效
- 所有检查通过后才能启动同步

#### 页面 2：同步运行
- **整体进度显示** - 实时显示同步进度和统计信息
- **收藏夹卡片** - 每个收藏夹以卡片形式展示：
  - 收藏夹名称
  - 云端/本地/新增图标数量
  - 实时进度条
  - 同步状态
- **实时更新** - 使用 Server-Sent Events (SSE) 实现实时进度推送

#### 页面 3：完成总结
- **成功动画** - 庆祝完成的对勾动画
- **运行统计** - 运行时间、总下载数、成功/失败数
- **操作按钮** - 再次同步或返回检查页面

### 运行流程

无论是 CLI 还是 GUI 模式，程序都会执行以下操作：

1. **加载配置** - 读取 `src/config.json` 配置文件
2. **验证清单** - 加载 `icons/.manifest.json` 并验证文件完整性
3. **获取收藏夹** - 调用 Icons8 API 获取所有收藏夹列表
4. **增量同步** - 对每个收藏夹：
   - 获取远程图标列表
   - 对比本地清单，识别新增图标
   - 下载新图标（自动处理重名）
   - 更新清单文件
5. **生成报告** - 输出同步结果统计

## 核心特性详解

### 清单系统

程序使用 `icons/.manifest.json` 清单文件追踪所有已下载的图标：

- **唯一标识** - 使用图标 ID 作为唯一标识，而非文件名
- **自动去重** - 自动处理重名图标：`icon.png`、`icon(1).png`、`icon(2).png`
- **完整性验证** - 启动时验证清单与实际文件的一致性
- **增量同步** - 支持增量同步，避免重复下载
- **智能过滤** - 自动忽略 "Favorites" 和 "Downloaded" 收藏夹

### API 调用流程

1. **获取收藏夹列表** - 调用收藏夹列表 API 获取所有收藏夹的 `id`、`apiCode`、`name`
2. **获取图标列表** - 对每个收藏夹，使用 `apiCode` 调用图标列表 API
3. **分页处理** - 自动处理分页，获取所有图标（每页 50 个）
4. **下载图标** - 使用图标 `id` 下载图标文件

## 技术栈

- **Python**: >= 3.12.12
- **UI 框架**: [Flet](https://flet.dev/) (Flutter-based)
- **设计理念**: Material Design 3
- **HTTP 客户端**: aiohttp
- **数据验证**: Pydantic

## 项目结构

```
src/
├── main.py              # CLI 入口
├── main_ui.py           # GUI 入口
├── ui/                  # UI 模块
│   ├── app.py          # Flet 应用主类
│   ├── theme.py        # Material Design 3 主题
│   ├── animations.py   # 动画定义
│   ├── components/     # UI 组件
│   └── pages/          # 页面
├── config.py           # 配置管理
├── api_client.py       # API 客户端
├── sync_manager.py     # 同步逻辑
├── file_manager.py     # 文件管理
└── manifest_manager.py # 清单管理
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- [Icons8](https://icons8.com/) - 提供优秀的图标资源
- [Flet](https://flet.dev/) - 提供跨平台 UI 框架
