// Phase 4. Excel-friendly CSV.
// - UTF-8 BOM so Excel reads accents/Indonesian text correctly
// - CRLF line endings
// - delimiter option: Excel with an Indonesian regional setting often expects ';' instead of ','
export interface CsvColumn<T> {
  header: string
  value: (row: T) => unknown
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[], delimiter: ',' | ';' = ','): string {
  const needsQuote = new RegExp(`[",\\r\\n${delimiter}]`)
  const needsFormulaGuard = (s: string) => {
    const first = s.charAt(0)
    if (!first) return false
    // These always turn the cell into a formula/control character.
    if (first === '=' || first === '+' || first === '@' || first === '\t' || first === '\r') return true
    // A leading '-' is only dangerous when it is not a real negative number.
    return first === '-' && Number.isNaN(Number(s))
  }
  const esc = (v: unknown) => {
    let s = v == null ? '' : String(v)
    // Neutralise spreadsheet formula injection without mangling negative numbers.
    if (needsFormulaGuard(s)) s = "'" + s
    return needsQuote.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    columns.map((c) => esc(c.header)).join(delimiter),
    ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(delimiter)),
  ]
  return '\ufeff' + lines.join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
