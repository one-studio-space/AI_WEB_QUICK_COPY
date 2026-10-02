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

  const serialize = (root) => {
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
        const language = code ? languageFromClass(code) : languageFromClass(node);

        const fence = "```";
        return `\n\n${fence}${language}\n${source.replace(/\n+$/, "")}\n${fence}\n\n`;
      }

      if (/^h[1-6]$/.test(tag)) {
        const level = Number(tag.substring(1));
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
        let index = 1;

        const lines = [...node.children]
          .filter((child) => child.tagName.toLowerCase() === "li")
          .map((li) => {
            const content = serializeListItem(li).trim();
            const prefix = ordered ? `${index++}. ` : "- ";
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
    result = result
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();

    return result;
  };

  AQC.toMarkdown = (element) => {
    if (!element) return "";

    const clone = AQC.getClone(element);
    if (!clone) return "";

    return serialize(clone);
  };
})();