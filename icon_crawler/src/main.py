"""Icon Crawler 主入口模块。

自动同步 Icons8 个人收藏图标的 Python 工具。
"""

import asyncio
import sys

from .api_client import Icons8Client
from .config import Config
from .file_manager import FileManager
from .manifest_manager import ManifestManager
from .sync_manager import SyncManager


async def main() -> None:
    """主异步函数。"""
    print("=" * 50)
    print("Icons8 Icon Crawler")
    print("=" * 50)

    try:
        # 1. 加载配置文件
        print("\n[1/5] 加载配置...")
        config = Config.load()
        print("  配置加载成功")
        print(f"  - API URL: {config.api_base_url}")
        print(f"  - 下载格式: {config.download_format} ({config.download_size}px)")
        print(f"  - 并发数: {config.max_concurrent_downloads}")

        # 2. 初始化组件
        print("\n[2/5] 初始化组件...")
        file_manager = FileManager(config.icons_dir)
        manifest_manager = ManifestManager(config.icons_dir)
        print(f"  图标目录: {file_manager.icons_dir}")
        print(f"  清单文件: {manifest_manager.manifest_path}")

        # 3. 获取本地统计
        print("\n[3/5] 检查本地状态...")
        local_count = manifest_manager.get_total_count()
        print(f"  清单中记录: {local_count} 个图标")

        # 4. 执行同步
        print("\n[4/5] 同步图标...")
        async with Icons8Client(config) as client:
            sync_manager = SyncManager(config, client, file_manager, manifest_manager)
            results = await sync_manager.sync_all()

        # 5. 打印汇总
        print("\n[5/5] 生成报告...")
        sync_manager.print_summary(results)

    except FileNotFoundError as e:
        print(f"\n错误: 配置文件不存在 - {e}")
        print("请确保 src/config.json 文件存在")
        sys.exit(1)
    except ValueError as e:
        print(f"\n错误: 配置错误 - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n错误: {e}")
        raise


def entry_point() -> None:
    """程序入口点。"""
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n程序被用户中断")
        sys.exit(0)


if __name__ == "__main__":
    entry_point()
