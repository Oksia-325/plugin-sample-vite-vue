"""本地文件管理模块。

管理本地图标文件的保存、目录结构和已下载文件的追踪。
"""

import json
from pathlib import Path
from typing import Optional


class FileManager:
    """本地文件管理器。

    Attributes:
        icons_dir: 图标保存根目录
    """

    def __init__(self, icons_dir: str = "icons") -> None:
        """初始化文件管理器。

        Args:
            icons_dir: 图标保存根目录
        """
        self.icons_dir = Path(icons_dir)
        self._ensure_base_dir()

    def _ensure_base_dir(self) -> None:
        """确保基础目录存在。"""
        self.icons_dir.mkdir(parents=True, exist_ok=True)

    def collection_path(self, collection_name: str) -> Path:
        """获取收藏夹对应的本地目录路径。

        Args:
            collection_name: 收藏夹名称

        Returns:
            Path 对象
        """
        # 处理特殊字符，创建安全的目录名
        safe_name = self._sanitize_name(collection_name)
        return self.icons_dir / safe_name

    def icon_path(self, collection_name: str, icon_name: str, extension: str = "png") -> Path:
        """获取图标文件的本地路径。

        Args:
            collection_name: 收藏夹名称
            icon_name: 图标名称
            extension: 文件扩展名

        Returns:
            Path 对象
        """
        collection_dir = self.collection_path(collection_name)
        safe_name = self._sanitize_name(icon_name)
        return collection_dir / f"{safe_name}.{extension}"

    def _sanitize_name(self, name: str) -> str:
        """清理名称中的非法字符。

        Args:
            name: 原始名称

        Returns:
            清理后的安全名称
        """
        # 替换非法字符为下划线
        unsafe_chars = r'<>:"/\|?*'
        for char in unsafe_chars:
            name = name.replace(char, "_")
        # 去除首尾空格和点
        name = name.strip().strip(".")
        # 如果名称为空，使用默认值
        if not name:
            name = "unnamed"
        return name

    def create_collection_dir(self, collection_name: str) -> Path:
        """创建收藏夹目录。

        Args:
            collection_name: 收藏夹名称

        Returns:
            创建的目录 Path 对象
        """
        path = self.collection_path(collection_name)
        path.mkdir(parents=True, exist_ok=True)
        return path

    def icon_exists(self, collection_name: str, icon_name: str, extension: str = "png") -> bool:
        """检查图标文件是否存在。

        Args:
            collection_name: 收藏夹名称
            icon_name: 图标名称
            extension: 文件扩展名

        Returns:
            文件是否存在
        """
        path = self.icon_path(collection_name, icon_name, extension)
        return path.exists()

    def save_icon(
        self,
        collection_name: str,
        icon_name: str,
        data: bytes,
        extension: str = "png",
    ) -> Path:
        """保存图标文件。

        Args:
            collection_name: 收藏夹名称
            icon_name: 图标名称
            data: 图标二进制数据
            extension: 文件扩展名

        Returns:
            保存的文件 Path 对象
        """
        path = self.icon_path(collection_name, icon_name, extension)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return path

    def get_downloaded_icons(self, collection_name: Optional[str] = None) -> dict[str, set[str]]:
        """获取已下载图标列表。

        Args:
            collection_name: 可选，指定收藏夹名称

        Returns:
            {收藏夹名称: {图标名称集合}} 的字典
        """
        result: dict[str, set[str]] = {}

        if collection_name:
            # 只获取指定收藏夹
            collection_dir = self.collection_path(collection_name)
            if collection_dir.exists():
                result[collection_name] = self._scan_icons_dir(collection_dir)
        else:
            # 扫描所有收藏夹
            for item in self.icons_dir.iterdir():
                if item.is_dir():
                    result[item.name] = self._scan_icons_dir(item)

        return result

    def _scan_icons_dir(self, directory: Path) -> set[str]:
        """扫描目录获取图标文件名集合。

        Args:
            directory: 目录 Path 对象

        Returns:
            图标名称集合（不含扩展名）
        """
        icons: set[str] = set()
        for file in directory.iterdir():
            if file.is_file() and file.suffix.lower() == ".png":
                icons.add(file.stem)
        return icons

    def get_all_downloaded_icons_flat(self) -> set[str]:
        """获取所有已下载图标的完整路径集合。

        Returns:
            完整图标路径集合
        """
        paths: set[str] = set()
        for item in self.icons_dir.iterdir():
            if item.is_dir():
                for file in item.iterdir():
                    if file.is_file() and file.suffix.lower() == ".png":
                        paths.add(str(file))
        return paths

    def get_total_stats(self) -> dict[str, int]:
        """获取本地图标统计信息。

        Returns:
            包含收藏夹数量和图标数量的字典
        """
        stats = {"collections": 0, "icons": 0}
        for item in self.icons_dir.iterdir():
            if item.is_dir():
                stats["collections"] += 1
                for file in item.iterdir():
                    if file.is_file() and file.suffix.lower() == ".png":
                        stats["icons"] += 1
        return stats

    def get_icon_path_from_filename(self, collection_name: str, filename: str) -> Path:
        """根据文件名获取完整路径。

        Args:
            collection_name: 收藏夹名称
            filename: 文件名（含扩展名）

        Returns:
            Path 对象
        """
        collection_dir = self.collection_path(collection_name)
        return collection_dir / filename

    def cleanup_empty_collections(self) -> int:
        """清理空的收藏夹目录。

        Returns:
            删除的目录数量
        """
        removed = 0
        for item in self.icons_dir.iterdir():
            if item.is_dir():
                # 检查是否为空目录
                if not any(item.iterdir()):
                    item.rmdir()
                    removed += 1
        return removed
