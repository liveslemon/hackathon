/**
 * CSV Utilities with RFC 4180 compliance and CSV/Formula Injection protection.
 */

// OWASP CSV Injection: Characters that can trigger formula execution in spreadsheet software
// (Excel, LibreOffice, Google Sheets).
const FORMULA_INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Neutralizes potential CSV formula injection attacks by prepending a single quote
 * if the string starts with any formula indicator (=, +, -, @, tab, CR),
 * either directly or after leading whitespace.
 */
export function sanitizeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  // Check raw string first (e.g. starting with \t or \r)
  if (FORMULA_INJECTION_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    return `'${str}`;
  }
  // Check after whitespace trimming (e.g. "  =SUM(A1)")
  const trimmed = str.trimStart();
  if (
    trimmed.length > 0 &&
    FORMULA_INJECTION_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
  ) {
    return `'${str}`;
  }
  return str;
}

/**
 * Escapes a cell value according to RFC 4180:
 * - Sanitizes formula injection
 * - Escapes internal double quotes by doubling them (" -> "")
 * - Wraps the content in double quotes to preserve commas, newlines, and leading/trailing whitespace
 */
export function escapeCSVCell(value: unknown): string {
  const sanitized = sanitizeCSVValue(value);
  const escaped = sanitized.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates an RFC 4180 compliant CSV string from headers and rows.
 * Handles commas, quotes, newlines, and formula injection safely.
 */
export function generateCSV(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const escapedHeaders = headers.map(escapeCSVCell).join(",");
  const escapedRows = rows.map((row) =>
    row.map(escapeCSVCell).join(",")
  );
  return [escapedHeaders, ...escapedRows].join("\r\n");
}

/**
 * Triggers a browser download of the CSV data.
 * Prepends a UTF-8 BOM (\uFEFF) so Excel correctly recognizes UTF-8 encoded characters.
 */
export function downloadCSV(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  filename: string,
) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const csv = generateCSV(headers, rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
