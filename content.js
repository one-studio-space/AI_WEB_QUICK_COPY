/**
 * AI Quick Copy v1.1
 * Responsibility: route the copy action to the correct site adapter.
 */

(() => {
  const AQC = window.AIQuickCopy;
  const adapters = window.AIQuickCopyAdapters || {};

  function getAdapter() {
    const host = window.location.hostname.replace(/^www\./, "");

    for (const adapter of Object.values(adapters)) {
      if (adapter.matches(host)) return adapter;
    }

    return null;
  }

  async function copyLatestResponse() {
    const now = Date.now();

    if (now - AQC.state.lastTriggerAt < 500) return;
    AQC.state.lastTriggerAt = now;

    const adapter = getAdapter();

    if (!adapter) {
      AQC.showToast("Trang này chưa được hỗ trợ.", "error");
      return;
    }

    const element = adapter.findLatest();

    if (!element) {
      AQC.showToast("Không tìm thấy AI response.", "error");
      return;
    }

    const markdown = AQC.toMarkdown(element);

    if (!markdown) {
      AQC.showToast("Không trích xuất được response.", "error");
      return;
    }

    await AQC.copyText(markdown);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "AI_QUICK_COPY") {
      copyLatestResponse();
    }
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat) return;

      const isCtrlQ =
        event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey &&
        event.code === "KeyQ";

      if (!isCtrlQ) return;

      const target = event.target;
      const isEditable =
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        );

      // Never hijack Ctrl+Q while the user is typing.
      if (isEditable) return;

      event.preventDefault();
      event.stopPropagation();

      copyLatestResponse();
    },
    true
  );
})();