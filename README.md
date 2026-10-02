# AI Quick Copy

> Copy the AI chat response you are reading as clean Markdown with a single keyboard shortcut.

![Version](https://img.shields.io/badge/version-1.3.1-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

AI Quick Copy is a lightweight Chrome / Edge extension that grabs the assistant response you are reading on ChatGPT, Gemini, Grok, or Claude and puts it on your clipboard as Markdown — headings, lists, code blocks, tables and all.

## Table of Contents

- [Features](#features)
- [AI Identity Blocks](#ai-identity-blocks)
- [Supported Sites](#supported-sites)
- [Installation](#installation)
- [Usage](#usage)
- [Privacy & Permissions](#privacy--permissions)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Changelog](#changelog)
- [License](#license)

## Features

- **One shortcut** — press `Ctrl+Q` to copy the AI response you are reading. At the bottom of a chat that is the latest one; scroll up and it copies the older answer on screen.
- **Copy just a part** — highlight any passage and press `Ctrl+Q` to copy only that, still as Markdown and labeled as an excerpt.
- **Know who wrote what** — each copy is labeled with the AI's name (and an optional role) at the top and bottom, so answers from different AIs stay distinguishable in one file.
- **Real Markdown, not plain text** — the response DOM is serialized into Markdown:

  | HTML | Markdown |
  |---|---|
  | `h1`–`h6` | `#`–`######` |
  | `blockquote` | `>` |
  | `ul` / `ol` | `-` / `1.` lists (nested supported) |
  | `strong` / `b` | `**bold**` |
  | `em` / `i` | `*italic*` |
  | `del` / `s` | `~~strike~~` |
  | `code` | `` `inline code` `` |
  | `pre > code` | fenced code block (with language when available) |
  | `a` | `[text](url)` |
  | `table` | Markdown table |
  | `hr` | `---` |

- **Clean output** — buttons, toolbars, icons and screen-reader labels (e.g. "ChatGPT said:") are stripped.
- **Resilient detection** — each site has its own adapter with multiple selectors and heuristic fallbacks.
- **100% local** — no server, no analytics, no network requests.

## AI Identity Blocks

When you paste answers from several AIs into one Markdown file, it is easy to lose track of who wrote what. By default, every copy is wrapped in an identity block:

```markdown
<!-- aqc:start ai="gemini" role="Secretary" -->
## 🟦 GEMINI · Secretary
*gemini.google.com · 2026-10-02 14:32*

...response...

*— End of answer · GEMINI · Secretary —*
<!-- aqc:end -->

---
```

- **Header and footer** show the AI name and role, so you can identify the author from either end of a long answer.
- **Color icons** make blocks easy to scan: 🟩 ChatGPT · 🟦 Gemini · ⬛ Grok · 🟧 Claude.
- **Timestamp** tells repeated answers from the same AI apart.
- **Headings inside the response are shifted down two levels** (`#` → `###`) so they nest under the block title.
- **Hidden `aqc:start` / `aqc:end` comments** do not render, but let scripts split a file back into individual answers.

### Settings

Click the extension's toolbar icon (or open its **Options** page) to:

- Turn identity blocks on or off (on by default). When off, the plain Markdown response is copied as before.
- Give each AI a role, e.g. *Secretary*, *Dreamer*, *Critic Unit*. Leave it empty to show only the AI name.

Changes are saved automatically and apply to the next copy — no tab reload needed.

## Supported Sites

| Site | Domains |
|---|---|
| ChatGPT | `chatgpt.com`, `chat.openai.com` |
| Gemini | `gemini.google.com` |
| Grok | `grok.com`, `x.com` |
| Claude | `claude.ai` |

## Installation

The extension is not yet published on the Chrome Web Store. Install it manually:

1. Download the source:
   ```bash
   git clone https://github.com/one-studio-space/AI_WEB_FAST_COPY.git
   ```
   or click **Code → Download ZIP** on GitHub and extract it.
2. Open `chrome://extensions` (or `edge://extensions` on Microsoft Edge).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project folder (the one containing `manifest.json`).
5. Refresh any ChatGPT / Gemini / Grok / Claude tabs that were already open.

> **Note:** After updating the extension, refresh your AI tabs so the new content script is loaded.

## Usage

1. Open a conversation on a supported site.
2. Press the shortcut:

   | Platform | Shortcut |
   |---|---|
   | Windows / Linux | `Ctrl` + `Q` |
   | macOS | `Control` + `Q` (not `⌘ Command` — `⌘Q` quits the browser) |

3. A toast confirms the copy and shows which AI was detected. Paste into VS Code, Obsidian, Notion, or any Markdown editor.

### What gets copied

`Ctrl+Q` picks the content in this order:

1. **Your selection** — if you highlighted text, only that passage is copied (marked as an *excerpt*).
2. **The response on screen** — the answer crossing the middle of the screen, or the one taking up the most of it.
3. **The latest response** — when no answer is on screen.

If no response can be recognized (for example after a site redesign), an orange tip appears asking you to highlight the passage and press `Ctrl+Q` again — so you can always copy, even when detection fails.

The shortcut is ignored while you are typing in an input field, so it never interferes with the chat box.

### Changing the shortcut

If the browser reserves the shortcut, or you prefer a different one, open:

- Chrome: `chrome://extensions/shortcuts`
- Edge: `edge://extensions/shortcuts`

You can also open this page from the extension's **Options** page.

## Privacy & Permissions

- No API keys
- No backend server
- No analytics or tracking
- No external network requests
- No access to history, cookies, or bookmarks
- The only permission is `storage`, used to save your settings (identity block on/off and AI roles)
- Copied responses are never stored — they go straight to your clipboard

Content scripts run only on the supported domains declared in [`manifest.json`](manifest.json). Responses are processed inside the tab and written directly to your clipboard.

## Project Structure

```text
.
├── manifest.json        # Extension declaration (Manifest V3)
├── service-worker.js    # Routes the shortcut to the active tab; icon opens settings
├── content.js           # Orchestration + in-page hotkey fallback
├── core.js              # Shared DOM helpers, clipboard, toast
├── markdown.js          # DOM → Markdown serializer
├── block.js             # Wraps Markdown in an AI identity block
├── settings.js          # Settings storage shared with the options page
├── sites/
│   ├── chatgpt.js       # ChatGPT response detection
│   ├── gemini.js        # Gemini response detection
│   ├── grok.js          # Grok response detection
│   └── claude.js        # Claude response detection
├── options.html         # Settings page
├── options.css
├── options.js
├── docs/
│   └── ARCHITECTURE.md  # Architecture overview
├── CHANGELOG.md
└── LICENSE
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full data flow.

## Troubleshooting

**Nothing happens when I press the shortcut**
- Refresh the AI tab after installing or updating the extension.
- Check `chrome://extensions/shortcuts` to make sure the shortcut is assigned and not taken by another extension.
- Click outside the chat input before pressing the shortcut.

**"Không nhận diện được câu trả lời" (response not recognized) / wrong content copied**

Highlight the passage you want and press `Ctrl+Q` again — selection copying works on every supported site regardless of its layout.

To fix detection permanently: AI websites change their DOM frequently. Identify the affected adapter and update its selectors:

| Site | Adapter |
|---|---|
| ChatGPT | `sites/chatgpt.js` |
| Gemini | `sites/gemini.js` |
| Grok | `sites/grok.js` |
| Claude | `sites/claude.js` |

Do not modify `markdown.js` just because a selector stopped matching — detection and Markdown serialization are intentionally separated.

### Quick test

Ask the AI to reply with the following, then copy it and paste into a Markdown editor:

````markdown
# Heading

Normal paragraph.

> Quote

- Item A
- Item B

**Bold** and `inline code`

```js
console.log("test");
```

| A | B |
|---|---|
| 1 | 2 |
````

## Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-change`.
3. Commit your changes with a clear message.
4. Open a pull request describing what changed and how you tested it.

When fixing a site, please keep changes inside the relevant `sites/*.js` adapter.

## Roadmap

**v1.2**
- Wait for streaming responses to finish
- Better code-language detection
- Better table handling
- Copy as Markdown / Plain Text modes
- Popup showing the detected AI site
- Debug mode showing which selector matched

**v2**
- Cross-AI transfer workflow
- Windows global hotkey helper
- Optional clipboard history

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

Released under the [MIT License](LICENSE) © 2026 one-studio-space.
