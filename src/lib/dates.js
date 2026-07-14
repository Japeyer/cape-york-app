// Datums-Helpers für Trip-Kalender. Lokale Zeit (kein UTC-Shift) — sonst
// springt der "heute"-Tag in negativen UTC-Offsets auf gestern.
// Format YYYY-MM-DD durchgehend.

const pad = n => String(n).padStart(2, '0')

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoFromYMD(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

export function isoFromDate(date) {
  return isoFromYMD(date.getFullYear(), date.getMonth(), date.getDate())
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

export function diffDays(a, b) {
  // Ganze Tage zwischen a (früh) und b (spät), 0-basiert.
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

// Wochentag-Index Mo=0..So=6 (Outlook-Style, nicht JS-Default So=0).
export function weekdayMo(d) {
  return (d.getDay() + 6) % 7
}
