/**
 * CSV Generation & Formula Injection Defense (CWE-1236)
 * Sanitizes all exported table cells to ensure values starting with =, +, -, @, or tabs
 * cannot be interpreted as executable spreadsheet formulas or DDE macros.
 */

/**
 * Sanitizes a single cell value for safe CSV export.
 * If the cell begins with dangerous formula prefix characters, it is prefixed with a single quote.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = String(value).trim();
  // Neutralize CSV injection / formula execution vectors
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape inner double quotes by doubling them according to RFC 4180
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generates an RFC 4180-compliant, formula-injection-safe CSV string with UTF-8 BOM for Excel compatibility.
 */
export function buildSanitizedCsv(headers: string[], rows: (unknown[])[]): string {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(sanitizeCsvCell).join(','));
  return '\uFEFF' + [headerLine, ...rowLines].join('\n');
}

/**
 * Initiates a browser download of the sanitized CSV.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
