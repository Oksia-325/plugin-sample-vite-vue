"""Web UI 全局状态管理模块。

实现简单的状态机模式管理同步状态。
"""

import sys
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional

# 使用绝对导入
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config


class SyncStatus(Enum):
    """同步状态枚举。"""
    IDLE = "idle"
    CHECKING = "checking"
    SYNCING = "syncing"
    COMPLETED = "completed"
    ERROR = "error"


class CopyStatus(Enum):
    """覆盖复制状态枚举。"""
    IDLE = "idle"
    COPYING = "copying"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class CopyProgress:
    """覆盖复制进度。"""
    total_files: int = 0
    copied_files: int = 0
    skipped_files: int = 0
    failed_files: int = 0
    current_message: str = ""
    collections: dict = field(default_factory=dict)  # collection_name -> copied_count


@dataclass
class CollectionProgress:
    """收藏夹同步进度。"""
    collection_id: str = ""
    collection_name: str = ""
    cloud_count: int = 0
    local_count: int = 0
    new_count: int = 0
    downloaded: int = 0
    failed: int = 0
    progress_percent: float = 0.0
    status: str = "pending"  # pending, syncing, completed, error


@dataclass
class SyncProgress:
    """整体同步进度。"""
    total_collections: int = 0
    completed_collections: int = 0
    total_icons: int = 0
    downloaded_icons: int = 0
    failed_icons: int = 0
    manual_icons_added: int = 0  # 本次同步新增的手动图标数量
    manual_icons_removed: int = 0  # 本次同步删除/丢失的手动图标数量
    collections: list = field(default_factory=list)
    current_message: str = ""
    start_time: float | None = None
    end_time: float | None = None


class SyncState:
    """同步状态管理器（单例模式）。"""

    _instance: Optional["SyncState"] = None

    def __new__(cls) -> "SyncState":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return

        self.status: SyncStatus = SyncStatus.IDLE
        self.config: Config | None = None
        self.is_running: bool = False
        self.progress: SyncProgress = SyncProgress()
        self.error_message: str = ""
        self.check_result: dict = {}

        self._initialized = True

    def reset(self) -> None:
        """重置状态。"""
        self.status = SyncStatus.IDLE
        self.is_running = False
        self.progress = SyncProgress()
        self.error_message = ""

    def to_dict(self) -> dict[str, Any]:
        """转换为字典。"""
        # 转换 collections 为字典列表
        collections_dict = []
        for coll in self.progress.collections:
            collections_dict.append({
                "collection_id": coll.collection_id,
                "collection_name": coll.collection_name,
                "cloud_count": coll.cloud_count,
                "local_count": coll.local_count,
                "new_count": coll.new_count,
                "downloaded": coll.downloaded,
                "failed": coll.failed,
                "progress_percent": coll.progress_percent,
                "status": coll.status,
            })

        return {
            "status": self.status.value,
            "is_running": self.is_running,
            "progress": {
                "total_collections": self.progress.total_collections,
                "completed_collections": self.progress.completed_collections,
                "total_icons": self.progress.total_icons,
                "downloaded_icons": self.progress.downloaded_icons,
                "failed_icons": self.progress.failed_icons,
                "manual_icons_added": self.progress.manual_icons_added,
                "manual_icons_removed": self.progress.manual_icons_removed,
                "current_message": self.progress.current_message,
                "collections": collections_dict,
            },
            "error_message": self.error_message,
        }


# 全局状态实例
sync_state = SyncState()


class CopyState:
    """覆盖复制状态管理器（单例模式）。"""

    _instance: Optional["CopyState"] = None

    def __new__(cls) -> "CopyState":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self.status: CopyStatus = CopyStatus.IDLE
        self.is_running: bool = False
        self.progress: CopyProgress = CopyProgress()
        self.error_message: str = ""
        self._initialized = True

    def reset(self) -> None:
        self.status = CopyStatus.IDLE
        self.is_running = False
        self.progress = CopyProgress()
        self.error_message = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status.value,
            "is_running": self.is_running,
            "progress": {
                "total_files": self.progress.total_files,
                "copied_files": self.progress.copied_files,
                "skipped_files": self.progress.skipped_files,
                "failed_files": self.progress.failed_files,
                "current_message": self.progress.current_message,
                "collections": self.progress.collections,
            },
            "error_message": self.error_message,
        }


# 全局复制状态实例
copy_state = CopyState()
