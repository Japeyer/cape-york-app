// Einmal-Skript: Gewürze/Aromaten/Bratfett von "/person" auf PRO GERICHT umstellen.
//
// Anlass (Entwickler-Report Juli 2026): "Für 7 Personen würde ich nicht 11 Knoblauchzehen in
// Fajitas machen, ebenso wenig 10.75 Esslöffel Paprika."
//
// Hintergrund: `scaleFactor` dämpft Gewürze/Aromaten/Bratfett halb-linear (Aroma sättigt, Bratfett
// hängt an der Pfannenfläche). Ein "/person"-Marker umgeht diese Dämpfung aber, weil er als
// explizite Autor-Absicht gilt — dadurch skalierte a46 "Smoked paprika, 1.5 tsp/person" linear auf
// 10.5 TL bei 7 Personen.
//
// Das ist ein Datenmodell-Fehler, kein Autorwunsch: Gewürze gehören PRO GERICHT angegeben, nicht
// pro Person. Dieses Skript rechnet die betroffenen Mengen auf die 2-Personen-Basis um
// (BASE_SERVINGS) und entfernt den Marker:
//
//     ['Smoked paprika','1.5 tsp/person']  →  ['Smoked paprika','3 tsp']
//     ['Olive oil','1 tbsp/person']        →  ['Olive oil','2 tbsp']
//
// Dadurch bleibt die 2-Personen-Menge exakt gleich (1.5 × 2 = 3), und ab 3 Personen greift die
// Dämpfung wie bei jedem anderen Gewürz.
//
// Betrifft NUR Zutaten aus der Dämpfungsliste. Sojasauce, Mayo, Senf, Tomatenmark usw. behalten
// ihr "/person" — die skalieren zu Recht linear.
//
// Nutzung:
//   node scripts/normalize-spice-scaling.mjs          # Dry-Run: nur Report, schreibt nichts
//   node scripts/normalize-spice-scaling.mjs --write   # schreibt src/data/recipes.js

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { isDamped, BASE_SERVINGS } from '../src/lib/generator.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const FILE = resolve(HERE, '../src/data/recipes.js')
const WRITE = process.argv.includes('--write')

const src = readFileSync(FILE, 'utf8')

// Matcht die Zutaten-Paare ['Name','Menge'] im Quelltext. Bewusst textbasiert (wie
// normalize-recipes.mjs): trifft nie Rezeptnamen, Schritte oder Tipps, weil dort keine
// zwei-elementigen String-Literale in eckigen Klammern stehen.
const PAIR_RX = /\['((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\]/g
const PER_PERSON_RX = /\s*(?:\/person\b|\bper person\b)/i
const LEAD_NUM_RX = /^(\s*)(\d+(?:\.\d+)?)/

const changes = []
const skipped = []

const out = src.replace(PAIR_RX, (full, name, amount) => {
  if (!PER_PERSON_RX.test(amount)) return full
  if (!isDamped(name)) return full                 // Sojasauce & Co. behalten ihr /person

  const num = amount.match(LEAD_NUM_RX)
  if (!num) {                                      // z.B. "small handful/person" — nichts zu rechnen
    skipped.push({ name, amount, why: 'keine Zahl am Anfang' })
    return full
  }

  const scaled = Number(num[2]) * BASE_SERVINGS
  // Zahl ersetzen, dann den Marker entfernen. Annotationen (", grated", "— important!") bleiben.
  const newAmount = amount
    .replace(LEAD_NUM_RX, `$1${scaled}`)
    .replace(PER_PERSON_RX, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim()

  changes.push({ name, from: amount, to: newAmount })
  return `['${name}','${newAmount}']`
})

console.log(`normalize-spice-scaling — Basis ${BASE_SERVINGS} Personen\n`)
console.log(`${changes.length} Änderungen:\n`)
const w = Math.max(...changes.map(c => c.name.length), 4)
for (const c of changes) {
  console.log(`  ${c.name.padEnd(w)}  "${c.from}"  →  "${c.to}"`)
}
if (skipped.length) {
  console.log(`\n${skipped.length} übersprungen:`)
  for (const s of skipped) console.log(`  ${s.name}: "${s.amount}" (${s.why})`)
}

if (!WRITE) {
  console.log('\nDRY-RUN — nichts geschrieben. Mit --write ausführen zum Übernehmen.')
} else if (out === src) {
  console.log('\nKeine Änderung nötig — Datei unverändert.')
} else {
  writeFileSync(FILE, out)
  console.log(`\n✓ ${FILE} geschrieben.`)
}
