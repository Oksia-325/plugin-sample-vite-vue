# Pigo Picbed

[简体中文](./README.zh-CN.md)

A personal S3-compatible picture bed plugin for [SiYuan](https://b3log.org/siyuan), built with Vite + Vue.

> Status: `0.2.1` — redesigned four-tab UI (Upload / Stats / Sync / Settings), built-in upload pipeline, S3 health check, two-way sync and safe cleanup.

## Features

- **Single S3 bucket** — works with any S3-compatible storage (Tencent COS, AWS S3, MinIO, etc.).
- **Built-in uploader** — no external PicGo/PicList process required.
- **Image sources** — local `assets/...`, remote `http(s)` images, `data:` URIs, and existing S3 images.
- **Title images** — recognizes `title-img` and uploads/replaces it.
- **GIF / SVG / WebP / AVIF / HEIC** — MIME detection from magic bytes.
- **Multi-image concurrency** — configurable 1–10 parallel uploads.
- **Paste takeover** — paste one or more images and upload them automatically.
- **Right-click menu** — “Upload to Pigo Picbed” on images.
- **Link replacement** — only image destinations are replaced, never body text.
- **fileMap compatibility** — keeps the old `custom-picgo-file-map-key` attribute.
- **Statistics** — 10 metrics for the current doc or whole workspace, 7 filters, search, image sizes, S3 health, CSV export.
- **Two-way S3 sync** — matched, S3-only, note-only (broken), not uploaded, outside prefix; preview any image.
- **Safe cleanup** — only unreferenced objects inside the upload prefix; revalidates each object by ETag before deletion and requires a checkbox confirmation.
- **Image preview** — click a thumbnail in Upload or “View image” in Sync to open a full-screen preview.
- **Multi-device config** — configuration is stored in SiYuan workspace `petal` storage and synced by SiYuan.

## Installation

1. Build the plugin:

   ```bash
   pnpm install
   pnpm build
   ```

2. Install `package.zip` via SiYuan: `Settings → Marketplace → Downloaded → Install`.
3. Enable **Pigo Picbed**.
4. Open the plugin from the top bar icon or the command palette.

## Configuration

Open **Pigo → Settings → S3 storage** and fill in:

| Field | Example |
|---|---|
| Endpoint | `https://cos.ap-guangzhou.myqcloud.com` |
| Region | `ap-guangzhou` |
| Bucket | `picgo-1312673255` |
| AccessKeyId | Tencent Cloud SecretId |
| SecretAccessKey | Tencent Cloud SecretKey |
| Upload path | `siyuan/{year}/{month}/{md5}.{ext}` |
| CustomUrl | `https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com` |

Click **Test Connection**. The test writes and deletes a small object under `_pigo_test/`.

### Path template variables

`{year}`, `{month}`, `{day}`, `{timestamp}`, `{timestampMS}`, `{md5}`, `{sha256}`, `{ext}`, `{filename}`, `{fullName}`

### Old PicGo config

Use **Import old PicGo config** to read `/data/storage/syp/picgo/picgo.cfg.json` from the workspace. Both `tcyun` and `awss3` are supported. Review warnings and save manually.

## Usage

### Upload

- **Upload** tab: scans the current document and shows sync progress, size/format and source.
- **Quick add**: click, drag or paste inside the panel (`Ctrl+V`); uploads return links without touching the document.
- **Batch actions**: upload local images, force re-upload, replace with S3 links.
- **Preview**: click a thumbnail to open the full-screen preview; click outside or press `Esc` to close.
- **Paste**: paste images in the editor and upload automatically when enabled.
- **Right-click** an image → Plugins → Upload to Pigo Picbed.

Uploaded images are recorded in the document's `custom-picgo-file-map-key` so they can be reused and repaired. When “replace links after upload” is off, images are uploaded without touching the document and can be fixed later from Stats.

### Statistics

- Current document or whole workspace, cached per scope while the panel is open.
- 10 metrics: total refs, unique, local, S3, remote, data URI, title images, uploaded-but-not-replaced, docs with images, asset files.
- 7 filters + search (document / path / URL / description); cards can upload, transfer or copy links.
- Thumbnails show `size | format`; click to preview.
- S3 health dot in the top-right corner; click to re-check.
- Export CSV (icon button).
- “Repair S3 links” replaces links using existing fileMap records without uploading again.
- Saving configuration invalidates stats snapshots; the next visit scans with the new config.

### S3 sync and cleanup

**Sync** compares all notes with the entire bucket:

- **Matched** — object exists and is referenced.
- **S3 only** — no reference evidence, candidate for cleanup.
- **Note only (broken)** — note points to a missing S3 object.
- **Not uploaded** — local/remote/data images.
- **Outside prefix** — object outside `uploadPath` static prefix; never deleted.

Protection evidence includes:

- S3 URLs anywhere in note Markdown/IAL (including non-image links)
- fileMap upload records
- matching local `assets/...` file names

Cleanup rules:

- Only objects with no reference evidence (S3-only)
- Only inside the static upload prefix
- Never `_pigo_test/`
- Never folder markers
- Each object is revalidated with `HEAD` before deletion; missing or ETag-changed objects are skipped
- The modal shows the prefix, protected directory and object count (no estimated freed space)
- You must tick “I have backed up and understand this is irreversible” before confirming
- A successful cleanup automatically rescans

Every sync card offers “View image” (broken note-only objects have no preview) and “Copy link”.

> **Warning:** deletion is irreversible. Export the report first, spot-check, and consider bucket versioning. Do not use cleanup if other workspaces share the same bucket.

## Development

```bash
pnpm install
pnpm dev     # needs VITE_SIYUAN_WORKSPACE_PATH in .env
pnpm test
pnpm build
```

Tests use Node's built-in test runner:

```bash
node --experimental-strip-types --test tests/*.test.mjs
```

## Privacy and security

- Access keys are stored in SiYuan workspace storage, not in the plugin bundle.
- Logs never include secret keys.
- Uploaded images use the ACL configured in settings (`public-read` by default).

## Known limits

- Mixed image + text paste takeover keeps images only; text may be lost (disabled by default).
- Right-click upload covers body images; title images use the Upload tab.
- Cleanup only knows about the current workspace.
- Very old notes whose local file names differ from S3 keys cannot be protected heuristically.

## Documents

- [开发步骤.md](./开发步骤.md) — phased plan and self-test checklist
- [Process.md](./Process.md) — development log
- [CHANGELOG.md](./CHANGELOG.md) — release notes
