"""Web UI 端点实现模块。"""

import asyncio
import json
import logging

# 使用绝对导入
import sys
from datetime import datetime
from pathlib import Path

from fastapi import BackgroundTasks, Request
from fastapi.responses import HTMLResponse, StreamingResponse

sys.path.insert(0, str(Path(__file__).parent.parent))

from api_client import Icons8Client
from config import Config
from file_manager import FileManager
from manifest_manager import ManifestManager
from sync_manager import SyncManager
from web.state import SyncStatus, sync_state, CopyStatus, copy_state

logger = logging.getLogger(__name__)

# ==================== 辅助函数 ====================

def get_templates(request: Request):
    """获取模板实例。"""
    return request.app.state.templates


def format_duration(seconds: float) -> str:
    """格式化持续时间。"""
    if seconds < 60:
        return f"{seconds:.1f}秒"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f}分钟"
    else:
        hours = seconds / 3600
        return f"{hours:.2f}小时"


# ==================== 页面端点 ====================

async def page_index(request: Request):
    """首页 - 检查配置状态，决定跳转。"""
    templates = get_templates(request)

    # 检查配置是否存在
    if sync_state.config is None:
        return templates.TemplateResponse(
            "check.html",
            {"request": request, "need_config": True}
        )

    # 如果正在同步中，跳转到同步页
    if sync_state.status in (SyncStatus.SYNCING, SyncStatus.CHECKING):
        return templates.TemplateResponse(
            "sync.html",
            {"request": request, "status": sync_state.to_dict()}
        )

    # 如果已完成，跳转到结果页
    if sync_state.status == SyncStatus.COMPLETED:
        return templates.TemplateResponse(
            "result.html",
            {"request": request, "status": sync_state.to_dict()}
        )

    # 默认跳转到检查页
    return templates.TemplateResponse(
        "check.html",
        {"request": request, "need_config": False}
    )


async def page_check(request: Request):
    """检查页 - 网络和授权检查。"""
    templates = get_templates(request)
    return templates.TemplateResponse(
        "check.html",
        {"request": request, "need_config": sync_state.config is None}
    )


async def page_sync(request: Request):
    """同步页 - 显示同步进度。"""
    templates = get_templates(request)
    return templates.TemplateResponse(
        "sync.html",
        {"request": request, "status": sync_state.to_dict()}
    )


async def page_result(request: Request):
    """结果页 - 显示同步结果。"""
    templates = get_templates(request)

    # 计算运行时间
    duration_str = "未知"
    if sync_state.progress.start_time and sync_state.progress.end_time:
        duration = sync_state.progress.end_time - sync_state.progress.start_time
        duration_str = format_duration(duration)

    return templates.TemplateResponse(
        "result.html",
        {
            "request": request,
            "status": sync_state.to_dict(),
            "duration": duration_str,
            "local_aim_dir": sync_state.config.local_aim_dir if sync_state.config else "",
        }
    )


# ==================== API 端点 ====================

async def api_check():
    """执行连接和授权检查。"""
    if sync_state.config is None:
        return {"success": False, "error": "配置未加载"}

    result = {
        "network": False,
        "authorization": False,
        "error": None,
    }

    try:
        from httpx import AsyncClient
        async with AsyncClient(timeout=10.0) as client:
            # 检查网络连接
            response = await client.get("https://img.icons8.com/?size=512&id=13441&format=png")
            result["network"] = response.status_code == 200
    except Exception as e:
        result["error"] = f"网络检查失败: {str(e)}"
        return result

    try:
        # 检查授权
        async with Icons8Client(sync_state.config) as client:
            collections = await client.get_collections(limit=1)
            result["authorization"] = len(collections) >= 0
    except Exception as e:
        result["error"] = f"授权检查失败: {str(e)}"
        return result

    return result


