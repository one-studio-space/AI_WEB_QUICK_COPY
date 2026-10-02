/**
 * AI Quick Copy v1.1.2 — ChatGPT adapter
 *
 * Finds the latest assistant response body (not the "ChatGPT said:" label).
 */

(() => {
  window.AIQuickCopyAdapters = window.AIQuickCopyAdapters || {};

  const AQC = window.AIQuickCopy;

  const CONTENT_SELECTORS = [
    // Prefer the rendered markdown body
    "[data-message-author-role='assistant'] .markdown",
    "[data-message-author-role='assistant'] .prose",
    "[data-turn='assistant'] .markdown",
    "[data-turn='assistant'] .prose",
    "[data-content-search-unit-key$=':assistant'] .markdown",
    "[data-content-search-unit-key$=':assistant'] .prose",
    "[data-chatgpt-search-unit-key$=':assistant'] .markdown",
    ".agent-turn .markdown",
    ".agent-turn .prose",
    // Fallback: outer assistant containers
    "[data-message-author-role='assistant']",
    "[data-turn='assistant']",
    "[data-content-search-unit-key$=':assistant']",
    "[data-chatgpt-search-unit-key$=':assistant']",
    "[data-testid^='conversation-turn-'][data-turn='assistant']",
    "article[data-turn='assistant']",
    "section[data-turn='assistant']"
  ];

  function textOf(el) {
    return (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isLabelOnly(el) {
    const t = textOf(el).toLowerCase();
    if (!t) return true;
    // Pure screen-reader labels
    if (/^(chatgpt|you|assistant|user)\s+said\s*:?$/.test(t)) return true;
    if (t === "chatgpt said" || t === "you said") return true;
    // Too short to be a real response
    if (t.length < 8) return true;
    return false;
  }

  function isUserish(el) {
    if (!el) return true;
    if (
      el.matches?.(
        "[data-message-author-role='user'], [data-turn='user'], " +
        "[data-user-message-bubble='true'], " +
        "[data-content-search-unit-key$=':user'], " +
        "[data-chatgpt-search-unit-key$=':user']"
      )
    ) {
      return true;
    }
    const key =
      el.getAttribute?.("data-content-search-unit-key") ||
      el.getAttribute?.("data-chatgpt-search-unit-key") ||
      "";
    if (key.endsWith(":user")) return true;
    if (el.getAttribute?.("data-message-author-role") === "user") return true;
    if (el.getAttribute?.("data-turn") === "user") return true;
    return false;
  }

  function digMarkdown(el) {
    if (!el) return null;
    // If we already landed on markdown/prose, use it
    if (
      el.matches?.(".markdown, .prose, [class*='markdown']") &&
      !isLabelOnly(el)
    ) {
      return el;
    }
    const inner =
      el.querySelector?.(
        ".markdown.prose, .markdown, .prose, [class*='markdown']:not(.sr-only)"
      ) || null;
    if (inner && AQC.isVisible(inner) && !isLabelOnly(inner)) {
      return inner;
    }
    return el;
  }

  function getCandidates() {
    const raw = AQC.queryAll(CONTENT_SELECTORS).filter(AQC.isVisible);
    const cleaned = raw
      .filter((el) => !isUserish(el))
      .filter((el) => !isLabelOnly(el))
      .map(digMarkdown)
      .filter((el) => el && AQC.isVisible(el) && !isLabelOnly(el));

    // Dedupe: prefer deeper (content) nodes; drop ancestors that contain another candidate
    const unique = AQC.uniqueElements(cleaned);
    const leafs = unique.filter((el) => {
      return !unique.some(
        (other) => other !== el && el.contains(other) && !other.contains(el)
      );
    });

    leafs.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      if (ar.top !== br.top) return ar.top - br.top;
      return ar.left - br.left;
    });

    return leafs;
  }

  function heuristicFallback() {
    const pool = AQC.queryAll([
      "main .markdown",
      "main .prose",
      "main [data-message-author-role='assistant']",
      "main [data-turn='assistant']",
      "main [data-content-search-unit-key$=':assistant']",
      "main [data-testid*='conversation-turn']",
      "main [data-turn-key]",
      "main article",
      "main .agent-turn"
    ]).filter(AQC.isVisible);

    const scored = pool
      .map((element) => {
        let el = digMarkdown(element);
        const text = textOf(el);
        let score = 0;

        if (isLabelOnly(el) || isUserish(el) || isUserish(element)) {
          return { element: el, score: -100 };
        }

        if (text.length > 80) score += Math.min(text.length / 80, 25);
        if (el.querySelector?.("pre, code, table, blockquote, h1, h2, h3")) score += 8;
        if (el.matches?.(".markdown, .prose, [class*='markdown']")) score += 15;

        const key =
          element.getAttribute("data-content-search-unit-key") ||
          element.getAttribute("data-chatgpt-search-unit-key") ||
          "";
        if (key.endsWith(":assistant")) score += 20;
        if (element.getAttribute("data-message-author-role") === "assistant") score += 20;
        if (element.getAttribute("data-turn") === "assistant") score += 15;
        if (element.querySelector?.("[data-testid='copy-turn-action-button']")) score += 6;

        return { element: el, score };
      })
      .filter((item) => item.score > 10);

    if (!scored.length) return null;

    scored.sort((a, b) => {
      const ay = a.element.getBoundingClientRect().top;
      const by = b.element.getBoundingClientRect().top;
      if (ay !== by) return ay - by;
      return b.score - a.score;
    });

    return scored[scored.length - 1].element;
  }

  window.AIQuickCopyAdapters.chatgpt = {
    id: "chatgpt",
    name: "CHATGPT",
    icon: "🟩",

    matches(host) {
      return host === "chatgpt.com" || host === "chat.openai.com";
    },

    findAll() {
      const candidates = getCandidates();
      if (candidates.length) return candidates;

      const fallback = heuristicFallback();
      return fallback ? [fallback] : [];
    }
  };
})();
