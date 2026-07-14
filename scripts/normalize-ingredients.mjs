// Einmal-Skript: vereinheitlicht Zutaten-NAMEN in src/data/recipes.js, damit dieselbe Zutat in
// jedem Rezept identisch heißt (und die Einkaufsliste jede Zutat nur EINMAL listet).
//
// Vorgehen: exakter Text-Replace von `['<alt>'` → `['<neu>'` (Zutat = erstes Array-Element in
// `ing:[[name, menge], …]`). Anker `['` + Quote → trifft NUR Zutatennamen, nie Rezeptnamen/Steps.
// Literal-Replace (split/join), damit Sonderzeichen in Namen ( ( ) + / ) kein Problem sind.
//
//   node scripts/normalize-ingredients.mjs          → Dry-Run (nur Report)
//   node scripts/normalize-ingredients.mjs --write   → schreibt recipes.js

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FILE = join(__dirname, '..', 'src', 'data', 'recipes.js')

// alt (exakt wie in recipes.js) → kanonisch. Nur echte Dubletten/Synonyme/Plurale; genuin
// verschiedene Zutaten (Cuts, Reissorten, Paprika-Typen) bleiben getrennt.
const ALIASES = {
  // Plurale / Singular-Vereinheitlichung
  'Carrots': 'Carrot',
  'Tomatoes': 'Tomato',
  'Egg': 'Eggs',
  'Sweet potatoes': 'Sweet potato',
  'Vegetable stock cubes': 'Vegetable stock cube',
  'Spring onions': 'Spring onion',
  'Spring onions (if available)': 'Spring onion',
  'Spring onions or chives': 'Spring onion',
  'Spring onions or chives (optional)': 'Spring onion',
  'Lettuce leaves': 'Lettuce',
  'Ripe banana': 'Banana',

  // Tortillas → eine Schreibweise
  'Tortilla wrap (large)': 'Tortilla wraps',
  'Tortilla wraps (large)': 'Tortilla wraps',
  'Tortillas (large)': 'Tortilla wraps',

  // Capsicum (AU-Begriff) = bell pepper
  'Bell pepper': 'Capsicum',
  'Red bell pepper': 'Red capsicum',
  'Capsicum (red)': 'Red capsicum',
  'Capsicum (red or yellow)': 'Capsicum',
  'Capsicum (red + green)': 'Capsicum',
  'Capsicum (red + yellow)': 'Capsicum',
  'Zucchini or bell pepper': 'Zucchini or capsicum',

  // Käse
  'Feta cheese': 'Feta',
  'Cheese slice (optional)': 'Cheese slices',
  'Cheese slices (cheddar)': 'Cheese slices',

  // Milch (Camping = UHT)
  'Milk': 'UHT milk',
  'UHT whole milk': 'UHT milk',
  'Milk or cream (for mash)': 'UHT milk',

  // Hühnchen (Cuts konsistent benennen)
  'Chicken breasts': 'Chicken breast',
  'Chicken breasts (fresh from Bamaga)': 'Chicken breast (fresh from Bamaga)',
  'Chicken breast (or thigh)': 'Chicken breast',
  'Chicken breast or thigh': 'Chicken breast',
  'Chicken thigh fillets': 'Chicken thighs',
  'Chicken thighs (boneless, in chunks)': 'Chicken thighs',
  'Chicken thighs (skin-on, bone-in)': 'Chicken thighs',

  // Rind
  'Beef mince (80/20)': 'Ground beef',

  // Koriander: Kraut (leaves) vs. gemahlenes Gewürz sauber trennen & je vereinheitlichen
  'Coriander (ground)': 'Ground coriander',
  'Coriander (fresh)': 'Coriander leaves',
  'Coriander (fresh, optional)': 'Coriander leaves',
  'Fresh coriander': 'Coriander leaves',
  'Fresh coriander (optional)': 'Coriander leaves',
  'Fresh coriander (or dried)': 'Coriander leaves',
  'Coriander leaves (or parsley)': 'Coriander leaves',

  // Petersilie
  'Fresh parsley': 'Parsley',
  'Fresh parsley (or 1 tsp dried)': 'Parsley',
  'Fresh parsley (or dried)': 'Parsley',
  'Fresh parsley or mint': 'Parsley',
  'Parsley (dried or fresh)': 'Parsley',

  // Ingwer
  'Fresh ginger': 'Ginger',
  'Ginger (paste or fresh)': 'Ginger',

  // Sonstige klare Dubletten
  'Tuna (canned in olive oil)': 'Tuna in oil',
  'Dried porcini mushrooms': 'Dried porcini',
  'Dried porcini (optional but transformative)': 'Dried porcini',
  'Plain flour': 'Flour',
  'Flour (plain or GF blend)': 'Flour',
  'Lentils (brown, canned)': 'Lentils',
  'Brown or green lentils (dry)': 'Lentils',
  'Bok choy or pak choy': 'Pak choi',
  'Aubergines (eggplant)': 'Eggplant',
  'Pita or flatbread': 'Pita bread',
  'Olives (mixed, kalamata)': 'Kalamata olives',
  'Hot honey or regular honey': 'Honey',
  'Honey to serve': 'Honey',
  'Sausages (good quality)': 'Sausages',

  // Gewürze mit nur einer Form (kein Kraut/Gewürz-Split wie bei Koriander) + generische Formen
  'Ground cumin': 'Cumin',
  'Ground turmeric': 'Turmeric',
  'Pepper': 'Black pepper',
  'Frozen or canned peas': 'Peas',
  'Frozen or canned spinach': 'Spinach',
  'Cornflour or rice flour': 'Cornflour',
}

const WRITE = process.argv.includes('--write')

let text = readFileSync(FILE, 'utf8')
const report = []
const zero = []
for (const [oldName, newName] of Object.entries(ALIASES)) {
  const needle = `['${oldName}',`
  const repl = `['${newName}',`
  const count = text.split(needle).length - 1
  if (count === 0) { zero.push(oldName); continue }
  text = text.split(needle).join(repl)
  report.push({ oldName, newName, count })
}

console.log('=== Replacements (alt → neu × Treffer) ===')
for (const r of report.sort((a, b) => a.newName.localeCompare(b.newName))) {
  console.log(`  ${r.oldName}  →  ${r.newName}   ×${r.count}`)
}
if (zero.length) {
  console.log('\n⚠️  ALIAS OHNE TREFFER (Tippfehler im Map-Key?):')
  for (const z of zero) console.log('   ', z)
}

// Auf Doppel-Zutaten INNERHALB eines Rezepts prüfen (nach Normalisierung).
const ingLineRx = /\bing:\s*\[([\s\S]*?)\]\s*,\s*\n\s*steps:/g
// (grobe Heuristik reicht nicht — wir prüfen unten robuster über den Import)

if (WRITE) {
  writeFileSync(FILE, text, 'utf8')
  console.log('\n✍️  recipes.js geschrieben.')
} else {
  console.log('\n(Dry-Run — nichts geschrieben. Mit --write anwenden.)')
}