async def run_sync_task():
    """后台同步任务。"""
    if sync_state.config is None:
        sync_state.error_message = "配置未加载"
        sync_state.status = SyncStatus.ERROR
        return

    sync_state.status = SyncStatus.SYNCING
    sync_state.is_running = True
    sync_state.progress.start_time = asyncio.get_event_loop().time()

    # 创建收藏夹ID到进度索引的映射，用于快速更新
    collection_index_map: dict[str, int] = {}

    def update_progress(collection_id: str, downloaded: int, failed: int):
        """进度回调函数，实时更新同步状态。"""
        if collection_id not in collection_index_map:
            return

        idx = collection_index_map[collection_id]
        if idx >= len(sync_state.progress.collections):
            return

        coll_progress = sync_state.progress.collections[idx]

        # 更新该收藏夹的进度
        coll_progress.downloaded = downloaded
        coll_progress.failed = failed

        # 计算该收藏夹的进度百分比
        total = coll_progress.new_count
        if total > 0:
            coll_progress.progress_percent = round(((downloaded + failed) / total) * 100, 1)

        # 更新状态
        if coll_progress.progress_percent >= 100:
            coll_progress.status = "completed"
        else:
            coll_progress.status = "syncing"

        # 更新总体进度统计
        total_downloaded = sum(c.downloaded for c in sync_state.progress.collections)
        total_failed = sum(c.failed for c in sync_state.progress.collections)

        sync_state.progress.downloaded_icons = total_downloaded
        sync_state.progress.failed_icons = total_failed

        # 计算总体进度百分比
        total_icons = sync_state.progress.total_icons
        if total_icons > 0:
            overall_percent = (total_downloaded + total_failed) / total_icons * 100
        else:
            overall_percent = 0

        # 更新当前消息
        sync_state.progress.current_message = (
            f"正在同步: {coll_progress.collection_name} "
            f"({downloaded}/{coll_progress.new_count}, "
            f"{sync_state.progress.completed_collections}/{sync_state.progress.total_collections} 完成)"
        )

    try:
        config = sync_state.config
        file_manager = FileManager(config.icons_dir)
        manifest_manager = ManifestManager(config.icons_dir)

        async with Icons8Client(config) as client:
            # 获取收藏夹列表（过滤掉 Favorites 和 Downloaded）
            _ignored_names = {"Favorites", "Downloaded"}
            collections = [c for c in await client.get_collections() if c.name not in _ignored_names]
            sync_state.progress.total_collections = len(collections)
            sync_state.progress.current_message = f"找到 {len(collections)} 个收藏夹"

            # 初始化收藏夹进度列表
            from web.state import CollectionProgress
            sync_state.progress.collections = []
            for idx, collection in enumerate(collections):
                coll_progress = CollectionProgress(
                    collection_id=collection.id,
                    collection_name=collection.name,
                    cloud_count=collection.total_icons,
                    status="pending"
                )
                sync_state.progress.collections.append(coll_progress)
                collection_index_map[collection.id] = idx

            # 计算每个收藏夹需要下载的新图标数量
            sync_state.progress.current_message = "正在检查每个收藏夹的新增图标..."
            total_new_icons = 0
            for coll_progress in sync_state.progress.collections:
                try:
                    # 获取本地已有的图标
                    local_entries = manifest_manager.get_collection_entries(coll_progress.collection_id)
                    local_icon_ids = {entry.icon_id for entry in local_entries}

                    # 获取远程图标列表
                    collection_api_code = None
                    for c in collections:
                        if c.id == coll_progress.collection_id:
                            collection_api_code = c.api_code
                            break

                    if collection_api_code:
                        remote_icons = await client.get_collection_icons(collection_api_code)
                        remote_icon_ids = {icon.id for icon in remote_icons}
                        new_icon_ids = remote_icon_ids - local_icon_ids

                        coll_progress.new_count = len(new_icon_ids)
                        coll_progress.local_count = len(local_icon_ids)
                        total_new_icons += len(new_icon_ids)
                except Exception as e:
                    logger.warning(f"检查收藏夹 {coll_progress.collection_name} 失败: {e}")
                    coll_progress.new_count = 0

            sync_state.progress.total_icons = total_new_icons
            sync_state.progress.current_message = f"准备同步 {total_new_icons} 个新图标..."

            # 执行同步，传入进度回调
            from sync_manager import SyncManager
            sync_manager = SyncManager(
                config, client, file_manager, manifest_manager,
                progress_callback=update_progress
            )
            results = await sync_manager.sync_all()

            # 更新最终进度统计
            for result in results:
                sync_state.progress.completed_collections += 1

            # 记录本次同步的手动图标变化
            sync_state.progress.manual_icons_added = sync_manager.manual_icons_added
            sync_state.progress.manual_icons_removed = sync_manager.manual_icons_removed

        sync_state.status = SyncStatus.COMPLETED
        sync_state.progress.current_message = "同步完成"

    except Exception as e:
        import traceback
        sync_state.error_message = str(e)
        sync_state.status = SyncStatus.ERROR
        sync_state.progress.current_message = f"同步失败: {e}"
        print(f"同步任务出错: {e}")
        traceback.print_exc()

    finally:
        sync_state.is_running = False
        sync_state.progress.end_time = asyncio.get_event_loop().time()


async def api_sync_start(background_tasks: BackgroundTasks):
    """开始同步任务。"""
    if sync_state.is_running:
        return {"success": False, "error": "同步任务已在运行中"}

    # 重置状态
    sync_state.reset()
    sync_state.status = SyncStatus.CHECKING

    # 在后台启动同步任务
    background_tasks.add_task(run_sync_task)

    return {"success": True, "message": "同步任务已启动"}


