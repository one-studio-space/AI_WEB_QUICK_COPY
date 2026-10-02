# Changelog

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
