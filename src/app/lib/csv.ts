// Lightweight CSV export — converts any array of rows to a downloadable CSV file.

type Cell = string | number | boolean | null | undefined | Date;

export interface CsvColumn<T> {
  key: keyof T | ((row: T) => Cell);
  header: string;
}

// Escape a value for CSV: wrap in quotes if it contains comma/quote/newline, double any internal quotes.
function escape(value: Cell): string {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map(c => escape(c.header)).join(',');
  const body = rows
    .map(row =>
      columns
        .map(col => {
          const raw = typeof col.key === 'function' ? col.key(row) : (row[col.key] as Cell);
          return escape(raw);
        })
        .join(','),
    )
    .join('\n');
  return `${header}\n${body}`;
}

// Triggers a browser download of the CSV string with the given filename.
export function downloadCsv(csv: string, filename: string) {
  // Add BOM so Excel reads UTF-8 correctly (Cyrillic / Lithuanian diacritics)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Convenience: convert + download in one call.
export function exportCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  downloadCsv(toCsv(rows, columns), filename);
}
