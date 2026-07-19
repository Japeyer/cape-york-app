// Kalorien- und Skalierungs-Logik für die Konfigurator-Personenliste.
// Architektur-Vorgabe 1 (CLAUDE.md): gekapselt — Stufe 2 ersetzt die Faktoren ohne UI-Anpassung.
//
// Modell:
//   factor(person) = TYPE_FACTOR[type] * APPETITE_FACTOR[appetite]
//                  | customKcal / BASE_KCAL                 (wenn appetite === 'custom' + customKcal gesetzt)
//   groupFactor   = Σ factor(person)
//   dailyKcal     = round(groupFactor * BASE_KCAL)
//
// Anker: 1.0 entspricht ~2700 kcal/Tag für aktives Outback-Camping.
// Realistisch für 80 kg / 180 cm / sportlich aktiv: ~2700–2900 kcal Standard-Tag,
// üppig nach langem Wandertag bis ~3400 (Heavy).

export const TYPES = ['adult-m', 'adult-f', 'child']
export const APPETITES = ['light', 'medium', 'heavy', 'custom']

const TYPE_FACTOR = {
  'adult-m': 1.05,
  'adult-f': 0.95,
  'child':   0.55,
}

const APPETITE_FACTOR = {
  light:  0.80,
  medium: 1.00,
  heavy:  1.20,
}

const BASE_KCAL = 2700  // pro 1.0-Faktor — aktive Outback-Tage

export const CUSTOM_KCAL_MIN = 1500
export const CUSTOM_KCAL_MAX = 4500
export const CUSTOM_KCAL_STEP = 100

export function clampCustomKcal(v) {
  const n = Number.isFinite(v) ? v : CUSTOM_KCAL_MIN
  const stepped = Math.round(n / CUSTOM_KCAL_STEP) * CUSTOM_KCAL_STEP
  return Math.max(CUSTOM_KCAL_MIN, Math.min(CUSTOM_KCAL_MAX, stepped))
}

export function roundToHundred(n) {
  return Math.round(n / 100) * 100
}

function personFactor(p) {
  if (p?.appetite === 'custom' && Number.isFinite(p?.customKcal)) {
    // Defensiv klemmen: die UI klemmt beim Eingeben, aber ein via localStorage/Import
    // eingeschleuster Wert (z.B. 6000) darf keinen absurden Skalierungs-Faktor erzeugen.
    // Der Generator rechnet über groupFactor → personFactor, ist damit automatisch geschützt.
    return clampCustomKcal(p.customKcal) / BASE_KCAL
  }
  const t = TYPE_FACTOR[p?.type] ?? TYPE_FACTOR['adult-m']
  const a = APPETITE_FACTOR[p?.appetite] ?? APPETITE_FACTOR['medium']
  return t * a
}

export function personDailyKcal(p) {
  if (p?.appetite === 'custom' && Number.isFinite(p?.customKcal)) {
    // Gleiche Klemmung wie in personFactor, damit Anzeige und tatsächlicher Einkauf
    // denselben (geklemmten) Wert benutzen — sonst zeigte die App 6000 an, kaufte aber für 4500.
    return clampCustomKcal(p.customKcal)
  }
  return Math.round(personFactor(p) * BASE_KCAL)
}

export function groupFactor(people) {
  if (!Array.isArray(people) || !people.length) return 1
  return people.reduce((sum, p) => sum + personFactor(p), 0)
}

export function groupDailyKcal(people) {
  return Math.round(groupFactor(people) * BASE_KCAL)
}

// Backward-compat: alter Config-Schema kannte nur `persons: N`. Ergebnis dieser Migration:
// 1 Adult-M-Medium + (N-1) Adult-F-Medium → erste Person Mann, restliche Frau, Total-Faktor ≈ N.
// Nutzer kann anschliessend pro Person editieren.
export function migratePersonsToPeople(persons) {
  const n = Math.max(1, Math.min(8, persons | 0))
  const out = [{ id: makePersonId(0), type: 'adult-m', appetite: 'medium' }]
  for (let i = 1; i < n; i++) {
    out.push({ id: makePersonId(i), type: 'adult-f', appetite: 'medium' })
  }
  return out
}

let counter = 0
export function makePersonId(seed) {
  counter = (counter + 1) % 1e6
  return `p${Date.now().toString(36)}${(seed ?? counter).toString(36)}`
}
