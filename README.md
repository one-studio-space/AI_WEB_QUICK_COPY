# AI Quick Copy v1.1.2

Chrome/Edge extension để copy **response AI gần nhất dưới dạng Markdown**.

## ✨ v1.1.2 fixes

### ChatGPT (layout 2026)

ChatGPT đang rollout UI mới (Chat / Work) và **bỏ** nhiều attribute cũ:

- `data-message-author-role`
- `data-testid^="conversation-turn-"`

v1.1.2 thêm selector cho layout mới:

- `[data-content-search-unit-key$=":assistant"]`
- `[data-turn-key]`
- `[data-turn="assistant"]`
- ưu tiên node `.markdown` / `.prose` để Markdown sạch hơn

### Markdown (từ v1.1)

## ✨ v1.1 fixes

### Markdown

v1.0 dùng `innerText`, nên:

```text
# Heading
> Quote
- List
```

bị biến thành plain text.

v1.1 thêm `markdown.js` để serialize DOM thành Markdown:

- `h1`–`h6` → `#`–`######`
- `blockquote` → `>`
- `ul` / `ol` → Markdown list
- `strong` / `b` → `**bold**`
- `em` / `i` → `*italic*`
- `del` / `s` → `~~strike~~`
- `code` → inline code
- `pre > code` → fenced code block
- `a` → `[text](url)`
- `table` → Markdown table
- `hr` → `---`

### ChatGPT

v1.0 phụ thuộc quá nhiều vào một selector.

v1.1 có:

1. nhiều selector chính;
2. lọc element visible;
3. tránh nested assistant elements;
4. heuristic fallback trong `main article` / conversation turns.

## ⌨️ Hotkey

Windows/Linux:

**Ctrl + Q**

macOS:

**Command + Q**

Nếu browser giữ shortcut:

```text
chrome://extensions/shortcuts
```

hoặc trên Edge:

```text
edge://extensions/shortcuts
```

rồi đổi shortcut.

## 📦 Cài đặt

1. Giải nén ZIP.
2. Mở `chrome://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked**.
5. Chọn thư mục `AI_Quick_Copy_v1.1`.
6. Refresh các tab ChatGPT/Gemini/Grok/Claude đang mở.
7. Nhấn **Ctrl + Q**.

> Sau khi update extension, nên refresh tab AI để content script v1.1 được nạp lại.

## 🤖 Supported sites

- `chatgpt.com`
- `chat.openai.com`
- `gemini.google.com`
- `grok.com`
- `x.com`
- `claude.ai`

## 🧱 Structure

```text
AI_Quick_Copy_v1.1/
│
├── manifest.json
├── service-worker.js
├── core.js
├── markdown.js
├── content.js
│
├── sites/
│   ├── chatgpt.js
│   ├── gemini.js
│   ├── grok.js
│   └── claude.js
│
├── options.html
├── options.css
├── options.js
│
├── README.md
├── CHANGELOG.md
└── docs/
    └── ARCHITECTURE.md
```

## 🧩 Responsibility

| File | Responsibility |
|---|---|
| `manifest.json` | Extension declaration |
| `service-worker.js` | Browser command routing |
| `core.js` | Shared DOM + clipboard + toast |
| `markdown.js` | DOM → Markdown |
| `content.js` | Main orchestration + fallback hotkey |
| `sites/chatgpt.js` | ChatGPT response detection |
| `sites/gemini.js` | Gemini response detection |
| `sites/grok.js` | Grok response detection |
| `sites/claude.js` | Claude response detection |
| `options.*` | Settings page |

## 🧪 Test

### ChatGPT

Try a response containing:

```markdown
# Heading

Normal paragraph.

> Quote

- Item A
- Item B

**Bold**

`inline code`

```js
console.log("test");
```

| A | B |
|---|---|
| 1 | 2 |
```

Press `Ctrl + Q`, then paste into VS Code, Notepad++, Obsidian or another Markdown editor.

### Gemini / Grok / Claude

Run the same test.

## ⚠️ UI changes

AI websites can change their DOM at any time.

If an AI stops working, first identify the affected adapter:

```text
ChatGPT → sites/chatgpt.js
Gemini  → sites/gemini.js
Grok    → sites/grok.js
Claude  → sites/claude.js
```

Do not modify `markdown.js` just because an AI selector stopped matching. Detection and Markdown serialization are intentionally separated.

## 🔐 Permissions

No API key.

No backend.

No analytics.

No external network requests.

No history/cookies/bookmarks access.

No Administrator permission.

The content script only matches the supported AI domains declared in `manifest.json`.

## 🚀 Future

Potential v1.2:

- Wait for streaming response to finish.
- Better code-language detection.
- Better table handling.
- Copy as Markdown / Plain Text modes.
- Popup with current detected AI.
- Debug mode showing which selector matched.

Potential v2:

- Cross-AI transfer workflow.
- Windows global hotkey helper.
- Optional clipboard history.
