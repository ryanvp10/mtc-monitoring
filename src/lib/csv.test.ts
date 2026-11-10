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
    expect(toCsv([{ name: '+cmd|calc', note: '' }], cols)).toContain("'+cmd|calc")
    expect(toCsv([{ name: '@import', note: '' }], cols)).toContain("'@import")
  })
  it('neutralises leading TAB and CR', () => {
    expect(toCsv([{ name: '\t=SUM(A1)', note: '' }], cols)).toContain("'\t=SUM(A1)")
    expect(toCsv([{ name: '\r=SUM(A1)', note: '' }], cols)).toContain("'\r=SUM(A1)")
  })
  it('keeps legitimate negative numbers as numbers', () => {
    const out = toCsv([{ name: '-5', note: '-12.5' }], cols)
    expect(out).toContain('\r\n-5,-12.5')
    expect(out).not.toContain("'-5")
    // A dash that is not a number is still guarded.
    expect(toCsv([{ name: '-5+cmd', note: '' }], cols)).toContain("'-5+cmd")
  })
})
