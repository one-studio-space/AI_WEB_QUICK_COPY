# Changelog

All notable changes to this project are documented in this file.

## 1.3.0
- `Ctrl+Q` now copies the response you are reading (the one in the middle of the screen) instead of always the latest. At the bottom of a chat this is still the latest response.
- Highlight text and press `Ctrl+Q` to copy only that passage, labeled as an excerpt. Partial selections inside code blocks stay fenced code blocks.
- When no response can be recognized, an orange tip asks you to highlight the passage and press `Ctrl+Q` again.
- Site adapters now return all responses (`findAll`); choosing which one to copy moved to `core.js`.

## 1.2.0
- Added AI identity blocks: each copy is wrapped with the AI name, optional role, source and timestamp at the top, plus an "End of answer" footer. On by default.
- Headings inside the response are shifted down two levels to nest under the block title.
- Settings page: toggle identity blocks and set a role per AI (e.g. Secretary, Dreamer, Critic Unit). Saved automatically.
- Clicking the toolbar icon now opens the settings page.
- Toast shows which AI the response was copied from.
- Added the `storage` permission (settings only; copied content is never stored).

## 1.1.3
- Changed the macOS shortcut from `Command+Q` to `Control+Q` (`MacCtrl+Q`). `Command+Q` quits the browser on macOS.
- Rewrote README in English.

## 1.1.2
- Fixed ChatGPT copying only "ChatGPT said:" screen-reader labels.
- Strip `.sr-only` / "ChatGPT said:" / "You said:" headings in DOM clone.
- Prefer real `.markdown` / `.prose` body; reject label-only nodes.

## 1.1.1
- Fixed ChatGPT adapter for the 2026 UI rollout (Chat/Work layout).
- Added support for new selectors: data-content-search-unit-key, data-turn-key, data-turn=assistant.
- Prefer .markdown / .prose content node when available for cleaner Markdown.
- Stronger user-turn exclusion so Ctrl+Q does not copy the user bubble.

## 1.1.0
- Added DOM-to-Markdown serializer.
- Added heading support.
- Added blockquote support.
- Added unordered/ordered list support.
- Added inline/fenced code support.
- Added links and tables.
- Reworked ChatGPT adapter with multiple selectors and heuristic fallback.
- Updated README and architecture docs.
- Updated UI toast to indicate Markdown output.

## 1.0.0
- Initial release.
- ChatGPT, Gemini, Grok, Claude adapters.
- Ctrl+Q shortcut.
- Browser command + in-page fallback.
- Clipboard fallback.
- Options page.
- Minimal permissions.
