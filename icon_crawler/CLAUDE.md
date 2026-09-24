# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Icon Crawler syncs Icons8 personal collection icons locally. It has two entry points:

- **CLI**: `uv run python -m src.main` — synchronous batch download
- **Web UI** (default): `python start.py` or `uv run uvicorn src.web.main:create_app --factory --host 127.0.0.1 --port 8000`

The Web UI uses FastAPI + Jinja2 templates + SSE for real-time progress.

## Common Commands

```bash
# Install/sync dependencies
uv sync

# CLI mode
uv run python -m src.main

# Web UI mode
python start.py

# Lint
uv run ruff check src/

# Edit config (tokens, paths)
src/config.json
```

## Architecture

### Core flow

`SyncManager` (`sync_manager.py`) is the orchestrator. It coordinates three components:

- **`Icons8Client`** (`api_client.py`) — async aiohttp client for Icons8 REST API (collections, icon lists, downloads)
- **`FileManager`** (`file_manager.py`) — local filesystem operations (dir creation, path resolution, name sanitization)
- **`ManifestManager`** (`manifest_manager.py`) — manages `icons/.manifest.json`, the single source of truth for what icons exist locally

Sync is **incremental**: on each run it compares remote icon IDs (from API) against manifest entries and only downloads new ones. "Favorites" and "Downloaded" collections are skipped.

### Manifest system

`icons/.manifest.json` maps `icon_id → IconManifestEntry`. Entries include `is_manual: bool` — icons manually added to the `icons/` directory are auto-detected by `ManifestManager.scan_and_track_orphaned_files()` and given `manual_` prefixed IDs. This distinction is important: manual icons are preserved on sync even if they disappear from the remote collection.

Filename deduplication uses `ManifestManager.generate_unique_filename()` with `(1)`, `(2)` suffixes.

### Web UI state

`web/state.py` defines two singleton state managers:

- `SyncState` — tracks sync progress via `SyncProgress` and `CollectionProgress` dataclasses
- `CopyState` — tracks the "cover-copy to local_aim_dir" background task

Both feed SSE streams at `/api/sync/stream` and `/api/copy/stream`.

`web/endpoints.py` contains all FastAPI route handlers. `run_sync_task()` and `run_copy_task()` are the actual async workhorses (not FastAPI route functions themselves).

### Config

`config.py` uses Pydantic `BaseModel`. `Config.load()` reads `src/config.json` and strips any `Bearer ` prefix from the token. The config object is stored in `sync_state.config` at startup via the FastAPI lifespan handler.

## Key Patterns

- Relative imports (`from .api_client`) are used in core modules with a fallback to absolute imports — both patterns work depending on how the module is invoked
- `SyncManager` accepts an optional `progress_callback: Callable[[str, int, int], None]` for real-time progress (used by the Web UI)
- Manifest is saved incrementally every 10 downloads (`_save_threshold`) and after each collection completes
- The `icons/` directory layout mirrors collection names as subdirectories; the manifest maps icon IDs to filenames, not paths
