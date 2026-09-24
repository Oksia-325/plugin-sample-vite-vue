# Icon8Sync

Incrementally sync your [Icons8](https://icons8.com/) personal collection icons into the SiYuan emoji library (`data/emojis/`).

## Features

- One-click incremental sync: only new icons are downloaded (manifest keyed by icon ID)
- Collections mirrored as emoji folders (lowercased), ready to use in SiYuan emoji picker
- Authorization token configured in a settings dialog — no config file editing needed
- Token verification before saving (real API call, 401 aware)
- Concurrent downloads with throttling, filename sanitization and `(1)`-style dedup
- Emojis list auto-reload after sync (falls back to restart hint)

## Usage

1. Enable the plugin, click the topbar image icon (or `Settings → Markets → Icon8Sync → Settings`).
2. Open the **Settings** tab, paste your Icons8 `Authorization`:
   - Sign in at icons8.com → press F12 → Network panel → pick any request → copy the `Authorization` request header value (Bearer prefix optional).
3. Click **Verify & Save**.
4. Open the **Sync** tab and click **Start Sync**.

"Favorites" and "Downloaded" collections are ignored. Icons deleted remotely are kept locally.

## Development

```bash
pnpm i
cp .env.example .env   # set VITE_SIYUAN_WORKSPACE_PATH
pnpm dev               # watch build into <workspace>/data/plugins/icon8-sync
pnpm build             # dist/ + package.zip
```