async def api_sync_status():
    """获取当前同步状态。"""
    return sync_state.to_dict()


async def api_sync_stream():
    """SSE 流式推送同步进度。"""
    async def event_stream():
        last_status = None
        while True:
            current_status = sync_state.to_dict()

            # 如果状态变化，发送事件
            if current_status != last_status:
                yield f"data: {__import__('json').dumps(current_status)}\n\n"
                last_status = current_status

            # 如果同步完成或出错，结束流
            if sync_state.status in (SyncStatus.COMPLETED, SyncStatus.ERROR) and not sync_state.is_running:
                yield f"data: {__import__('json').dumps({'done': True})}\n\n"
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


async def api_config_update(config_data: dict):
    """更新配置。"""
    try:
        # 验证配置
        config = Config(**config_data)

        # 保存到文件
        import json
        config_path = Path(__file__).parent.parent / "config.json"
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_data, f, ensure_ascii=False, indent=2)

        # 更新内存中的配置
        sync_state.config = config

        return {"success": True, "message": "配置已更新"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ==================== 覆盖复制端点 ====================

async def run_copy_task():
    """后台任务：将 icons/ 下的文件覆盖复制到 local_aim_dir。"""
    import shutil

    config = sync_state.config
    if not config or not config.local_aim_dir:
        copy_state.error_message = "未配置本地目标路径 (local_aim_dir)"
        copy_state.status = CopyStatus.ERROR
        copy_state.is_running = False
        return

    src_dir = Path(config.icons_dir)
    dst_dir = Path(config.local_aim_dir)

    copy_state.status = CopyStatus.COPYING
    copy_state.is_running = True

    try:
        # 收集所有待处理文件（排除 .manifest.json）
        all_files = [
            f for f in src_dir.rglob("*")
            if f.is_file() and f.name != ".manifest.json"
        ]
        copy_state.progress.total_files = len(all_files)
        copy_state.progress.current_message = f"共找到 {len(all_files)} 个文件"

        for src_file in all_files:
            rel_path = src_file.relative_to(src_dir)
            parts = rel_path.parts
            collection_name = parts[0] if len(parts) > 1 else ""
            # 收藏夹目录名小写（Siyuan 只认识小写文件夹名）
            dst_parts = [collection_name.lower()] + list(parts[1:])
            dst_rel_path = Path(*dst_parts)
            dst_file = dst_dir / dst_rel_path

            copy_state.progress.current_message = f"处理: {rel_path}"

            # 文件名和大小相同则跳过
            if dst_file.exists() and dst_file.stat().st_size == src_file.stat().st_size:
                copy_state.progress.skipped_files += 1
                continue

            try:
                dst_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_file, dst_file)
                copy_state.progress.copied_files += 1
                copy_state.progress.collections[collection_name.lower()] = (
                    copy_state.progress.collections.get(collection_name.lower(), 0) + 1
                )
            except Exception as e:
                copy_state.progress.failed_files += 1
                logger.warning(f"复制失败 {rel_path}: {e}")

            # 让出事件循环，避免阻塞
            await asyncio.sleep(0)

        copy_state.status = CopyStatus.COMPLETED
        copy_state.progress.current_message = (
            f"完成：复制 {copy_state.progress.copied_files} 个，"
            f"跳过 {copy_state.progress.skipped_files} 个"
        )

    except Exception as e:
        import traceback
        copy_state.error_message = str(e)
        copy_state.status = CopyStatus.ERROR
        copy_state.progress.current_message = f"复制失败: {e}"
        traceback.print_exc()
    finally:
        copy_state.is_running = False


async def api_copy_start(background_tasks: BackgroundTasks):
    """启动覆盖复制任务。"""
    if copy_state.is_running:
        return {"success": False, "error": "复制任务已在运行中"}

    config = sync_state.config
    if not config or not config.local_aim_dir:
        return {"success": False, "error": "未配置本地目标路径 (local_aim_dir)"}

    copy_state.reset()
    background_tasks.add_task(run_copy_task)
    return {"success": True, "message": "复制任务已启动"}


async def api_copy_status():
    """获取当前复制状态。"""
    return copy_state.to_dict()


async def api_copy_stream():
    """SSE 流式推送复制进度。"""
    async def event_stream():
        last_status = None
        while True:
            current_status = copy_state.to_dict()
            if current_status != last_status:
                yield f"data: {json.dumps(current_status, ensure_ascii=False)}\n\n"
                last_status = current_status

            if copy_state.status in (CopyStatus.COMPLETED, CopyStatus.ERROR) and not copy_state.is_running:
                yield f"data: {json.dumps({'done': True})}\n\n"
                break

            await asyncio.sleep(0.3)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
