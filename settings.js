/**
 * AI Quick Copy v1.2
 * Responsibility: user settings shared by content scripts and the options page.
 *
 * Only settings are stored (chrome.storage.sync). Copied responses are never stored.
 */

(() => {
  const DEFAULTS = {
    blockMode: true,
    roles: {
      chatgpt: "",
      gemini: "",
      grok: "",
      claude: ""
    }
  };

  const ROLE_MAX_LENGTH = 40;

  // Roles end up in a Markdown heading and an HTML comment attribute,
  // so keep them on one line and free of characters that would break either.
  const cleanRole = (value) => {
    return String(value || "")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/["<>`*_#|\\]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, ROLE_MAX_LENGTH);
  };

  const withDefaults = (stored) => {
    const roles = { ...DEFAULTS.roles };

    for (const id of Object.keys(roles)) {
      roles[id] = cleanRole(stored?.roles?.[id]);
    }

    return {
      blockMode: typeof stored?.blockMode === "boolean"
        ? stored.blockMode
        : DEFAULTS.blockMode,
      roles
    };
  };

  const load = async () => {
    try {
      const { settings } = await chrome.storage.sync.get("settings");
      return withDefaults(settings);
    } catch (_) {
      // Storage unavailable (e.g. extension reloaded under an open tab).
      return withDefaults(null);
    }
  };

  const save = async (settings) => {
    const clean = withDefaults(settings);
    await chrome.storage.sync.set({ settings: clean });
    return clean;
  };

  window.AIQuickCopySettings = {
    DEFAULTS,
    ROLE_MAX_LENGTH,
    cleanRole,
    load,
    save
  };
})();
