/**
 * AI Quick Copy v1.1 — Gemini adapter
 */

(() => {
  window.AIQuickCopyAdapters = window.AIQuickCopyAdapters || {};

  window.AIQuickCopyAdapters.gemini = {
    matches(host) {
      return host === "gemini.google.com";
    },

    findLatest() {
      const selectors = [
        "message-content",
        ".model-response-text",
        "[data-message-author-role='model']",
        ".response-content"
      ];

      return window.AIQuickCopy.pickLatest(
        window.AIQuickCopy.queryAll(selectors)
      );
    }
  };
})();