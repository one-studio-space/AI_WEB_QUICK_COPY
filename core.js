/**
 * AI Quick Copy v1.1
 * Responsibility: shared DOM, clipboard and notification utilities.
 */

(() => {
  const root = window.AIQuickCopy || {};

  root.state = {
    lastTriggerAt: 0,
    toastTimer: null
  };

  root.isVisible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  root.uniqueElements = (elements) => [
    ...new Set(elements.filter(Boolean))
  ];

  root.queryAll = (selectors) => {
    const result = [];

    for (const selector of selectors) {
      try {
        result.push(...document.querySelectorAll(selector));
      } catch (_) {
        // Stale selector: ignore.
      }
    }

    return root.uniqueElements(result);
  };

  root.pickLatest = (elements) => {
    const visible = elements.filter(root.isVisible);

    if (!visible.length) return null;

    return visible.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();

      if (ar.top !== br.top) return ar.top - br.top;
      return ar.left - br.left;
    })[visible.length - 1];
  };

  // Drop elements that contain another candidate, keeping the innermost match.
  root.innermost = (elements) => {
    return elements.filter((el) => {
      return !elements.some((other) => other !== el && el.contains(other));
    });
  };

  /**
   * Pick the response the user is currently reading:
   * 1. the one crossing the middle of the viewport;
   * 2. otherwise the one with the most height on screen;
   * 3. null when no response is on screen.
   */
  root.pickInView = (elements) => {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const middle = viewportHeight / 2;

    const onScreen = root.innermost(elements.filter(root.isVisible))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const visibleHeight =
          Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);

        return { element, rect, visibleHeight };
      })
      .filter((item) => item.visibleHeight > 0);

    if (!onScreen.length) return null;

    const atMiddle = onScreen.find(
      ({ rect }) => rect.top <= middle && rect.bottom >= middle
    );

    if (atMiddle) return atMiddle.element;

    return onScreen.sort((a, b) => b.visibleHeight - a.visibleHeight)[0].element;
  };

  /**
   * Return the current page selection as a detached element, or null.
   * A selection inside a code block keeps its <pre><code> wrapper
   * so it is still serialized as a fenced block.
   */
  root.getSelectionElement = () => {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
    if (!selection.toString().trim()) return null;

    const container = document.createElement("div");

    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      const fragment = range.cloneContents();

      let ancestor = range.commonAncestorContainer;
      if (ancestor.nodeType !== Node.ELEMENT_NODE) ancestor = ancestor.parentElement;

      const pre = ancestor?.closest?.("pre");
      const list = ancestor && ["ul", "ol"].includes(ancestor.tagName.toLowerCase())
        ? ancestor
        : null;

      if (list) {
        // Selection spans several list items: keep them in a list,
        // numbered from the first selected item.
        const listClone = list.cloneNode(false);

        if (list.tagName.toLowerCase() === "ol") {
          let first = range.startContainer;
          if (first.nodeType !== Node.ELEMENT_NODE) first = first.parentElement;
          while (first && first.parentElement !== list) first = first.parentElement;

          const start = parseInt(list.getAttribute("start"), 10);
          const offset = first ? [...list.children].indexOf(first) : 0;
          listClone.setAttribute("start", String((Number.isNaN(start) ? 1 : start) + Math.max(offset, 0)));
        }

        listClone.append(fragment);
        container.append(listClone);
      } else if (pre) {
        const preClone = pre.cloneNode(false);
        const code = pre.querySelector("code");
        const codeClone = code ? code.cloneNode(false) : null;

        if (codeClone) {
          codeClone.append(fragment);
          preClone.append(codeClone);
        } else {
          preClone.append(fragment);
        }

        container.append(preClone);
      } else {
        container.append(fragment);
      }
    }

    return container;
  };

  root.getClone = (element) => {
    if (!element) return null;

    const clone = element.cloneNode(true);

    // KaTeX renders math twice (MathML + HTML). Keep the TeX source instead.
    clone.querySelectorAll(".katex").forEach((math) => {
      const tex = math.querySelector("annotation[encoding='application/x-tex']");
      if (!tex) return;

      const display = Boolean(math.closest(".katex-display"));
      const source = (tex.textContent || "").trim();
      const target = display ? math.closest(".katex-display") : math;

      target.replaceWith(
        document.createTextNode(display ? `\n\n$$${source}$$\n\n` : `$${source}$`)
      );
    });

    // Text-only "Copy code" widgets that are not real buttons.
    clone.querySelectorAll("span, div").forEach((node) => {
      if (node.children.length === 0 &&
          /^(copy|copy code|copied!?)$/i.test((node.textContent || "").trim())) {
        node.setAttribute("data-aqc-ui-text", "");
      }
    });

    const UI_SELECTOR =
      "button, [role='button'], input, textarea, select, svg, [data-aqc-ui-text]";

    // Before removing UI controls, mark the elements around them: a language
    // label next to a copy button is site UI, not part of the answer.
    clone.querySelectorAll(UI_SELECTOR).forEach((control) => {
      let parent = control.parentElement;

      for (let i = 0; parent && parent !== clone && i < 2; i++) {
        parent.setAttribute("data-aqc-ui", "");
        parent = parent.parentElement;
      }
    });

    // Strip UI chrome + screen-reader-only labels (e.g. "ChatGPT said:")
    clone.querySelectorAll(
      UI_SELECTOR + ", img, video, audio, " +
      "[aria-hidden='true'], [data-testid*='toolbar'], " +
      "[class*='toolbar'], [class*='actions'], " +
      ".sr-only, [class*='sr-only'], [class*='screen-reader'], " +
      "[class*='visually-hidden'], [class*='visuallyHidden']"
    ).forEach((node) => node.remove());

    // ChatGPT injects off-screen h* labels like "ChatGPT said:" / "You said:"
    clone.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
      const t = (heading.textContent || "").trim().toLowerCase();
      if (
        /^(chatgpt|you|assistant|user)\s+said\s*:?$/.test(t) ||
        t === "chatgpt said" ||
        t === "you said"
      ) {
        heading.remove();
      }
    });

    return clone;
  };

  root.normalizeText = (value) => {
    if (!value) return "";

    return value
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  };

  root.copyText = async (text, successMessage = "⚡ Đã copy AI response · Markdown") => {
    if (!text) {
      root.showToast("Không tìm thấy nội dung để copy.", "error");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      root.showToast(successMessage);
      return true;
    } catch (_) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const ok = document.execCommand("copy");
        textarea.remove();

        if (ok) {
          root.showToast(successMessage);
          return true;
        }
      } catch (_) {}

      root.showToast("Không thể copy. Hãy thử lại.", "error");
      return false;
    }
  };

  const TOAST_COLORS = {
    success: "#111827",
    error: "#b42318",
    hint: "#b45309"
  };

  root.showToast = (message, type = "success", duration = 1600) => {
    const old = document.getElementById("ai-quick-copy-toast");
    if (old) old.remove();

    const toast = document.createElement("div");
    toast.id = "ai-quick-copy-toast";
    toast.textContent = message;

    toast.style.cssText = [
      "position:fixed",
      "right:20px",
      "bottom:20px",
      "z-index:2147483647",
      "padding:10px 14px",
      "border-radius:10px",
      "font:600 13px/1.25 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "color:#fff",
      "background:" + (TOAST_COLORS[type] || TOAST_COLORS.success),
      "max-width:360px",
      "white-space:pre-line",
      "box-shadow:0 8px 24px rgba(0,0,0,.22)",
      "pointer-events:none",
      "opacity:0",
      "transform:translateY(6px)",
      "transition:opacity .15s ease,transform .15s ease"
    ].join(";");

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    clearTimeout(root.state.toastTimer);
    root.state.toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
      setTimeout(() => toast.remove(), 180);
    }, duration);
  };

  window.AIQuickCopy = root;
})();