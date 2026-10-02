# AI Quick Copy Architecture — v1.1

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
site adapter
      │
      ▼
DOM response
      │
      ▼
core.js → clone / cleanup
      │
      ▼
markdown.js
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

> Where is the latest AI response?

They should not contain clipboard logic or Markdown serialization.

### `markdown.js`

Only answer:

> How do we convert this response DOM into Markdown?

It should not know whether the source is ChatGPT, Gemini, Grok or Claude.

### `core.js`

Shared browser utilities:

- visibility checks
- selector helpers
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
