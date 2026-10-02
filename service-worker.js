/**
 * AI Quick Copy v1.1
 * Responsibility: browser-level command routing only.
 */

// Toolbar icon opens the settings page.
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "copy-latest-response") return;

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "AI_QUICK_COPY"
    });
  } catch (_) {
    // Unsupported page or content script unavailable.
  }
});