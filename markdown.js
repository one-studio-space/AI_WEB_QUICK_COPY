/**
 * AI Quick Copy v1.1
 * Responsibility: convert an AI response DOM subtree into Markdown.
 *
 * This is deliberately independent from each AI adapter.
 */

(() => {
  const AQC = window.AIQuickCopy;

  const escapeInline = (text) => {
    return text
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n");
  };

  const getDirectText = (node) => {
    let result = "";

    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.nodeValue || "";
      }
    }

    return result;
  };

  const languageFromClass = (element) => {
    const classes = [...(element.classList || [])];
    const match = classes.find((name) =>
      /^(language-|lang-)/i.test(name)
    );

    if (!match) return "";

    return match.replace(/^language-/i, "").replace(/^lang-/i, "");
  };

  // Placeholders survive the final whitespace cleanup:
  // INDENT marks list indentation, CODE wraps the index of a stored code block.
  const INDENT = "\u0001";
  const CODE = "\u0002";

  // Labels AI sites show above code blocks ("PowerShell", "Plain text"...)
  // mapped to fenced-code language ids.
  const LANGUAGE_LABELS = {
    "plain text": "text", plaintext: "text", text: "text",
    bash: "bash", sh: "sh", shell: "shell", zsh: "zsh", console: "console",
    terminal: "bash", powershell: "powershell", ps1: "powershell",
    dos: "bat", batch: "bat", bat: "bat", cmd: "bat",
    python: "python", py: "python", javascript: "javascript", js: "javascript",
    typescript: "typescript", ts: "typescript", jsx: "jsx", tsx: "tsx",
    json: "json", html: "html", xml: "xml", css: "css", scss: "scss",
    sql: "sql", java: "java", kotlin: "kotlin", swift: "swift",
    c: "c", "c++": "cpp", cpp: "cpp", "c#": "csharp", csharp: "csharp",
    go: "go", golang: "go", rust: "rust", php: "php", ruby: "ruby",
    yaml: "yaml", yml: "yaml", toml: "toml", ini: "ini",
    markdown: "markdown", md: "markdown", dockerfile: "dockerfile",
    makefile: "makefile", diff: "diff", lua: "lua", r: "r", dart: "dart",
    scala: "scala", perl: "perl", graphql: "graphql", vue: "vue",
    svelte: "svelte", gradle: "gradle", groovy: "groovy", nginx: "nginx",
    latex: "latex", tex: "latex", vba: "vba", "objective-c": "objectivec",
    haskell: "haskell", elixir: "elixir", erlang: "erlang", clojure: "clojure",
    "f#": "fsharp", fsharp: "fsharp", ocaml: "ocaml", julia: "julia", zig: "zig",
    nim: "nim", hcl: "hcl", terraform: "hcl", cmake: "cmake", nix: "nix",
    assembly: "asm", asm: "asm", matlab: "matlab", solidity: "solidity",
    prisma: "prisma", protobuf: "protobuf", csv: "csv", properties: "properties",
    // Generic labels: remove them, but they say nothing about the language.
    code: "", snippet: "", "code snippet": ""
  };

  // Elements whose text is part of the answer itself. A language label is
  // never taken from (or inside) one of these.
  const CONTENT_TAGS = new Set([
    "p", "li", "ul", "ol", "td", "th", "table", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i",
    "a", "del", "s", "dt", "dd", "caption"
  ]);

  const tagOf = (element) => element.tagName.toLowerCase();

  // A single short token such as "Haskell", "F#" or "C++" (no dots, so
  // file names like "main.py" never qualify).
  const LABEL_TOKEN = /^[a-z][a-z0-9+#\-]{0,15}$/i;

  // Inline elements that are answer content even outside CONTENT_TAGS.
  const NEVER_LABEL_TAGS = new Set(["code", "kbd", "samp", "var", "mark"]);

  const labelToLanguage = (text) => {
    const key = (text || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(LANGUAGE_LABELS, key)
      ? LANGUAGE_LABELS[key]
      : null;
  };

  const isInsidePre = (element) => Boolean(element.parentElement?.closest("pre"));

  // A code block is a <pre>, or a multi-line <code> outside any <pre>
  // (some sites render blocks without <pre>).
  const findCodeBlocks = (root) => {
    return [...root.querySelectorAll("pre, code")].filter((element) => {
      if (element.tagName.toLowerCase() === "pre") return !isInsidePre(element);
      return !element.closest("pre") && (element.textContent || "").includes("\n");
    });
  };

  /**
   * Evidence that an element is site UI rather than answer text: within the
   * code block's wrapper there was a copy button (marked before buttons are
   * stripped), or the element lives inside the <pre>.
   */
  const isSiteUi = (element, stop) => {
    for (let node = element; node; node = node.parentElement) {
      if (node.hasAttribute("data-aqc-ui") || node.querySelector("[data-aqc-ui]")) return true;
      if (tagOf(node) === "pre") return true;
      if (node === stop) break;
    }
    return false;
  };

  /**
   * Decide whether `text` is the language label of a code block.
   * Returns the language id, or null to leave the element alone:
   * answer text is never removed without copy-button evidence.
   */
  const labelLanguage = (element, text, stop) => {
    if (NEVER_LABEL_TAGS.has(tagOf(element))) return null;
    if (!isSiteUi(element, stop)) return null;

    const known = labelToLanguage(text);
    if (known !== null) return known;

    return LABEL_TOKEN.test(text) ? text.toLowerCase() : null;
  };

  /**
   * A label inside the code block's own wrapper (e.g. a header holding the
   * language name, a file name and a copy button). The wrapper must not hold
   * any answer content besides the code; only the element with label
   * evidence is removed, other header text (file names) is kept.
   */
  const findWrapperLabel = (wrapper, body) => {
    if (wrapper === body) return null;

    const outsideCode = (element) => !body.contains(element) && !element.contains(body);
    const contentSelector = [...CONTENT_TAGS, ...NEVER_LABEL_TAGS].join(",");

    if ([...wrapper.querySelectorAll(contentSelector)].some(outsideCode)) return null;

    const leaves = [...wrapper.querySelectorAll("*")].filter((element) => {
      return (
        element.children.length === 0 &&
        outsideCode(element) &&
        (element.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        (element.textContent || "").trim()
      );
    });

    for (const label of leaves) {
      const language = labelLanguage(label, label.textContent.trim(), wrapper);
      if (language !== null) return { label, language };
    }

    return null;
  };

  // A label rendered as the element right before the code block,
  // e.g. <div class="text-xs">Plain text</div><code>...</code>.
  const findSiblingLabel = (node, body) => {
    const previous = node.previousElementSibling;

    if (!previous || CONTENT_TAGS.has(tagOf(previous))) return null;
    if (previous.querySelector(["pre", "code", "img", ...NEVER_LABEL_TAGS, ...CONTENT_TAGS].join(","))) return null;

    const text = (previous.textContent || "").trim();
    if (!text) return null;

    // The label element itself (or its children) held the copy button.
    const language = labelLanguage(previous, text, previous);
    return language !== null ? { label: previous, language } : null;
  };

  /**
   * Work out each code block's language and remove the site's language label
   * so it is not copied as a stray line. Stores the result in data-aqc-lang.
   * Never removes text from paragraphs, list items, table cells or quotes.
   */
  const annotateCodeBlocks = (root) => {
    const blocks = findCodeBlocks(root);

    for (const block of blocks) {
      const body = tagOf(block) === "pre"
        ? (block.querySelector("code") || block)
        : block;

      let language =
        languageFromClass(body) ||
        languageFromClass(block) ||
        body.getAttribute("data-language") ||
        block.getAttribute("data-language") ||
        "";

      // Walk up from the block through wrappers that hold only this block.
      let node = block;

      for (let depth = 0; node && node !== root && depth < 6; depth++) {
        if (node !== block &&
            (CONTENT_TAGS.has(tagOf(node)) ||
             blocks.some((other) => other !== block && node.contains(other)))) {
          break;
        }

        const found = findWrapperLabel(node, body) || findSiblingLabel(node, body);

        if (found) {
          language = language || found.language;
          found.label.remove();
          break;
        }

        node = node.parentElement;
      }

      block.setAttribute("data-aqc-lang", language.toLowerCase());
    }
  };

  // Inline code span; content with backticks gets a longer delimiter.
  const codeSpan = (content) => {
    const runs = content.match(/`+/g) || [];
    if (!runs.length) return `\`${content}\``;

    const ticks = "`".repeat(Math.max(...runs.map((run) => run.length)) + 1);
    return `${ticks} ${content} ${ticks}`;
  };

  const renderFence = ({ language, source }) => {
    // Use a longer fence if the code itself contains ```.
    const longest = Math.max(2, ...(source.match(/`+/g) || []).map((run) => run.length));
    const fence = "`".repeat(Math.max(3, longest + 1));

    return [`${fence}${language}`, ...source.replace(/\n+$/, "").split("\n"), fence];
  };

  const serialize = (root, { headingOffset = 0 } = {}) => {
    const codeBlocks = [];

    const storeCode = (language, source) => {
      // Normalize line endings and non-breaking spaces so code stays runnable.
      source = source.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
      codeBlocks.push({ language, source });
      return `\n\n${CODE}${codeBlocks.length - 1}${CODE}\n\n`;
    };

    annotateCodeBlocks(root);

    // Keep spaces that sit inside the tag (<strong>Note: </strong>keep)
    // outside the markers, where Markdown needs them.
    const wrapInline = (raw, marker) => {
      const content = raw.trim();
      if (!content) return raw.replace(/\S/g, "");

      const lead = raw.match(/^\s*/)[0] ? " " : "";
      const trail = raw.match(/\s*$/)[0] ? " " : "";

      return `${lead}${marker}${content}${marker}${trail}`;
    };

    // Code blocks can't live in a table cell; render them as inline code.
    const inlineCode = (text) => {
      return text
        .replace(/\u0002(\d+)\u0002/g, (_, index) => {
          return codeSpan(codeBlocks[Number(index)].source.trim().replace(/\s*\n\s*/g, " "));
        })
        .replace(/\u0001/g, "");
    };

    const walk = (node, context = {}) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeInline(node.nodeValue || "");
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const tag = node.tagName.toLowerCase();

      if ([
        "script", "style", "noscript", "svg", "button", "input",
        "textarea", "select", "video", "audio"
      ].includes(tag)) {
        return "";
      }

      if (tag === "br") return "\n";

      if (tag === "hr") return "\n\n---\n\n";

      if (tag === "pre") {
        const code = node.querySelector("code");
        const source = code ? (code.textContent || "") : (node.textContent || "");

        return storeCode(node.getAttribute("data-aqc-lang") || "", source);
      }

      if (/^h[1-6]$/.test(tag)) {
        // Shift headings down when the response sits under a block title.
        const level = Math.min(Number(tag.substring(1)) + headingOffset, 6);
        const content = serializeChildren(node).trim();
        return `\n\n${"#".repeat(level)} ${content}\n\n`;
      }

      if (tag === "blockquote") {
        const content = serializeChildren(node)
          .replace(/\n{3,}/g, "\n\n")
          .trim()
          .split("\n")
          .map((line) => line.trim() ? `> ${line}` : ">")
          .join("\n");

        return `\n\n${content}\n\n`;
      }

      if (tag === "strong" || tag === "b") {
        return wrapInline(serializeChildren(node), "**");
      }

      if (tag === "em" || tag === "i") {
        return wrapInline(serializeChildren(node), "*");
      }

      if (tag === "del" || tag === "s" || tag === "strike") {
        return wrapInline(serializeChildren(node), "~~");
      }

      if (tag === "code" && node.hasAttribute("data-aqc-lang")) {
        return storeCode(node.getAttribute("data-aqc-lang"), node.textContent || "");
      }

      if (tag === "code" && node.parentElement?.tagName.toLowerCase() !== "pre") {
        return codeSpan((node.textContent || "").replace(/\u00a0/g, " "));
      }

      if (tag === "a") {
        const content = serializeChildren(node).trim();
        const href = node.getAttribute("href");

        if (href && content) {
          return `[${content}](${href})`;
        }

        return content;
      }

      if (tag === "img") {
        const alt = node.getAttribute("alt") || "";
        const src = node.getAttribute("src") || "";

        return src
          ? `![${alt}](${src})`
          : "";
      }

      if (tag === "ul" || tag === "ol") {
        const ordered = tag === "ol";
        const start = parseInt(node.getAttribute("start"), 10);
        let index = Number.isNaN(start) ? 1 : start;

        const lines = [...node.children]
          .filter((child) => child.tagName.toLowerCase() === "li")
          .map((li) => {
            const prefix = ordered ? `${index++}. ` : "- ";
            const indent = INDENT.repeat(prefix.length);

            // Indent continuation lines so nested lists and code blocks
            // stay inside this item.
            const content = serializeListItem(li)
              .replace(/\n{3,}/g, "\n\n")
              .trim()
              .split("\n")
              .map((line, i) => (i === 0 || !line.trim() ? line : indent + line))
              .join("\n");

            return `${prefix}${content}`;
          });

        return `\n\n${lines.join("\n")}\n\n`;
      }

      if (tag === "li") {
        return serializeChildren(node);
      }

      if (tag === "table") {
        return serializeTable(node);
      }

      if (tag === "p") {
        const content = serializeChildren(node).trim();
        return content ? `\n\n${content}\n\n` : "";
      }

      if (tag === "div" || tag === "section" || tag === "article" ||
          tag === "main" || tag === "header" || tag === "footer") {
        const content = serializeChildren(node);

        // Preserve block separation without blindly adding a newline
        // after every nested div.
        return `\n${content}\n`;
      }

      return serializeChildren(node);
    };

    const serializeChildren = (element) => {
      return [...element.childNodes].map((child) => walk(child)).join("");
    };

    const serializeListItem = (li) => {
      const parts = [];

      for (const child of li.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE &&
            (child.tagName.toLowerCase() === "ul" ||
             child.tagName.toLowerCase() === "ol")) {
          const nested = walk(child).trim();

          if (nested) {
            // Attach the sub-list directly under the item text (tight list).
            const before = parts.join("").replace(/\s+$/, "");
            parts.length = 0;
            parts.push(before, `\n${nested}`);
          }
        } else {
          parts.push(walk(child));
        }
      }

      return parts.join("");
    };

    const serializeTable = (table) => {
      const rows = [...table.querySelectorAll("tr")];
      if (!rows.length) return "";

      const parsed = rows.map((row) =>
        [...row.children].map((cell) =>
          inlineCode(serializeChildren(cell))
            .replace(/\n+/g, " ")
            .replace(/\|/g, "\\|")
            .trim()
        )
      );

      const width = Math.max(...parsed.map((row) => row.length), 0);
      if (!width) return "";

      const normalized = parsed.map((row) => {
        while (row.length < width) row.push("");
        return row;
      });

      const header = normalized[0];
      const divider = header.map(() => "---");

      const lines = [
        `| ${header.join(" | ")} |`,
        `| ${divider.join(" | ")} |`,
        ...normalized.slice(1).map((row) => `| ${row.join(" | ")} |`)
      ];

      return `\n\n${lines.join("\n")}\n\n`;
    };

    let result = serializeChildren(root);

    // Clean up whitespace while preserving Markdown structure.
    // Code blocks are still placeholders here, so their indentation is safe.
    result = result
      .replace(/[ \t]+\n/g, "\n")
      .replace(/(^|\n)(\u0001*)[ \t]+/g, "$1$2")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Put the code blocks back, indented to match any enclosing list item.
    result = result.replace(
      /^(.*?)\u0002(\d+)\u0002$/gm,
      (_, lead, index) => {
        // Following lines keep quote markers ("> ") but replace
        // list markers ("- ", "1. ") with spaces.
        const pad = lead.replace(/(\d+\.|[-*+])(?= )/g, (marker) => " ".repeat(marker.length));
        const blankPad = pad.replace(/[ \u0001]+$/, "");

        return renderFence(codeBlocks[Number(index)])
          .map((line, i) => (i === 0 ? lead + line : (line ? pad + line : blankPad)))
          .join("\n");
      }
    );

    return result.replace(/\u0001/g, " ");
  };

  AQC.toMarkdown = (element, options = {}) => {
    if (!element) return "";

    const clone = AQC.getClone(element);
    if (!clone) return "";

    return serialize(clone, options);
  };
})();