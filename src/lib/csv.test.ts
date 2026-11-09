import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

type Row = { name: string; note: string }
const cols = [
  { header: 'Name', value: (r: Row) => r.name },
  { header: 'Note', value: (r: Row) => r.note },
]

describe('toCsv', () => {
  it('starts with BOM and uses CRLF', () => {
    const out = toCsv([{ name: 'A', note: 'x' }], cols)
    expect(out.startsWith('\ufeff')).toBe(true)
    expect(out).toContain('\r\n')
  })
  it('quotes commas, quotes and newlines', () => {
    const out = toCsv([{ name: 'Press, big', note: 'He said "ok"\nthen left' }], cols)
    expect(out).toContain('"Press, big","He said ""ok""\nthen left"')
  })
  it('supports semicolon delimiter', () => {
    const out = toCsv([{ name: 'a;b', note: 'c,d' }], cols, ';')
    // commas are always quoted too: harmless, and safe if the file is opened with either delimiter setting
    expect(out).toContain('"a;b";"c,d"')
  })
  it('neutralises formula injection', () => {
    expect(toCsv([{ name: '=SUM(A1)', note: '' }], cols)).toContain("'=SUM(A1)")
  })
})
