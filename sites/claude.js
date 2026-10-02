/**
 * AI Quick Copy v1.1 — Claude adapter
 */

(() => {
  window.AIQuickCopyAdapters = window.AIQuickCopyAdapters || {};

  window.AIQuickCopyAdapters.claude = {
    id: "claude",
    name: "CLAUDE",
    icon: "🟧",

    matches(host) {
      return host === "claude.ai";
    },

    findLatest() {
      const selectors = [
        "[data-testid='assistant-message']",
        "[data-testid*='assistant-message']",
        "[data-is-streaming='false']",
        ".font-claude-message"
      ];

      return window.AIQuickCopy.pickLatest(
        window.AIQuickCopy.queryAll(selectors)
      );
    }
  };
})();