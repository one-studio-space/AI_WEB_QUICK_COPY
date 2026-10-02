# AI Quick Copy Architecture — v1.3

```text
Browser Command
      │
      ▼
service-worker.js
      │
      ▼
content.js
      │
      ▼
selection? ──yes──► selected passage (excerpt)
      │ no
      ▼
site adapter → all responses
      │
      ▼
core.js → pick the one on screen (else the latest)
      │
      ▼
core.js → clone / cleanup
      │
      ▼
markdown.js
      │
      ▼
block.js (if identity blocks are on)
      │
      ▼
Markdown string
      │
      ▼
Clipboard
```

## Separation of responsibilities

### `sites/*.js`

Only answer:

> Where are the AI responses on this page?

Adapters return every response they find (`findAll()`); they do not decide which one to copy. `core.js` picks the one on screen (`pickInView`), falling back to the latest (`pickLatest`).

Each adapter also exposes its identity (`id`, `name`, `icon`), used for the identity block.

They should not contain clipboard logic or Markdown serialization.

### `markdown.js`

Only answer:

> How do we convert this response DOM into Markdown?

It should not know whether the source is ChatGPT, Gemini, Grok or Claude.

### `block.js`

Wraps the Markdown in an identity block (AI name, role, source, timestamp, footer). It receives the adapter's `id` / `name` / `icon` as plain data and does not know how the response was found.

### `settings.js`

Loads and saves user settings (`chrome.storage.sync`). Shared by the content scripts and the options page. Only settings are stored, never copied content.

### `core.js`

Shared browser utilities:

- visibility checks
- selector helpers
- picking the response on screen / the latest one
- reading the user's selection
- DOM clone/cleanup
- clipboard
- toast

### `content.js`

Coordinates the workflow.

## Hotkey

Two routes exist:

```text
Ctrl+Q
 ├── Chrome Commands API → service worker → content script
 └── in-page keydown fallback → content script
```

A 500ms guard prevents duplicate execution.

## Why not use `innerText`?

`innerText` loses semantic information.

For example:

```html
<h2>Section</h2>
<blockquote>Important</blockquote>
<pre><code>print("x")</code></pre>
```

becomes plain text.

The serializer reads the DOM tags and reconstructs Markdown instead.
