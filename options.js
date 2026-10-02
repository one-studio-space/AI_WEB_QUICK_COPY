const Settings = window.AIQuickCopySettings;

const blockModeInput = document.getElementById("blockMode");
const rolesFieldset = document.getElementById("roles");
const roleInputs = [...document.querySelectorAll("[data-role]")];
const preview = document.getElementById("preview");
const status = document.getElementById("status");

let statusTimer = null;
let saveTimer = null;

function readForm() {
  const roles = {};

  for (const input of roleInputs) {
    roles[input.dataset.role] = input.value;
  }

  return {
    blockMode: blockModeInput.checked,
    roles
  };
}

function renderPreview(settings) {
  rolesFieldset.disabled = !settings.blockMode;

  if (!settings.blockMode) {
    preview.textContent = "...nội dung câu trả lời (Markdown thuần, không có header)...";
    return;
  }

  const role = Settings.cleanRole(settings.roles.gemini);
  const title = role ? `GEMINI · ${role}` : "GEMINI";
  const roleAttr = role ? ` role="${role}"` : "";

  preview.textContent = [
    `<!-- aqc:start ai="gemini"${roleAttr} -->`,
    `## 🟦 ${title}`,
    "*gemini.google.com · 2026-10-02 14:32*",
    "",
    "...nội dung câu trả lời...",
    "",
    `*— End of answer · ${title} —*`,
    "<!-- aqc:end -->",
    "",
    "---"
  ].join("\n");
}

function showStatus(message) {
  status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.textContent = "";
  }, 1500);
}

async function save() {
  try {
    await Settings.save(readForm());
    showStatus("✓ Đã lưu");
  } catch (_) {
    showStatus("Không lưu được cài đặt.");
  }
}

function onChange(event) {
  renderPreview(readForm());

  // Text fields save after typing pauses; the checkbox saves immediately.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, event.target.type === "text" ? 400 : 0);
}

async function init() {
  const settings = await Settings.load();

  blockModeInput.checked = settings.blockMode;

  for (const input of roleInputs) {
    input.maxLength = Settings.ROLE_MAX_LENGTH;
    input.value = settings.roles[input.dataset.role] || "";
  }

  renderPreview(settings);

  blockModeInput.addEventListener("change", onChange);
  roleInputs.forEach((input) => input.addEventListener("input", onChange));
}

document.getElementById("shortcuts").addEventListener("click", () => {
  chrome.tabs.create({
    url: "chrome://extensions/shortcuts"
  });
});

init();
