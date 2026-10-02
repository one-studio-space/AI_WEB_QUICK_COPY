/**
 * AI Quick Copy v1.2
 * Responsibility: wrap a Markdown response in an attribution block
 * so readers can tell which AI wrote it.
 *
 * Output:
 *
 *   <!-- aqc:start ai="gemini" role="Secretary" -->
 *   ## 🟦 GEMINI · Secretary
 *   *gemini.google.com · 2026-10-02 14:32*
 *
 *   ...response...
 *
 *   *— End of answer · GEMINI · Secretary —*
 *   <!-- aqc:end -->
 *
 *   ---
 */

(() => {
  const AQC = window.AIQuickCopy;

  // The block title is an h2, so response headings start at h3.
  AQC.BLOCK_HEADING_OFFSET = 2;

  const pad = (value) => String(value).padStart(2, "0");

  const formatTimestamp = (date) => {
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  };

  AQC.blockTitle = ({ name, role }) => {
    return role ? `${name} · ${role}` : name;
  };

  AQC.toBlock = (markdown, { id, name, icon, role, host, date = new Date() }) => {
    const title = AQC.blockTitle({ name, role });
    const roleAttr = role ? ` role="${role}"` : "";

    return [
      `<!-- aqc:start ai="${id}"${roleAttr} -->`,
      `## ${icon} ${title}`,
      `*${host} · ${formatTimestamp(date)}*`,
      "",
      markdown,
      "",
      `*— End of answer · ${title} —*`,
      "<!-- aqc:end -->",
      "",
      "---",
      ""
    ].join("\n");
  };
})();
