"""配置管理模块。

使用 Pydantic 管理配置，从 config.json 读取设置。
"""

import json
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field


class Config(BaseModel):
    """Icons8 图标同步工具的配置类。

    Attributes:
        authorization: Icons8 API 授权令牌，支持 Bearer token 格式
        api_base_url: Icons8 API 基础 URL
        download_base_url: Icons8 图标下载基础 URL
        icons_dir: 本地图标保存目录
        download_size: 下载图标尺寸（像素）
        download_format: 下载图标格式 (png/svg/pdf)
        max_concurrent_downloads: 最大并发下载数
        preview_count: 收藏夹预览图标数量
        collection_limit: 收藏夹返回数量上限
    """

    authorization: str = Field(..., description="Icons8 API 授权令牌")
    api_base_url: str = Field(
        default="https://api-icons.icons8.com",
        description="Icons8 API 基础 URL",
    )
    download_base_url: str = Field(
        default="https://img.icons8.com/",
        description="Icons8 图标下载基础 URL",
    )
    icons_dir: str = Field(default="icons", description="本地图标保存目录")
    download_size: int = Field(default=512, description="下载图标尺寸（像素）")
    download_format: str = Field(default="png", description="下载图标格式")
    max_concurrent_downloads: int = Field(default=4, description="最大并发下载数")
    preview_count: int = Field(default=5, description="收藏夹预览图标数量")
    collection_limit: int = Field(default=150, description="收藏夹返回数量上限")
    local_aim_dir: Optional[str] = Field(default=None, description="本地目标路径，用于覆盖保存同步结果")

    @classmethod
    def load(cls, config_path: Optional[Path] = None) -> "Config":
        """从 JSON 配置文件加载配置。

        Args:
            config_path: 配置文件路径，默认查找 src/config.json

        Returns:
            Config 实例

        Raises:
            FileNotFoundError: 配置文件不存在
            ValueError: 配置文件格式错误
        """
        if config_path is None:
            config_path = Path(__file__).parent / "config.json"

        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 处理 authorization 字段格式
        if "authorization" in data:
            auth = data["authorization"]
            if auth.startswith("Bearer "):
                data["authorization"] = auth[7:]  # 移除 "Bearer " 前缀

        return cls(**data)

    def get_auth_header(self) -> dict[str, str]:
        """获取认证请求头。

        Returns:
            包含 Authorization 的请求头字典
        """
        return {"Authorization": f"Bearer {self.authorization}"}

    def get_download_url(self, icon_id: str) -> str:
        """获取图标下载 URL。

        Args:
            icon_id: 图标唯一标识符

        Returns:
            完整的下载 URL
        """
        return (
            f"{self.download_base_url}?size={self.download_size}"
            f"&id={icon_id}&format={self.download_format}"
        )

    def get_icons_path(self) -> Path:
        """获取图标保存目录路径。

        Returns:
            Path 对象
        """
        return Path(self.icons_dir)
