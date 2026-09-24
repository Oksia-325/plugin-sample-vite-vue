"""FastAPI 主应用模块。"""

import asyncio

# 使用绝对导入
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from web.router import router
from web.state import SyncState, sync_state


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理。"""
    # 启动时加载配置
    try:
        config = Config.load()
        sync_state.config = config
        print(f"✅ 配置加载成功: {config.icons_dir}")
    except Exception as e:
        print(f"⚠️ 配置加载失败: {e}")
        sync_state.config = None

    yield

    # 关闭时清理资源
    sync_state.is_running = False


def create_app() -> FastAPI:
    """创建 FastAPI 应用实例。"""
    app = FastAPI(
        title="Icon Crawler WebUI",
        description="Icons8 图标同步工具 Web 界面",
        version="0.1.0",
        lifespan=lifespan,
    )

    # 获取项目根目录
    web_dir = Path(__file__).parent

    # 挂载静态文件
    static_dir = web_dir / "static"
    static_dir.mkdir(exist_ok=True)
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # 配置模板
    templates_dir = web_dir / "templates"
    templates_dir.mkdir(exist_ok=True)
    templates = Jinja2Templates(directory=templates_dir)

    # 存储模板实例到 app state
    app.state.templates = templates

    # 注册路由
    app.include_router(router)

    return app
