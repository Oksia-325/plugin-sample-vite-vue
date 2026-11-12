# Icon8Sync

Sync your [Icons8](https://icons8.com/) personal collection icons into the SiYuan emoji library (`data/emojis/`).

## Features

- **Incremental sync** — only collections with new remote icons are processed
- **Full sync** — process every collection; still respects the “Skip synced icons” option
- **Collection overview** — totals, local counts, pending updates and failures load when the dialog opens
- **Per-collection retry** — retry only the failed collection instead of running everything again
- **Persistent results** — last sync time, failed collections and exact progress survive reopening the dialog
- **Light / dark theme** — the UI follows SiYuan’s theme automatically
- **One-click login (Linux desktop)** — reads the current Icons8 session from local Firefox via a temporary headless browser profile
- **Test connection** — validate the token without saving it
- **Auto proxy** — prefer the system proxy for Icons8 API requests, with automatic fallback to SiYuan’s kernel proxy
- **Incremental cache options** — skip already-synced icons and optionally reload the emoji list after syncing
- Concurrent downloads, filename sanitization and `(1)`-style deduplication
- Collections are mirrored as lowercase emoji folders, ready for the SiYuan emoji picker

`Favorites` and `Downloaded` collections are ignored. Synchronization is one-way: icons that only exist locally are left untouched.

## Requirements

- SiYuan 3.8.1 or later
- An Icons8 account
- One-click login requires **Linux desktop SiYuan** and **Firefox signed in to icons8.com**
  - Windows and other platforms show a manual-token hint instead

## Usage

1. Enable the plugin and click the topbar image icon, or open `Settings → Marketplace → Icon8Sync → Settings`.
2. In the **Settings** tab, configure the token:
   - Manual: sign in at icons8.com → press F12 → Network panel → open any request → copy the `Authorization` request header value (`Bearer` prefix optional).
   - Linux + Firefox: click **One-click login** to read the current Firefox session automatically.
3. Click **Test connection** if you want to validate without saving, then **Verify & Save**.
4. In the **Sync** tab:
   - **Start incremental sync** for daily use.
   - **Start full sync** to process every collection.
   - Use **Retry** on a failed card to sync only that collection.

## Options

| Option | Description |
| --- | --- |
| Skip synced icons | Only download icons that are missing locally. Disable to re-download every icon during a full sync. |
| Auto refresh icon cache | Reload the emoji picker immediately after sync. Disable if you prefer to restart SiYuan manually. |
| Auto-select proxy | Prefer the system proxy for Icons8 API requests; fall back to SiYuan’s kernel proxy when direct access fails. |

## Notes

- Incremental sync detects changes by comparing the remote collection’s icon count with the local manifest. If icons were replaced without changing the count, use full sync to refresh them.
- One-click login copies the latest Firefox cookie/profile files to a temporary directory, launches headless Firefox, reads the Icons8 token, and removes the temporary directory. Tokens are never logged or uploaded elsewhere.
- Failure to reach `api-icons.icons8.com` through SiYuan’s kernel proxy can usually be fixed by enabling **Auto-select proxy**.
- Local-only emoji files are never deleted by this plugin.

## Development

```bash
pnpm i
cp .env.example .env   # set VITE_SIYUAN_WORKSPACE_PATH
pnpm dev               # watch build into <workspace>/data/plugins/icon8-sync
pnpm build             # dist/ + package.zip
```
