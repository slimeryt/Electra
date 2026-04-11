# Changelog

## 1.13.1

### Changed

- **Forum HTTP API**: nested `GET|POST /channels/:id/forum/posts/:postId/messages`, list response `{ posts, has_more }`, stricter `limit` / cursor validation, `INVALID_CURSOR` and other error `code` fields, title/body length limits.
- **Errors**: global handler includes optional `code` on JSON 4xx/5xx when set.

## 1.13.0

### Added

- **Forum channels**: new channel type with a post list, per-post threads (messages + realtime), create-post flow, and admin creation from the sidebar / channel create modal.
- Desktop release version bumped to **1.13.0** (see `packages/desktop/package.json`).

### Notes

- Deploy the backend (with DB migrations) before shipping clients that use forum channels.
