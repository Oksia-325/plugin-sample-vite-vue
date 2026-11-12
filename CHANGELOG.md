# Changelog

## Unreleased

### Added

* New light/dark plugin UI with a collection overview dashboard
* Incremental sync and full sync modes
* Per-collection retry without resyncing everything
* Persistent sync results, last-sync time and restored failure cards
* Exact per-collection download progress
* Linux + Firefox one-click login (manual token fallback on Windows and other platforms)
* Auto-select proxy option (system proxy first, SiYuan kernel proxy fallback)
* Test connection action that validates without saving
* Settings for skipping synced icons and auto-refreshing the emoji cache

### Changed

* Token verification now updates the service status immediately on failure
* Removed the misleading “deleted remotely” hint; synchronization is strictly one-way
* Redesigned icon-size dropdown and migrated the UI to the bundled icon set

## v0.0.1

* [Support optional marketplace images, offline README assets, and stable releases](https://github.com/siyuan-note/siyuan/issues/19056)
* Align the manifest URL with the current repository
