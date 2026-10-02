/**
 * AI Quick Copy v1.1
 * Responsibility: route the copy action to the correct site adapter.
 */

(() => {
  const AQC = window.AIQuickCopy;
  const Settings = window.AIQuickCopySettings;
  const adapters = window.AIQuickCopyAdapters || {};

  function getAdapter() {
    const host = window.location.hostname.replace(/^www\./, "");

    for (const adapter of Object.values(adapters)) {
      if (adapter.matches(host)) return adapter;
    }

    return null;
  }

  const HINT_DURATION = 4500;
  const SELECT_HINT =
    "Không nhận diện được câu trả lời.\n" +
    "👉 Bôi đen đoạn cần copy rồi nhấn Ctrl+Q lại.";

  /**
   * What to copy, in order of priority:
   * 1. the text the user highlighted;
   * 2. the response the user is reading (on screen);
   * 3. the latest response.
   */
  function findSource(adapter) {
    const selection = AQC.getSelectionElement();
    if (selection) return { element: selection, excerpt: true };

    const responses = adapter.findAll();
    const element =
      AQC.pickInView(responses) ||
      AQC.pickLatest(AQC.innermost(responses));

    return element ? { element, excerpt: false } : null;
  }

  async function copyResponse() {
    const now = Date.now();

    if (now - AQC.state.lastTriggerAt < 500) return;
    AQC.state.lastTriggerAt = now;

    const adapter = getAdapter();

    if (!adapter) {
      AQC.showToast("Trang này chưa được hỗ trợ.", "error");
      return;
    }

    const source = findSource(adapter);

    if (!source) {
      AQC.showToast(SELECT_HINT, "hint", HINT_DURATION);
      return;
    }

    const settings = await Settings.load();

    const markdown = AQC.toMarkdown(source.element, {
      headingOffset: settings.blockMode ? AQC.BLOCK_HEADING_OFFSET : 0
    });

    if (!markdown) {
      AQC.showToast(SELECT_HINT, "hint", HINT_DURATION);
      return;
    }

    if (!settings.blockMode) {
      await AQC.copyText(
        markdown,
        source.excerpt ? "⚡ Đã copy đoạn bôi đen · Markdown" : undefined
      );
      return;
    }

    const identity = {
      id: adapter.id,
      name: adapter.name,
      icon: adapter.icon,
      role: settings.roles[adapter.id] || "",
      host: window.location.hostname.replace(/^www\./, "")
    };

    const copied = source.excerpt ? "Đã copy đoạn bôi đen" : "Đã copy";

    await AQC.copyText(
      AQC.toBlock(markdown, { ...identity, excerpt: source.excerpt }),
      `⚡ ${copied} · ${AQC.blockTitle(identity)}`
    );
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "AI_QUICK_COPY") {
      copyResponse();
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

      copyResponse();
    },
    true
  );
})();