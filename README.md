# Pigo Picbed

[简体中文](./README.zh-CN.md)

A personal S3-compatible picture bed plugin for [SiYuan](https://b3log.org/siyuan), built with Vite + Vue.

> Status: `0.1.0` — single S3 bucket, built-in upload pipeline, statistics, two-way sync and safe cleanup.

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
- **Statistics** — current doc or whole workspace: total/unique/local/S3/remote/data/title/pending counts.
- **Two-way S3 sync** — matched, S3-only, note-only (broken), not uploaded, outside prefix.
- **Safe cleanup** — deletes only unreferenced objects inside the upload prefix, with two confirmations.
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

Open **Pigo → Settings** and fill in:

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

- **Upload** tab: scan the current document, then upload unuploaded images, force re-upload, repair unreplaced links, or upload all notes.
- **Paste**: paste images directly into the editor.
- **Right-click** an image → Plugins → Upload to Pigo Picbed.

Uploaded images are recorded in the document's `custom-picgo-file-map-key` so they can be reused and repaired.

### Statistics

- Current document or whole workspace.
- Shows total references, unique images, local, S3, remote, data URI, title images, and “uploaded but not replaced”.
- Export JSON/CSV.
- “Repair unreplaced links” replaces links using existing fileMap records without uploading again.

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

- Only objects with no evidence
- Only inside the static upload prefix
- Never `_pigo_test/`
- Never folder markers
- First confirmation shows count + first 20 keys
- Second confirmation requires typing `DELETE`
- Fails stop immediately

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
