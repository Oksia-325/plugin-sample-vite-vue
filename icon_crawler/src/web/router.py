"""Web UI 路由模块。"""

from fastapi import APIRouter, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, StreamingResponse

from . import endpoints

router = APIRouter()


# ==================== 页面路由 ====================

@router.get("/", response_class=HTMLResponse)
async def page_index(request: Request):
    """首页 - 检查配置状态，决定跳转。"""
    return await endpoints.page_index(request)


@router.get("/check", response_class=HTMLResponse)
async def page_check(request: Request):
    """检查页 - 网络和授权检查。"""
    return await endpoints.page_check(request)


@router.get("/sync", response_class=HTMLResponse)
async def page_sync(request: Request):
    """同步页 - 显示同步进度。"""
    return await endpoints.page_sync(request)


@router.get("/result", response_class=HTMLResponse)
async def page_result(request: Request):
    """结果页 - 显示同步结果。"""
    return await endpoints.page_result(request)


# ==================== API 路由 ====================

@router.get("/api/check")
async def api_check():
    """执行连接和授权检查。"""
    return await endpoints.api_check()


@router.post("/api/sync/start")
async def api_sync_start(background_tasks: BackgroundTasks):
    """开始同步任务。"""
    return await endpoints.api_sync_start(background_tasks)


@router.get("/api/sync/status")
async def api_sync_status():
    """获取当前同步状态。"""
    return await endpoints.api_sync_status()


@router.get("/api/sync/stream")
async def api_sync_stream():
    """SSE 流式推送同步进度。"""
    return await endpoints.api_sync_stream()


@router.post("/api/config")
async def api_config_update(config_data: dict):
    """更新配置。"""
    return await endpoints.api_config_update(config_data)


# ==================== 覆盖复制路由 ====================

@router.post("/api/copy/start")
async def api_copy_start(background_tasks: BackgroundTasks):
    """启动覆盖复制任务。"""
    return await endpoints.api_copy_start(background_tasks)


@router.get("/api/copy/status")
async def api_copy_status():
    """获取当前复制状态。"""
    return await endpoints.api_copy_status()


@router.get("/api/copy/stream")
async def api_copy_stream():
    """SSE 流式推送复制进度。"""
    return await endpoints.api_copy_stream()
