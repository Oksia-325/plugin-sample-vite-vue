#!/usr/bin/env python3
"""Icon Crawler Web UI 启动脚本。

自动检查环境、安装依赖并启动 Web 服务器。
"""

import subprocess
import sys
import webbrowser
from pathlib import Path
import time


def check_uv() -> bool:
    """检查是否安装了 uv。"""
    try:
        subprocess.run(["uv", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def install_dependencies() -> bool:
    """安装项目依赖。"""
    print("📦 正在检查依赖...")
    try:
        # 使用 uv sync 同步依赖
        result = subprocess.run(
            ["uv", "sync"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent
        )
        if result.returncode != 0:
            print(f"❌ 依赖安装失败: {result.stderr}")
            return False
        print("✅ 依赖检查完成")
        return True
    except Exception as e:
        print(f"❌ 依赖安装出错: {e}")
        return False


def start_server() -> subprocess.Popen:
    """启动 uvicorn 服务器。"""
    print("🚀 正在启动 Web 服务器...")

    # 使用 uv run 运行 uvicorn
    process = subprocess.Popen(
        [
            "uv", "run", "uvicorn",
            "src.web.main:create_app",
            "--factory",
            "--host", "127.0.0.1",
            "--port", "8000",
            "--reload",
            "--reload-dir", "src"
        ],
        cwd=Path(__file__).parent,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    return process


def wait_for_server(timeout: int = 30) -> bool:
    """等待服务器启动。"""
    import urllib.request

    print("⏳ 等待服务器就绪...")
    start_time = time.time()

    while time.time() - start_time < timeout:
        try:
            urllib.request.urlopen("http://127.0.0.1:8000", timeout=1)
            print("✅ 服务器已就绪")
            return True
        except:
            time.sleep(0.5)

    print("❌ 等待服务器超时")
    return False


def open_browser():
    """打开浏览器。"""
    print("🌐 正在打开浏览器...")
    webbrowser.open("http://127.0.0.1:8000")


def main():
    """主函数。"""
    print("=" * 50)
    print("Icon Crawler Web UI 启动器")
    print("=" * 50)
    print()

    # 检查 uv
    if not check_uv():
        print("❌ 未检测到 uv 包管理器")
        print("请先安装 uv: https://github.com/astral-sh/uv")
        sys.exit(1)

    print("✅ 检测到 uv 包管理器")
    print()

    # 安装依赖
    if not install_dependencies():
        print("❌ 依赖安装失败，请手动运行: uv sync")
        sys.exit(1)

    print()

    # 启动服务器
    try:
        process = start_server()

        # 等待服务器就绪
        if wait_for_server():
            print()
            open_browser()
            print()
            print("=" * 50)
            print("Web UI 已启动!")
            print("访问地址: http://127.0.0.1:8000")
            print("按 Ctrl+C 停止服务")
            print("=" * 50)

            # 实时输出服务器日志
            for line in process.stdout:
                print(line, end='')
        else:
            print("❌ 服务器启动失败")
            process.terminate()
            sys.exit(1)

    except KeyboardInterrupt:
        print()
        print("\n👋 正在停止服务...")
        if 'process' in locals():
            process.terminate()
        print("✅ 服务已停止")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        if 'process' in locals():
            process.terminate()
        sys.exit(1)


if __name__ == "__main__":
    main()
