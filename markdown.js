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
    latex: "latex", tex: "latex", vba: "vba", "objective-c": "objectivec"
  };

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
   * Work out each code block's language and remove the site's language label
   * so it is not copied as a stray line. Stores the result in data-aqc-lang.
   */
  const annotateCodeBlocks = (root) => {
    const blocks = findCodeBlocks(root);

    for (const block of blocks) {
      const body = block.tagName.toLowerCase() === "pre"
        ? (block.querySelector("code") || block)
        : block;

      let language =
        languageFromClass(body) ||
        languageFromClass(block) ||
        body.getAttribute("data-language") ||
        block.getAttribute("data-language") ||
        "";

      // Look for a label in the block itself, then up to 3 ancestors,
      // stopping before an ancestor that holds another code block.
      let scope = block;

      for (let depth = 0; scope && scope !== root && depth < 4; depth++) {
        if (scope !== block &&
            blocks.filter((other) => scope.contains(other)).length > 1) {
          break;
        }

        const label = [...scope.querySelectorAll("*")].find((element) => {
          return (
            element.children.length === 0 &&
            !body.contains(element) &&
            !element.contains(body) &&
            labelToLanguage(element.textContent) !== null
          );
        });

        if (label) {
          language = language || labelToLanguage(label.textContent);
          label.remove();
          break;
        }

        scope = scope.parentElement;
      }

      block.setAttribute("data-aqc-lang", language.toLowerCase());
    }
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
      codeBlocks.push({ language, source });
      return `\n\n${CODE}${codeBlocks.length - 1}${CODE}\n\n`;
    };

    annotateCodeBlocks(root);

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
          .trim()
          .split("\n")
          .map((line) => line.trim() ? `> ${line}` : ">")
          .join("\n");

        return `\n\n${content}\n\n`;
      }

      if (tag === "strong" || tag === "b") {
        const content = serializeChildren(node).trim();
        return content ? `**${content}**` : "";
      }

      if (tag === "em" || tag === "i") {
        const content = serializeChildren(node).trim();
        return content ? `*${content}*` : "";
      }

      if (tag === "del" || tag === "s" || tag === "strike") {
        const content = serializeChildren(node).trim();
        return content ? `~~${content}~~` : "";
      }

      if (tag === "code" && node.hasAttribute("data-aqc-lang")) {
        return storeCode(node.getAttribute("data-aqc-lang"), node.textContent || "");
      }

      if (tag === "code" && node.parentElement?.tagName.toLowerCase() !== "pre") {
        const content = (node.textContent || "").replace(/`/g, "\\`");
        return `\`${content}\``;
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
          if (nested) parts.push(`\n${nested}`);
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
          serializeChildren(cell)
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
        const pad = " ".repeat(lead.length);

        return renderFence(codeBlocks[Number(index)])
          .map((line, i) => (i === 0 ? lead + line : (line ? pad + line : line)))
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