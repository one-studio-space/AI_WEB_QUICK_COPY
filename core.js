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

  root.getClone = (element) => {
    if (!element) return null;

    const clone = element.cloneNode(true);

    // Strip UI chrome + screen-reader-only labels (e.g. "ChatGPT said:")
    clone.querySelectorAll(
      "button, input, textarea, select, svg, img, video, audio, " +
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

  root.copyText = async (text) => {
    if (!text) {
      root.showToast("Không tìm thấy nội dung để copy.", "error");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      root.showToast("⚡ Đã copy AI response · Markdown");
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
          root.showToast("⚡ Đã copy AI response · Markdown");
          return true;
        }
      } catch (_) {}

      root.showToast("Không thể copy. Hãy thử lại.", "error");
      return false;
    }
  };

  root.showToast = (message, type = "success") => {
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
      "background:" + (type === "error" ? "#b42318" : "#111827"),
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
    }, 1600);
  };

  window.AIQuickCopy = root;
})();