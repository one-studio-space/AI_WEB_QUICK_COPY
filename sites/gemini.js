/**
 * AI Quick Copy v1.1 — Gemini adapter
 */

(() => {
  window.AIQuickCopyAdapters = window.AIQuickCopyAdapters || {};

  window.AIQuickCopyAdapters.gemini = {
    id: "gemini",
    name: "GEMINI",
    icon: "🟦",

    matches(host) {
      return host === "gemini.google.com";
    },

    findAll() {
      const selectors = [
        "message-content",
        ".model-response-text",
        "[data-message-author-role='model']",
        ".response-content"
      ];

      return window.AIQuickCopy.queryAll(selectors);
    }
  };
})();