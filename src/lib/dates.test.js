import { describe, it, expect } from 'vitest'
import {
  todayISO, isoFromDate, parseISO, addDays, diffDays, sameMonth, weekdayMo,
} from './dates.js'

describe('todayISO', () => {
  it('liefert YYYY-MM-DD-Format', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('verwendet lokale Zeit (kein UTC-Shift)', () => {
    const iso = todayISO()
    const d = new Date()
    expect(iso.slice(0, 4)).toBe(String(d.getFullYear()))
    expect(iso.slice(5, 7)).toBe(String(d.getMonth() + 1).padStart(2, '0'))
    expect(iso.slice(8, 10)).toBe(String(d.getDate()).padStart(2, '0'))
  })
})

describe('parseISO ↔ isoFromDate Roundtrip', () => {
  it('parseISO + isoFromDate ergibt Original-String', () => {
    expect(isoFromDate(parseISO('2026-06-14'))).toBe('2026-06-14')
    expect(isoFromDate(parseISO('2025-01-01'))).toBe('2025-01-01')
    expect(isoFromDate(parseISO('2026-12-31'))).toBe('2026-12-31')
  })
  it('parseISO liefert lokale Mitternacht (kein UTC)', () => {
    const d = parseISO('2026-06-14')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5)  // 0-basiert
    expect(d.getDate()).toBe(14)
    expect(d.getHours()).toBe(0)
  })
})

describe('addDays', () => {
  it('+1 Tag', () => {
    const d = addDays(parseISO('2026-06-14'), 1)
    expect(isoFromDate(d)).toBe('2026-06-15')
  })
  it('-1 Tag', () => {
    const d = addDays(parseISO('2026-06-14'), -1)
    expect(isoFromDate(d)).toBe('2026-06-13')
  })
  it('Monatswechsel', () => {
    expect(isoFromDate(addDays(parseISO('2026-06-30'), 1))).toBe('2026-07-01')
    expect(isoFromDate(addDays(parseISO('2026-07-01'), -1))).toBe('2026-06-30')
  })
  it('Jahreswechsel', () => {
    expect(isoFromDate(addDays(parseISO('2026-12-31'), 1))).toBe('2027-01-01')
  })
  it('Schaltjahr Februar (2024)', () => {
    expect(isoFromDate(addDays(parseISO('2024-02-28'), 1))).toBe('2024-02-29')
    expect(isoFromDate(addDays(parseISO('2024-02-29'), 1))).toBe('2024-03-01')
  })
  it('Nicht-Schaltjahr 2026 — Februar hat 28 Tage', () => {
    expect(isoFromDate(addDays(parseISO('2026-02-28'), 1))).toBe('2026-03-01')
  })
  it('+15 Tage = 16-Tage-Trip-End-Date für Eigen-Trip', () => {
    expect(isoFromDate(addDays(parseISO('2026-06-14'), 15))).toBe('2026-06-29')
  })
})

describe('diffDays', () => {
  it('0 für gleiche Tage', () => {
    expect(diffDays(parseISO('2026-06-14'), parseISO('2026-06-14'))).toBe(0)
  })
  it('positive für b nach a', () => {
    expect(diffDays(parseISO('2026-06-14'), parseISO('2026-06-29'))).toBe(15)
  })
  it('negative für b vor a', () => {
    expect(diffDays(parseISO('2026-06-29'), parseISO('2026-06-14'))).toBe(-15)
  })
  it('über DST-Wechsel hinweg (typische Stolperfalle)', () => {
    // DST-Start Australien Süd: 1. Sonntag Oktober. AEST kennt aber kein DST in Cape York (QLD).
    // Sicherheits-Test: 2026-04-04 → 2026-04-05 sollte 1 sein, nicht 0.96 oder 1.04.
    expect(diffDays(parseISO('2026-04-04'), parseISO('2026-04-05'))).toBe(1)
    expect(diffDays(parseISO('2026-10-04'), parseISO('2026-10-05'))).toBe(1)
  })
})

describe('sameMonth', () => {
  it('true für gleichen Monat/Jahr', () => {
    expect(sameMonth(parseISO('2026-06-01'), parseISO('2026-06-30'))).toBe(true)
  })
  it('false für verschiedene Monate', () => {
    expect(sameMonth(parseISO('2026-06-30'), parseISO('2026-07-01'))).toBe(false)
  })
  it('false für gleichen Monat aber anderes Jahr', () => {
    expect(sameMonth(parseISO('2025-06-15'), parseISO('2026-06-15'))).toBe(false)
  })
})

describe('weekdayMo (Mo=0..So=6)', () => {
  it('2026-06-14 ist Sonntag → 6', () => {
    expect(weekdayMo(parseISO('2026-06-14'))).toBe(6)
  })
  it('2026-06-15 ist Montag → 0', () => {
    expect(weekdayMo(parseISO('2026-06-15'))).toBe(0)
  })
  it('2026-06-19 ist Freitag → 4', () => {
    expect(weekdayMo(parseISO('2026-06-19'))).toBe(4)
  })
})
