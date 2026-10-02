/**
 * AI Quick Copy v1.1 — Grok adapter
 */

(() => {
  window.AIQuickCopyAdapters = window.AIQuickCopyAdapters || {};

  function genericLatest() {
    const candidates = [
      ...document.querySelectorAll(
        "[data-testid*='message'], [data-testid*='response'], " +
        "[class*='message'], [class*='response'], article"
      )
    ].filter(window.AIQuickCopy.isVisible);

    const scored = candidates
      .map((element) => {
        const text = (element.innerText || "").trim();
        const rect = element.getBoundingClientRect();

        let score = Math.min(text.length / 80, 30);

        if (text.length < 80) score -= 15;
        if (rect.height < 40) score -= 5;

        return { element, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        const ay = a.element.getBoundingClientRect().top;
        const by = b.element.getBoundingClientRect().top;
        if (ay !== by) return ay - by;
        return b.score - a.score;
      });

    return scored.length ? scored[scored.length - 1].element : null;
  }

  window.AIQuickCopyAdapters.grok = {
    matches(host) {
      return host === "grok.com" || host === "x.com";
    },

    findLatest() {
      const selectors = [
        "[data-testid='grok-response']",
        "[data-testid*='grok-response']",
        "[data-testid*='assistant']",
        ".response-message",
        "[class*='response-message']"
      ];

      return window.AIQuickCopy.pickLatest(
        window.AIQuickCopy.queryAll(selectors)
      ) || genericLatest();
    }
  };
})();