// Einmal-Skript: reduziert die Gewürze auf ein Ultra-Minimal-Kit (~6 Gläser), damit man keinen
// 30-Gläser-Rack mitschleppen muss. Substituiert Gewürze auf Kern-Gewürze, entfernt Nicht-
// Essentielle, und dedupliziert innerhalb eines Rezepts (z.B. Oregano+Thyme → 1× Mixed herbs).
//
// Kern-Kit: Salt · Black pepper · Cumin · Smoked paprika · Chili flakes · Curry powder ·
//           Mixed dried herbs   (+ Salt & pepper Combo bleibt)
//
// Robust: nutzt die geparsten RECIPES (Datenstruktur), lokalisiert jeden ing:[…]-Block im
// Quelltext per Bracket-Matching und ersetzt NUR geänderte Blöcke → minimaler Diff, exaktes Format.
//
//   node scripts/reduce-spices.mjs          → Dry-Run
//   node scripts/reduce-spices.mjs --write   → schreibt recipes.js

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { RECIPES } from '../src/data/recipes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FILE = join(__dirname, '..', 'src', 'data', 'recipes.js')

// Gewürz → Kern-Gewürz (exakter Zutatenname wie in recipes.js).
const SUBST = {
  // alle Paprika → Smoked paprika (das meistgenutzte, aromatischste)
  'Paprika': 'Smoked paprika', 'Hot paprika': 'Smoked paprika', 'Sweet paprika': 'Smoked paprika',
  'Paprika + cumin': 'Smoked paprika',
  // alle Chili-Trockenformen → Chili flakes
  'Chili flakes (optional)': 'Chili flakes', 'Chili powder': 'Chili flakes',
  'Chili powder or flakes': 'Chili flakes', 'Chili + garlic powder': 'Chili flakes',
  // Curry-Basis + Currypasten → Curry powder
  'Turmeric': 'Curry powder', 'Garam masala': 'Curry powder', 'Ground coriander': 'Curry powder',
  'Green curry paste': 'Curry powder', 'Green curry paste (vegan, e.g. Ayam, Valcom)': 'Curry powder',
  'Red curry paste': 'Curry powder', 'Red curry paste (check vegan)': 'Curry powder',
  'Thai green curry paste': 'Curry powder', 'Laksa paste (vegan, e.g. Ayam or Valcom)': 'Curry powder',
  // alle getrockneten Kräuter → Mixed dried herbs
  'Dried oregano': 'Mixed dried herbs', 'Oregano / mixed herbs': 'Mixed dried herbs',
  'Oregano or rosemary': 'Mixed dried herbs', "Za'atar or dried oregano": 'Mixed dried herbs',
  'Dried thyme': 'Mixed dried herbs', 'Dried thyme or rosemary': 'Mixed dried herbs',
  'Fresh thyme (or dried)': 'Mixed dried herbs', 'Fresh thyme (or 1 tsp dried)': 'Mixed dried herbs',
  'Fresh thyme or rosemary (or 1 tsp dried)': 'Mixed dried herbs',
  'Dried basil': 'Mixed dried herbs', 'Dried basil (or fresh)': 'Mixed dried herbs',
  'Sage leaves (fresh or 1 tsp dried)': 'Mixed dried herbs',
  // Spezialsalz → normales Salz
  'Salt & black salt (kala namak, optional)': 'Salt',
  'Flaky sea salt': 'Salt',
}

// Komplett streichen (mit Bordmitteln ersetzbar / nicht essenziell).
const REMOVE = new Set([
  'Cinnamon', 'Vanilla extract', 'Nutmeg', 'Bay leaf',
  'Garlic powder', 'Onion powder',
  'Mustard powder (or Dijon)', 'Mustard powder (optional)', 'Mustard seeds (optional)',
])

function transform(ing) {
  const out = []
  const seen = new Set()
  for (const [name, amt] of ing) {
    if (REMOVE.has(name)) continue
    const newName = SUBST[name] || name
    if (seen.has(newName)) continue      // Dedup innerhalb des Rezepts (erste Menge behalten)
    seen.add(newName)
    out.push([newName, amt])
  }
  return out
}

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const serialize = ing => '[' + ing.map(([n, a]) => `['${esc(n)}','${esc(a)}']`).join(',') + ']'

// Bracket-Match ab Position des '[' → Index NACH dem passenden ']'.
function matchBracket(text, open) {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    const c = text[i]
    if (c === "'") { i = text.indexOf("'", i + 1); while (text[i - 1] === '\\') i = text.indexOf("'", i + 1); continue }
    if (c === '[') depth++
    else if (c === ']') { depth--; if (depth === 0) return i + 1 }
  }
  throw new Error('unbalanced brackets')
}

let text = readFileSync(FILE, 'utf8')
let cursor = 0, changed = 0
const changes = []
for (const r of RECIPES) {
  const at = text.indexOf('ing:[', cursor)
  if (at < 0) throw new Error('ing not found for ' + r.id)
  const open = at + 'ing:'.length
  const end = matchBracket(text, open)
  const oldBlock = text.slice(open, end)
  const newIng = transform(r.ing)
  const newBlock = serialize(newIng)
  if (newBlock !== oldBlock) {
    const before = r.ing.map(x => x[0])
    const after = newIng.map(x => x[0])
    const dropped = before.filter(n => !after.includes(SUBST[n] || n) && !after.includes(n))
    changes.push({ id: r.id, removedCount: before.length - after.length, dropped })
    text = text.slice(0, open) + newBlock + text.slice(end)
    cursor = open + newBlock.length
    changed++
  } else {
    cursor = end
  }
}

console.log(`Rezepte geändert: ${changed}/${RECIPES.length}`)
for (const c of changes) console.log(`  ${c.id}: -${c.removedCount} Zutat(en)`)

const WRITE = process.argv.includes('--write')
if (WRITE) { writeFileSync(FILE, text, 'utf8'); console.log('\n✍️  recipes.js geschrieben.') }
else console.log('\n(Dry-Run — nichts geschrieben. Mit --write anwenden.)')
