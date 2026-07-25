/** A single CSV cell value before escaping. */
type Cell = string | number | null | undefined;

/** RFC-4180-escape one cell: wrap in quotes (doubling any inner quotes) when it
 *  contains a comma, quote, or newline; blank for null/undefined. */
function escapeCell(v: Cell): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build a CSV string from a header row + data rows. Pure — CRLF line endings
 * (RFC 4180 / Excel-friendly). The caller adds a UTF-8 BOM at response time
 * (see `csvResponse`) so Excel renders ৳ / Bangla correctly.
 */
export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

/**
 * Wrap a CSV body as a downloadable `text/csv` response. Prepends the UTF-8 BOM
 * so spreadsheet apps detect the encoding. Server-only (returns a `Response`).
 */
export function csvResponse(csv: string, filename: string): Response {
  const BOM = String.fromCharCode(0xfeff);
  return new Response(BOM + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
