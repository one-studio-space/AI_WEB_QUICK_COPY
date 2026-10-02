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
 *
 * A copied selection is marked as an excerpt ("· excerpt", "End of excerpt").
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

  AQC.toBlock = (markdown, { id, name, icon, role, host, excerpt = false, date = new Date() }) => {
    const title = AQC.blockTitle({ name, role });
    const roleAttr = role ? ` role="${role}"` : "";
    const partAttr = excerpt ? ' part="excerpt"' : "";

    return [
      `<!-- aqc:start ai="${id}"${roleAttr}${partAttr} -->`,
      `## ${icon} ${title}`,
      `*${host} · ${formatTimestamp(date)}${excerpt ? " · excerpt" : ""}*`,
      "",
      markdown,
      "",
      `*— End of ${excerpt ? "excerpt" : "answer"} · ${title} —*`,
      "<!-- aqc:end -->",
      "",
      "---",
      ""
    ].join("\n");
  };
})();
