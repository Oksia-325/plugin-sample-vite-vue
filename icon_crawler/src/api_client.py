"""API 客户端模块。

使用 aiohttp 实现异步 HTTP 请求，与 Icons8 API 交互。
"""

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import aiohttp

# 尝试相对导入，如果失败则使用绝对导入
try:
    from .config import Config
except ImportError:
    from config import Config


@dataclass
class IconInfo:
    """图标信息数据类。

    Attributes:
        id: 图标唯一标识符
        name: 图标名称
        platform: 图标风格/平台
        formats: 支持的下载格式列表
    """

    id: str
    name: str
    platform: str
    formats: list[str]


@dataclass
class CollectionInfo:
    """收藏夹信息数据类。

    Attributes:
        id: 收藏夹唯一标识符
        api_code: API 代码
        name: 收藏夹名称
        total_icons: 图标总数
        icons: 图标列表
    """

    id: str
    api_code: str
    name: str
    total_icons: int
    icons: list[IconInfo]


class Icons8Client:
    """Icons8 API 异步客户端。

    Attributes:
        config: 配置实例
        session: aiohttp ClientSession 实例
    """

    def __init__(self, config: Config) -> None:
        """初始化客户端。

        Args:
            config: Config 实例
        """
        self.config = config
        self.session: aiohttp.ClientSession | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """获取或创建 aiohttp ClientSession。

        Returns:
            aiohttp ClientSession 实例
        """
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def close(self) -> None:
        """关闭 ClientSession。"""
        if self.session and not self.session.closed:
            await self.session.close()
            self.session = None

    async def __aenter__(self) -> "Icons8Client":
        """异步上下文管理器入口。"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """异步上下文管理器退出。"""
        await self.close()

    async def get_collections(
        self,
        limit: int | None = None,
    ) -> list[CollectionInfo]:
        """获取收藏夹列表（仅元数据，不含图标）。

        Args:
            limit: 返回收藏夹数量上限

        Returns:
            收藏夹信息列表
        """
        if limit is None:
            limit = self.config.collection_limit

        url = f"{self.config.api_base_url}/siteApi/collections/v2"
        params = {
            "previewCount": 5,  # 为0 会报错
            "limit": limit,
            "select": "id,apiCode,totalIcons,name",
            "sort": "-updatedAt",
        }

        session = await self._get_session()
        headers = self.config.get_auth_header()

        async with session.get(url, params=params, headers=headers) as response:
            response.raise_for_status()
            data = await response.json()

            if not data.get("success"):
                raise ValueError("API 返回失败状态")

            collections = []
            for doc in data.get("docs", []):
                collection = CollectionInfo(
                    id=doc["id"],
                    api_code=doc.get("apiCode", ""),
                    name=doc["name"],
                    total_icons=doc.get("totalIcons", 0),
                    icons=[],  # 图标将通过单独的 API 获取
                )
                collections.append(collection)

            return collections

    async def get_collection_icons(
        self,
        collection_id: str,
        limit: int = 50,
    ) -> list[IconInfo]:
        """获取收藏夹中的所有图标（支持分页）。

        Args:
            collection_id: 收藏夹 ID
            limit: 每页返回数量

        Returns:
            图标信息列表
        """
        url = f"{self.config.api_base_url}/siteApi/collections/v2/{collection_id}/icons"
        session = await self._get_session()
        headers = self.config.get_auth_header()

        all_icons = []
        page = 1

        while True:
            params = {
                "limit": limit,
                "page": page,
            }

            async with session.get(url, params=params, headers=headers) as response:
                response.raise_for_status()
                data = await response.json()

                if not data.get("success"):
                    raise ValueError(f"API 返回失败状态: {data}")

                docs = data.get("docs", [])
                for doc in docs:
                    icon = IconInfo(
                        id=doc["id"],
                        name=doc["name"],
                        platform=doc.get("platform", "unknown"),
                        formats=doc.get("formats", []),
                    )
                    all_icons.append(icon)

                # 检查是否还有更多页
                total_pages = data.get("pages", 1)
                if page >= total_pages:
                    break

                page += 1

        return all_icons

    async def download_icon(self, icon_id: str) -> bytes:
        """下载图标文件。

        Args:
            icon_id: 图标唯一标识符

        Returns:
            图标文件的二进制数据
        """
        url = self.config.get_download_url(icon_id)
        session = await self._get_session()

        async with session.get(url) as response:
            response.raise_for_status()
            return await response.read()

    async def download_icon_to_file(self, icon_id: str, file_path: str) -> None:
        """下载图标并保存到文件。

        Args:
            icon_id: 图标唯一标识符
            file_path: 保存文件路径
        """
        data = await self.download_icon(icon_id)
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(data)

    async def download_icons_concurrent(
        self,
        icons: list[tuple[str, str]],
        max_concurrent: int | None = None,
    ) -> dict[str, bytes]:
        """并发下载多个图标。

        Args:
            icons: (icon_id, save_path) 元组列表
            max_concurrent: 最大并发数，默认使用配置值

        Returns:
            icon_id 到二进制数据的映射
        """
        if max_concurrent is None:
            max_concurrent = self.config.max_concurrent_downloads

        semaphore = asyncio.Semaphore(max_concurrent)

        async def download_with_semaphore(icon_id: str, save_path: str) -> tuple[str, bytes]:
            async with semaphore:
                data = await self.download_icon(icon_id)
                Path(save_path).parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, "wb") as f:
                    f.write(data)
                return icon_id, data

        session = await self._get_session()

        async with session:
            tasks = [download_with_semaphore(icon_id, save_path) for icon_id, save_path in icons]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # 过滤掉异常并返回结果
            success_results = []
            for result in results:
                if isinstance(result, Exception):
                    print(f"下载失败: {result}")
                else:
                    success_results.append(result)

            return dict(success_results)
