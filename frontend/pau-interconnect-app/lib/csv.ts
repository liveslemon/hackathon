export function generateCSV(headers: string[], rows: string[][]): string {
  const escapedHeaders = headers.join(",");
  const escapedRows = rows.map((row) =>
    row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","),
  );
  return [escapedHeaders, ...escapedRows].join("\n");
}

export function downloadCSV(
  headers: string[],
  rows: string[][],
  filename: string,
) {
  const csv = generateCSV(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
