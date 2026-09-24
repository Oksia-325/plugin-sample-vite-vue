"""清单管理模块。

管理本地图标文件的清单，追踪图标 ID 与本地文件的映射关系。
"""

import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional


@dataclass
class IconManifestEntry:
    """图标清单条目。

    Attributes:
        icon_id: 图标唯一标识符
        collection_id: 收藏夹 ID
        collection_name: 收藏夹名称
        icon_name: 图标原始名称
        local_filename: 本地文件名（含扩展名）
        download_time: 下载时间戳
        is_manual: 是否为手动添加的图标（非Icons8同步）
    """

    icon_id: str
    collection_id: str
    collection_name: str
    icon_name: str
    local_filename: str
    download_time: str
    is_manual: bool = False


class ManifestManager:
    """清单管理器。

    Attributes:
        manifest_path: 清单文件路径
        entries: 图标清单条目字典 {icon_id: IconManifestEntry}
    """

    def __init__(self, icons_dir: str = "icons") -> None:
        """初始化清单管理器。

        Args:
            icons_dir: 图标保存根目录
        """
        self.icons_dir = Path(icons_dir)
        self.manifest_path = self.icons_dir / ".manifest.json"
        self.entries: dict[str, IconManifestEntry] = {}
        self._load_manifest()

    def _load_manifest(self) -> None:
        """从文件加载清单。"""
        if not self.manifest_path.exists():
            return

        try:
            with open(self.manifest_path, encoding="utf-8") as f:
                data = json.load(f)

            for icon_id, entry_data in data.items():
                self.entries[icon_id] = IconManifestEntry(**entry_data)
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"警告: 清单文件损坏，将创建新清单 - {e}")
            self.entries = {}

    def save_manifest(self) -> None:
        """保存清单到文件。"""
        self.icons_dir.mkdir(parents=True, exist_ok=True)

        data = {icon_id: asdict(entry) for icon_id, entry in self.entries.items()}

        with open(self.manifest_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def scan_and_track_orphaned_files(self) -> list[IconManifestEntry]:
        """扫描孤立文件并自动添加到清单追踪。

        为手动添加的图标（非Icons8同步）创建清单条目，
        分配以 'manual_' 为前缀的特殊ID。

        Returns:
            新添加到清单的条目列表
        """
        orphaned_files = self._find_orphaned_files()
        if not orphaned_files:
            return []

        new_entries: list[IconManifestEntry] = []

        for file_info in orphaned_files:
            collection_name = file_info["collection_name"]
            filename = file_info["filename"]
            full_path = file_info["full_path"]

            # 从文件名和路径提取信息
            icon_name = Path(filename).stem
            extension = Path(filename).suffix.lower()

            # 仅追踪 png 和 svg 格式的图标
            if extension not in [".png", ".svg"]:
                continue

            # 生成收藏夹ID（基于名称的哈希）
            import hashlib
            collection_id = f"local_{hashlib.md5(collection_name.encode()).hexdigest()[:8]}"

            # 生成唯一的手动图标ID
            manual_icon_id = self._generate_manual_icon_id(collection_id)

            # 创建清单条目
            entry = IconManifestEntry(
                icon_id=manual_icon_id,
                collection_id=collection_id,
                collection_name=collection_name,
                icon_name=icon_name,
                local_filename=filename,
                download_time=datetime.now().isoformat(),
                is_manual=True,  # 标记为手动添加
            )

            self.entries[manual_icon_id] = entry
            new_entries.append(entry)

        return new_entries

    def _find_orphaned_files(self) -> list[dict]:
        """查找不在清单中的孤立文件。

        Returns:
            孤立文件信息列表，每个元素包含 collection_name, filename, full_path
        """
        orphaned_files = []

        # 构建清单中的文件集合 {(collection_name, filename): icon_id}
        manifest_files: dict[tuple[str, str], str] = {}
        for icon_id, entry in self.entries.items():
            key = (entry.collection_name, entry.local_filename)
            manifest_files[key] = icon_id

        # 扫描所有收藏夹目录
        if not self.icons_dir.exists():
            return orphaned_files

        for collection_dir in self.icons_dir.iterdir():
            if not collection_dir.is_dir() or collection_dir.name.startswith("."):
                continue

            collection_name = collection_dir.name

            # 遍历目录中的文件
            for file_path in collection_dir.iterdir():
                if not file_path.is_file():
                    continue

                filename = file_path.name

                # 检查文件是否在清单中
                key = (collection_name, filename)
                if key not in manifest_files:
                    orphaned_files.append({
                        "collection_name": collection_name,
                        "filename": filename,
                        "full_path": str(file_path),
                    })

        return orphaned_files

    def _generate_manual_icon_id(self, collection_id: str) -> str:
        """生成唯一的手动图标ID。

        Args:
            collection_id: 收藏夹ID

        Returns:
            格式为 'manual_{collection_id}_{序号}' 的唯一ID
        """
        # 统计该收藏夹中已有的手动图标数量
        existing_manual = [
            entry for entry in self.entries.values()
            if entry.collection_id == collection_id and entry.icon_id.startswith("manual_")
        ]

        # 找到最大序号
        max_num = 0
        for entry in existing_manual:
            parts = entry.icon_id.split("_")
            if len(parts) >= 3:
                try:
                    num = int(parts[-1])
                    max_num = max(max_num, num)
                except ValueError:
                    pass

        new_num = max_num + 1
        return f"manual_{collection_id}_{new_num:04d}"

    def add_entry(
        self,
        icon_id: str,
        collection_id: str,
        collection_name: str,
        icon_name: str,
        local_filename: str,
    ) -> None:
        """添加清单条目。

        Args:
            icon_id: 图标 ID
            collection_id: 收藏夹 ID
            collection_name: 收藏夹名称
            icon_name: 图标名称
            local_filename: 本地文件名
        """
        entry = IconManifestEntry(
            icon_id=icon_id,
            collection_id=collection_id,
            collection_name=collection_name,
            icon_name=icon_name,
            local_filename=local_filename,
            download_time=datetime.now().isoformat(),
        )
        self.entries[icon_id] = entry

    def has_icon(self, icon_id: str) -> bool:
        """检查图标是否已在清单中。

        Args:
            icon_id: 图标 ID

        Returns:
            是否存在
        """
        return icon_id in self.entries

    def get_entry(self, icon_id: str) -> IconManifestEntry | None:
        """获取清单条目。

        Args:
            icon_id: 图标 ID

        Returns:
            清单条目或 None
        """
        return self.entries.get(icon_id)

    def remove_entry(self, icon_id: str) -> None:
        """删除清单条目。

        Args:
            icon_id: 图标 ID
        """
        if icon_id in self.entries:
            del self.entries[icon_id]

    def get_collection_entries(self, collection_id: str) -> list[IconManifestEntry]:
        """获取指定收藏夹的所有条目。

        Args:
            collection_id: 收藏夹 ID

        Returns:
            条目列表
        """
        return [entry for entry in self.entries.values() if entry.collection_id == collection_id]

    def verify_files(self, icons_dir: Path) -> tuple[list[str], list[str], list[str], list[str]]:
        """验证清单与实际文件的一致性。

        Args:
            icons_dir: 图标目录

        Returns:
            (缺失文件的 icon_id 列表, 孤立文件路径列表, 
             缺失的手动图标ID列表, 新增的手动图标路径列表)
        """
        missing_icons = []
        orphaned_files = []
        missing_manual_icons = []
        orphaned_manual_files = []

        # 检查清单中的文件是否存在
        for icon_id, entry in self.entries.items():
            file_path = icons_dir / entry.collection_name / entry.local_filename
            if not file_path.exists():
                missing_icons.append(icon_id)
                # 如果是手动图标，单独记录
                if entry.is_manual:
                    missing_manual_icons.append(icon_id)

        # 扫描实际文件，找出不在清单中的文件
        manifest_files = {(entry.collection_name, entry.local_filename) for entry in self.entries.values()}

        for collection_dir in icons_dir.iterdir():
            if collection_dir.is_dir() and not collection_dir.name.startswith("."):
                for file_path in collection_dir.iterdir():
                    if file_path.is_file():
                        key = (collection_dir.name, file_path.name)
                        if key not in manifest_files:
                            orphaned_files.append(str(file_path))
                            # 检查是否为手动添加的图标文件（PNG/SVG）
                            ext = file_path.suffix.lower()
                            if ext in ['.png', '.svg']:
                                orphaned_manual_files.append(str(file_path))

        return missing_icons, orphaned_files, missing_manual_icons, orphaned_manual_files

    def generate_unique_filename(
        self, collection_id: str, base_name: str, extension: str, reserved_filenames: set[str] | None = None
    ) -> str:
        """生成唯一的文件名，处理重名情况。

        Args:
            collection_id: 收藏夹 ID
            base_name: 基础文件名（不含扩展名）
            extension: 文件扩展名
            reserved_filenames: 可选，本批次中已预留的文件名集合

        Returns:
            唯一的文件名（含扩展名）
        """
        # 获取该收藏夹中已有的文件名
        existing_filenames = {
            entry.local_filename for entry in self.entries.values() if entry.collection_id == collection_id
        }

        # 合并清单中的文件名和本批次预留的文件名
        if reserved_filenames:
            existing_filenames = existing_filenames | reserved_filenames

        # 尝试原始文件名
        filename = f"{base_name}.{extension}"
        if filename not in existing_filenames:
            return filename

        # 如果重名，添加 (1), (2), (3) 等后缀
        counter = 1
        while True:
            filename = f"{base_name}({counter}).{extension}"
            if filename not in existing_filenames:
                return filename
            counter += 1

    def get_stats_by_collection(self) -> dict[str, dict[str, int]]:
        """获取按收藏夹分组的统计信息。

        Returns:
            {collection_name: {local_count: int}} 的字典
        """
        stats: dict[str, dict[str, int]] = {}

        for entry in self.entries.values():
            if entry.collection_name not in stats:
                stats[entry.collection_name] = {"local_count": 0}
            stats[entry.collection_name]["local_count"] += 1

        return stats

    def get_total_count(self) -> int:
        """获取清单中的图标总数。

        Returns:
            图标总数
        """
        return len(self.entries)
