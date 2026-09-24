"""同步逻辑模块。

实现 Icons8 收藏夹与本地文件的同步逻辑。
"""

import asyncio
import logging
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

# 尝试相对导入，如果失败则使用绝对导入
try:
    from .api_client import CollectionInfo, Icons8Client
    from .config import Config
    from .file_manager import FileManager
    from .manifest_manager import ManifestManager
except ImportError:
    from api_client import CollectionInfo, Icons8Client
    from config import Config
    from file_manager import FileManager
    from manifest_manager import ManifestManager

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# 进度回调类型定义
ProgressCallback = Callable[[str, int, int], None]  # collection_id, downloaded, failed


@dataclass
class SyncResult:
    """同步结果数据类。

    Attributes:
        collection_name: 收藏夹名称
        collection_id: 收藏夹 ID
        remote_total: 远程图标总数
        local_total: 本地图标总数
        downloaded: 新下载图标数量
        skipped: 跳过（已存在）图标数量
        failed: 下载失败图标数量
        deleted_remote: 远程已删除（本地仍保留）的图标数量
    """

    collection_name: str
    collection_id: str
    remote_total: int
    local_total: int = 0
    downloaded: int = 0
    skipped: int = 0
    failed: int = 0
    deleted_remote: int = 0


class SyncManager:
    """同步管理器。

    负责协调 API 客户端、文件管理器和清单管理器，实现完整的同步流程。

    Attributes:
        config: 配置实例
        api_client: API 客户端实例
        file_manager: 文件管理器实例
        manifest_manager: 清单管理器实例
    """

    def __init__(
        self,
        config: Config,
        api_client: Icons8Client,
        file_manager: FileManager,
        manifest_manager: ManifestManager,
        progress_callback: ProgressCallback | None = None,
    ) -> None:
        """初始化同步管理器。

        Args:
            config: Config 实例
            api_client: Icons8Client 实例
            file_manager: FileManager 实例
            manifest_manager: ManifestManager 实例
            progress_callback: 进度回调函数，用于实时报告下载进度
        """
        self.config = config
        self.api_client = api_client
        self.file_manager = file_manager
        self.manifest_manager = manifest_manager
        self.progress_callback = progress_callback
        self._download_counter = 0
        self._save_threshold = 10  # 每下载10个保存一次
        self.manual_icons_added = 0  # 本次同步新增的手动图标数量
        self.manual_icons_removed = 0  # 本次同步删除的手动图标数量

    def _increment_and_maybe_save(self) -> None:
        """递增下载计数器，达到阈值时保存清单。"""
        self._download_counter += 1
        if self._download_counter >= self._save_threshold:
            self.manifest_manager.save_manifest()
            self._download_counter = 0
            logger.debug(f"已触发增量保存（每{self._save_threshold}个图标）")

    async def sync_all(self) -> list[SyncResult]:
        """同步所有收藏夹。

        Returns:
            同步结果列表
        """
        logger.info("开始同步 Icons8 收藏夹...")

        # 验证清单与实际文件的一致性
        logger.info("验证本地文件...")
        missing_icons, _, missing_manual_icons, orphaned_manual_files = self.manifest_manager.verify_files(
            self.file_manager.icons_dir
        )

        if missing_icons:
            logger.warning(f"发现 {len(missing_icons)} 个清单中的文件缺失，将从清单中移除")
            for icon_id in missing_icons:
                self.manifest_manager.remove_entry(icon_id)

        # 扫描并自动追踪孤立文件（手动添加的图标）
        logger.info("扫描手动添加的图标...")
        new_manual_entries = self.manifest_manager.scan_and_track_orphaned_files()

        # 记录手动图标的新增和删除数量
        self.manual_icons_added = len(new_manual_entries)
        self.manual_icons_removed = len(missing_manual_icons)

        if new_manual_entries:
            logger.info(f"已将 {len(new_manual_entries)} 个手动添加的图标纳入追踪")
            # 立即保存以保留手动图标的追踪信息
            self.manifest_manager.save_manifest()
            logger.info("手动图标追踪信息已保存")

        if missing_manual_icons:
            # 从清单中移除丢失的手动图标
            for icon_id in missing_manual_icons:
                self.manifest_manager.remove_entry(icon_id)
            self.manifest_manager.save_manifest()
            logger.info(f"已从清单中移除 {len(missing_manual_icons)} 个丢失的手动图标")

        if not new_manual_entries and not missing_manual_icons:
            logger.info("未发现手动图标变化")

        # 获取远程收藏夹列表
        collections = await self.api_client.get_collections()
        logger.info(f"找到 {len(collections)} 个远程收藏夹")

        # 过滤掉不需要同步的收藏夹
        ignored_names = {"Favorites", "Downloaded"}
        filtered_collections = [
            c for c in collections if c.name not in ignored_names
        ]

        if len(filtered_collections) < len(collections):
            ignored_count = len(collections) - len(filtered_collections)
            logger.info(f"忽略 {ignored_count} 个收藏夹: {', '.join(ignored_names)}")
            logger.info(f"将同步 {len(filtered_collections)} 个收藏夹")

        results: list[SyncResult] = []

        for collection in filtered_collections:
            result = await self.sync_collection(collection)
            results.append(result)

            # 每个收藏夹同步完成后，如果有下载操作，立即保存清单
            if result.downloaded > 0 or result.failed > 0:
                self.manifest_manager.save_manifest()
                logger.info(f"收藏夹 '{result.collection_name}' 同步完成，清单已保存")

        # 最终保存确保所有更改持久化
        self.manifest_manager.save_manifest()
        logger.info("清单已保存")

        return results

    async def sync_collection(
        self,
        collection: CollectionInfo,
    ) -> SyncResult:
        """同步单个收藏夹。

        Args:
            collection: 收藏夹信息

        Returns:
            同步结果
        """
        collection_name = collection.name
        collection_id = collection.id
        collection_api_code = collection.api_code
        logger.info(f"同步收藏夹: {collection_name}")

        # 确保目录存在
        self.file_manager.create_collection_dir(collection_name)

        # 获取收藏夹中的所有图标（使用 apiCode）
        logger.info("  获取收藏夹图标列表...")
        try:
            remote_icons = await self.api_client.get_collection_icons(collection_api_code)
            logger.info(f"  远程图标: {len(remote_icons)} 个")
        except Exception as e:
            logger.error(f"  获取图标列表失败: {e}")
            return SyncResult(
                collection_name=collection_name,
                collection_id=collection_id,
                remote_total=0,
                local_total=0,
                failed=1,
            )

        # 获取本地已有的图标（从清单）
        local_entries = self.manifest_manager.get_collection_entries(collection_id)
        local_icon_ids = {entry.icon_id for entry in local_entries}

        # 获取远程图标 ID 集合
        remote_icon_ids = {icon.id for icon in remote_icons}

        # 计算需要下载的新图标
        new_icon_ids = remote_icon_ids - local_icon_ids

        # 计算远程已删除的图标
        deleted_icon_ids = local_icon_ids - remote_icon_ids

        logger.info(f"  本地: {len(local_entries)} 个")
        logger.info(f"  新增: {len(new_icon_ids)} 个")
        if deleted_icon_ids:
            logger.info(f"  远程已删除: {len(deleted_icon_ids)} 个（本地保留）")

        # 准备下载任务
        download_tasks: list[tuple[str, str, str, str]] = []
        reserved_filenames: set[str] = set()  # 追踪本批次中已使用的文件名

        for icon in remote_icons:
            if icon.id in new_icon_ids:
                # 生成唯一的本地文件名（考虑本批次中已预留的文件名）
                safe_base_name = self.file_manager._sanitize_name(icon.name)
                unique_filename = self.manifest_manager.generate_unique_filename(
                    collection_id, safe_base_name, self.config.download_format, reserved_filenames
                )

                # 将文件名添加到预留集合中
                reserved_filenames.add(unique_filename)

                save_path = str(
                    self.file_manager.get_icon_path_from_filename(
                        collection_name, unique_filename
                    )
                )

                download_tasks.append((icon.id, icon.name, unique_filename, save_path))

        # 下载新图标
        result = SyncResult(
            collection_name=collection_name,
            collection_id=collection_id,
            remote_total=len(remote_icons),
            local_total=len(local_entries),
            deleted_remote=len(deleted_icon_ids),
        )

        if download_tasks:
            downloaded_count, failed_count = await self._download_icons(
                download_tasks, collection_id, collection_name
            )
            result.downloaded = downloaded_count
            result.failed = failed_count
            result.local_total += downloaded_count

            logger.info(f"  完成: 下载 {downloaded_count}, 失败 {failed_count}")
        else:
            result.skipped = len(remote_icons)
            logger.info("  无需下载新图标")

        return result

    async def _download_icons(
        self,
        tasks: list[tuple[str, str, str, str]],
        collection_id: str,
        collection_name: str,
    ) -> tuple[int, int]:
        """批量下载图标。

        Args:
            tasks: (icon_id, icon_name, local_filename, save_path) 元组列表
            collection_id: 收藏夹 ID
            collection_name: 收藏夹名称

        Returns:
            (下载成功数, 失败数) 元组
        """
        semaphore = asyncio.Semaphore(self.config.max_concurrent_downloads)
        downloaded = 0
        failed = 0

        async def download_one(
            icon_id: str, icon_name: str, local_filename: str, save_path: str
        ) -> str:
            """下载单个图标。"""
            async with semaphore:
                try:
                    # 检查文件是否已存在（可能其他并发任务已下载）
                    if Path(save_path).exists():
                        return "skipped"

                    await self.api_client.download_icon_to_file(icon_id, save_path)

                    # 添加到清单
                    self.manifest_manager.add_entry(
                        icon_id=icon_id,
                        collection_id=collection_id,
                        collection_name=collection_name,
                        icon_name=icon_name,
                        local_filename=local_filename,
                    )

                    return "downloaded"
                except Exception as e:
                    logger.error(f"下载失败 {icon_id} ({icon_name}): {e}")
                    return "failed"

        # 并发下载
        download_tasks = [
            download_one(icon_id, icon_name, local_filename, save_path)
            for icon_id, icon_name, local_filename, save_path in tasks
        ]

        # 使用 as_completed 来获取实时进度
        from asyncio import as_completed
        for coro in as_completed(download_tasks):
            result = await coro
            if result == "downloaded":
                downloaded += 1
                # 触发增量保存
                self._increment_and_maybe_save()
                # 触发进度回调
                if self.progress_callback:
                    self.progress_callback(collection_id, downloaded, failed)
            elif result == "skipped":
                # 跳过的文件不计入统计
                pass
            else:
                failed += 1
                # 触发进度回调
                if self.progress_callback:
                    self.progress_callback(collection_id, downloaded, failed)

        # 确保剩余的计数也保存
        if self._download_counter > 0:
            self.manifest_manager.save_manifest()
            self._download_counter = 0

        return downloaded, failed

    async def download_single_icon(
        self,
        icon_id: str,
        icon_name: str,
        collection_id: str,
        collection_name: str,
    ) -> bool:
        """下载单个图标（用于 UI）。

        Args:
            icon_id: 图标 ID
            icon_name: 图标名称
            collection_id: 收藏夹 ID
            collection_name: 收藏夹名称

        Returns:
            是否下载成功
        """
        try:
            # 确保目录存在
            self.file_manager.create_collection_dir(collection_name)

            # 生成唯一的本地文件名
            safe_base_name = self.file_manager._sanitize_name(icon_name)
            unique_filename = self.manifest_manager.generate_unique_filename(
                collection_id, safe_base_name, self.config.download_format
            )

            save_path = str(
                self.file_manager.get_icon_path_from_filename(
                    collection_name, unique_filename
                )
            )

            # 检查文件是否已存在
            if Path(save_path).exists():
                return True

            # 下载图标
            await self.api_client.download_icon_to_file(icon_id, save_path)

            # 添加到清单
            self.manifest_manager.add_entry(
                icon_id=icon_id,
                collection_id=collection_id,
                collection_name=collection_name,
                icon_name=icon_name,
                local_filename=unique_filename,
            )

            return True
        except Exception as e:
            logger.error(f"下载失败 {icon_id} ({icon_name}): {e}")
            return False

    def print_summary(self, results: list[SyncResult]) -> None:
        """打印同步结果汇总。

        Args:
            results: 同步结果列表
        """
        total_downloaded = sum(r.downloaded for r in results)
        total_failed = sum(r.failed for r in results)
        total_remote = sum(r.remote_total for r in results)
        total_local = sum(r.local_total for r in results)
        total_deleted_remote = sum(r.deleted_remote for r in results)

        print("\n" + "=" * 60)
        print("同步完成!")
        print("=" * 60)

        # 按收藏夹详细统计
        print("\n收藏夹详情:")
        for result in results:
            print(f"\n  [{result.collection_name}]")
            print(f"    远程: {result.remote_total} 个")
            print(f"    本地: {result.local_total} 个")
            print(f"    新下载: {result.downloaded} 个")
            if result.failed > 0:
                print(f"    失败: {result.failed} 个")
            if result.deleted_remote > 0:
                print(f"    远程已删除: {result.deleted_remote} 个（本地保留）")

        # 总体统计
        print("\n" + "-" * 60)
        print("总体统计:")
        print(f"  收藏夹数量: {len(results)}")
        print(f"  远程图标总数: {total_remote}")
        print(f"  本地图标总数: {total_local}")
        print(f"  本次下载: {total_downloaded}")
        if total_failed > 0:
            print(f"  下载失败: {total_failed}")
        if total_deleted_remote > 0:
            print(f"  远程已删除: {total_deleted_remote}（本地保留）")
        print("=" * 60)

