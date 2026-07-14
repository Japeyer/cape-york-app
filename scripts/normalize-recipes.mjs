// Einmal-Transform: vereinheitlicht Zutaten-Einheiten, fixt Konserven-Notation (can/gram),
// löst "X or Y"-Zutaten auf EINE auf, und trimmt optionale/Deko-Zutaten (moderate Vereinfachung).
// Arbeitet zeilenweise NUR auf den `ing:[...]`-Zeilen (Steps/Tips/Namen bleiben unberührt).
// Aufruf:  node scripts/normalize-recipes.mjs           (Dry-Run: zeigt Diff + Warnungen)
//          node scripts/normalize-recipes.mjs --apply   (schreibt src/data/recipes.js)
//
// Nach dem Lauf: Schritte, die eine ENTFERNTE Zutat referenzieren, manuell prüfen (Report am Ende).

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { canonicalIngredient, parseAmount } from '../src/lib/generator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(__dirname, '..', 'src', 'data', 'recipes.js')
const APPLY = process.argv.includes('--apply')

// ── 1. "X or Y" → EINE Option (Name-Auflösung). Allergen-/Meat-/Shelf-Tokens bewusst erhalten. ──
const OR_NAME = {
  'Clif Bar or protein bar': 'Protein bar',
  'Coconut milk (UHT or canned)': 'Coconut milk',
  'Plant milk (oat or soy UHT)': 'Oat milk',
  'Sourdough or sandwich bread': 'Sandwich bread',
  'Pumpkin or sunflower seeds': 'Pumpkin seeds',
  'BBQ or HP sauce': 'BBQ sauce',
  'Sausages or chorizo': 'Sausages',
  'Sandwich bread or toast': 'Sandwich bread',
  'Spinach or lettuce': 'Spinach',
  'Salsa or hot sauce': 'Salsa',
  'Crusty bread or sourdough': 'Crusty bread',
  'Chicken (leftover or canned)': 'Canned chicken',
  'Mustard or soy sauce': 'Mustard',
  'Crispbread (Wasa or similar)': 'Crispbread',
  'Lettuce or tomato (if available)': 'Lettuce',
  'Cherry tomatoes (or 1 tomato)': 'Cherry tomatoes',
  'Black or green olives': 'Black olives',
  'Almonds or cashews': 'Almonds',
  'Red wine vinegar (or lemon)': 'Red wine vinegar',
  'Spam or canned luncheon meat': 'Spam',
  'Cooked rice (leftover or instant)': 'Cooked rice',
  'Canned salmon (red or pink)': 'Canned salmon',
  'Jasmine rice or brown rice': 'Jasmine rice',
  'Jasmine or brown rice': 'Jasmine rice',
  'Soy sauce or tamari': 'Soy sauce',
  'Hummus (tub or homemade)': 'Hummus',
  'Pine nuts or sunflower seeds': 'Pine nuts',
  'Mint leaves (or parsley)': 'Mint leaves',
  'Olive or coconut oil': 'Olive oil',
  'Oil (coconut or canola)': 'Vegetable oil',
  'Zucchini or capsicum': 'Zucchini',
  'Oyster sauce or Worcestershire': 'Oyster sauce',
  'Penne or rigatoni': 'Penne',
  'Macaroni or penne': 'Macaroni',
  'Vegan butter or extra olive oil': 'Vegan butter',
  'Ricotta (vacuum-packed or fresh)': 'Ricotta',
  'Rice noodles or egg-free wheat noodles': 'Rice noodles',
  'Pak choi or cabbage': 'Pak choi',
  'Sandwich bread or naan': 'Sandwich bread',
  'Tempeh (or extra-firm tofu)': 'Tempeh',
  'Snow peas or green beans': 'Green beans',
  'Lime leaves (or lime zest)': 'Lime leaves',
  'Coconut oil or vegetable oil': 'Vegetable oil',
  'Crusty bread or toast': 'Crusty bread',
  'Tomato sauce or HP': 'Tomato sauce',
  'Butter or oil': 'Butter',
  'Vegan butter or olive oil': 'Vegan butter',
  'Hot sauce or BBQ sauce': 'BBQ sauce',
  'Maple syrup or agave': 'Maple syrup',
  'Mango (fresh or canned in juice)': 'Mango',
  'Coconut milk or oat milk': 'Coconut milk',
  'Maple syrup or honey': 'Maple syrup',
  'Greek yogurt (or coconut yogurt for vegan)': 'Greek yogurt',
  'Mixed berries (fresh or frozen)': 'Mixed berries',
  'Sourdough or burger bun': 'Burger bun',
  'Lettuce (iceberg or cos)': 'Lettuce',
  'Mixed lettuce or cos': 'Mixed lettuce',
  'Cannellini or chickpeas (canned)': 'Cannellini beans (canned)',
  'Sushi rice (or short-grain rice)': 'Sushi rice',
  'Sriracha or chili oil': 'Sriracha',
  'Tamari (or GF soy sauce)': 'Tamari',
  'Vegan parmesan or nutritional yeast': 'Nutritional yeast',
  'Tagliatelle or fettuccine': 'Tagliatelle',
  'Mushrooms (button or Swiss brown)': 'Mushrooms',
  'Plant cream (oat or soy, e.g. Oatly, Vitasoy)': 'Plant cream',
  'Plant cream (oat or soy)': 'Plant cream',
  'Thai basil (or regular basil)': 'Basil',
  'Long beans or green beans': 'Green beans',
  'Tamari or GF soy sauce': 'Tamari',
  'Oyster sauce (or vegan stir-fry sauce)': 'Oyster sauce',
  'Fish sauce (or GF substitute)': 'Fish sauce',
  'Sour cream or Greek yogurt': 'Sour cream',
  'Eggplant or zucchini': 'Eggplant',
  'Tamari or fish sauce': 'Tamari',
  'Parmesan or feta': 'Parmesan',
  'Your choice of meat (steak, chicken breast, lamb cutlets, or pork loin)': 'Beef steak',
  'Crème fraîche (or sour cream)': 'Crème fraîche',
  'Lemon juice (concentrate or fresh)': 'Lemon juice',
  'Apple juice or beer': 'Apple juice',
  'Tzatziki (jarred or pre-mixed)': 'Tzatziki',
  'Soft taco shells (or street-taco size)': 'Soft taco shells',
  'Walnuts or pecans': 'Walnuts',
  'Beef rump or scotch fillet, sliced thin': 'Beef rump, sliced thin',
  'Rice or hokkien noodles': 'Rice noodles',
  'Snake beans or green beans': 'Green beans',
}

// ── 2. Zutaten, die als OPTIONAL/Deko entfernt werden (moderate Vereinfachung). ──
// Exakte Original-Namen. Steps prüfen (Report), aber Optionals sind per Definition weglassbar.
const REMOVE_NAMES = new Set([
  'Optional: bacon',
  'Optional: butter',
  'Optional: honey',
  'Optional: pine nuts',
  'Pine nuts (optional)',
  'Pumpkin or sunflower seeds (optional)',
  'Chia or sesame seeds (optional)',
  'Sriracha or chili sauce (optional)',
  'Pomegranate or sultanas (optional)',
  'Walnuts or pine nuts (optional)',
  'Crusty bread or GF crackers',
  'Lime leaves (dried or fresh)',
])

// ── 3. Mengen-Auflösung von "or" IN der Menge (exakter Ersatz). ──
const AMT_OR = {
  '1/person (or 2 slices toast)': '1/person',
  '2/person (or naan)': '2/person',
  '1/person, ribbons or matchstick': '1/person, cut into ribbons',
  '0.5 × 400g (for both, or mash kidney beans)': '0.5 × 400g can (for both)',
  '1 tsp (or more)': '1 tsp',
  '1 squeeze (or zest if you have it)': '1 tbsp',
  '200g/person, cubed or shredded': '200g/person, cubed',
  '250g/person, par-cooked or canned, diced': '250g/person, diced',
}

// ── 4. Einheiten-Vereinheitlichung pro kanonischer Zutat: { canonicalKey: { alteMenge: neueMenge } } ──
// Zieleinheiten: Butter/Bacon/Mehl/Hummus/Pinienkerne/Spinat/SourCream → g · Öl/Zitrone/Limette →
// tbsp · Honig/Ahornsirup → ml · Ingwer/Aubergine/Tomate/Frühlingszwiebel/Pak choi → Stück ·
// Kräuter → tsp · Kirschtomaten → g · Hähnchenschenkel/Erbsen → g · Konserven → can.
const CONVERT = {
  bacon: { '4 slices/person': '60g/person', '3–4 slices/person': '50g/person' },
  butter: { '3 tbsp': '45g' },
  flour: { '1 tbsp/person (for gravy)': '10g/person (for gravy)', '3 tbsp/person': '30g/person', '2 tbsp (thickener)': '20g (thickener)' },
  hummus: { '3 tbsp (60g)/person': '60g/person', '4 tbsp (80g)/person': '80g/person' },
  'pine nuts': { '1 tbsp/person': '15g/person' },
  spinach: { '1 handful/person': '30g/person' },
  'sour cream': { '2 tbsp/person': '30g/person' },
  'coconut oil': { '30g (for both)': '2 tbsp (for both)' },
  honey: { '30ml (2 tbsp)/person': '30ml/person', '1 tsp/person': '5ml/person', '1 tbsp/person': '15ml/person', '1 tbsp': '15ml', '2 tbsp/person, for halloumi': '30ml/person, for halloumi' },
  'maple syrup': { '2 tbsp (30ml)/person': '30ml/person', '1 tbsp (15ml)/person': '15ml/person', '1 tbsp/person': '15ml/person', '1 tsp/person': '5ml/person', '2 tbsp/person': '30ml/person', '1.5 tbsp/person': '22ml/person' },
  'lemon juice': { 'a squeeze': '1 tbsp', '1 squeeze': '1 tbsp', '1 squeeze/person': '1 tbsp/person', '2 tsp/person (for dip)': '1 tbsp/person (for dip)' },
  'lime juice': { '1 squeeze': '1 tbsp' },
  ginger: { '1 tbsp': '2cm piece, grated' },
  eggplant: { '100g/person, chunked': '0.5/person, chunked' },
  tomato: { '1 large/person, thick slices': '1/person, thickly sliced', '1/person, thick slices': '1/person, thickly sliced' },
  'cherry tomatoes': { '5/person, halved': '80g/person, halved', '0.5/person, diced': '40g/person, diced' },
  'chicken thighs': { '2/person': '200g/person' },
  'spring onion': { '1 tbsp/person': '1/person' },
  'pak choi': { '1 bunch (for both)': '1/person', '0.5 head': '1/person' },
  peas: { '0.5 can (200g) for both': '100g/person' },
  chickpeas: { '250g/person': '0.6 × 400g can/person', '0.5 can (200g for both)': '0.5 × 400g can (for both)' },
  'black beans': { '100g/person': '0.25 × 400g can/person' },
  'baked beans': { '0.5 × 425g/person': '0.5 × 400g can/person' },
  'mixed dried herbs': { '1 tbsp': '1 tsp', '1 tsp/person': '1 tsp', '6 leaves/person': '1 tsp', '2 sprigs/person': '1 tsp', '3 sprigs': '1 tsp', '2 sprigs': '1 tsp' },
}

// Kanonische Keys, die Konserven sind → müssen "can" im String haben (sonst parst "1 × 400g" als Stück).
const CANNED_KEYS = new Set(['diced tomatoes', 'coconut milk', 'chickpeas', 'black beans', 'baked beans', 'white beans', 'kidney beans', 'corn', 'peas', 'refried beans', 'tuna in oil', 'canned salmon'])

// Fügt " can" nach der Größe ein, wenn eine Konserve als g/ml-Größe ohne Container notiert ist.
function canFix(amt) {
  // "1 × 400g", "0.5 × 400g (for both)", "1 × 400ml/person", "1 × 210g/person, drained"
  if (/\bcan\b|\bcans\b|carton/i.test(amt)) return amt
  const m = amt.match(/^(\d+(?:\.\d+)?\s*×\s*\d+\s*(?:g|ml))\b(.*)$/)
  if (m) return `${m[1]} can${m[2]}`
  return amt
}

// ── Verarbeitung ──
const src = fs.readFileSync(FILE, 'utf8')
const lines = src.split('\n')
const changes = []
const removed = []   // {recipe, name} für Step-Referenz-Report
const unhandled = []
let curId = null

const out = lines.map(line => {
  const idm = line.match(/\{id:'([^']+)'/)
  if (idm) curId = idm[1]
  const m = line.match(/^(\s*ing:)(\[.*\])(,\s*)$/)
  if (!m) return line

  const entryRx = /\['((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\]/g
  const kept = []
  let em
  while ((em = entryRx.exec(m[2])) !== null) {
    let name = em[1]
    let amt = em[2]
    const origName = name, origAmt = amt

    // 2) Optional/Deko entfernen
    if (REMOVE_NAMES.has(name)) { removed.push({ id: curId, name }); continue }

    // 1) Name "or" auflösen
    if (OR_NAME[name]) name = OR_NAME[name]

    // 3) Menge "or" auflösen
    if (AMT_OR[amt]) amt = AMT_OR[amt]

    // 4) Einheit vereinheitlichen (nach Name-Auflösung → kanonischer Key)
    const key = canonicalIngredient(name).key
    if (CONVERT[key] && CONVERT[key][amt] != null) amt = CONVERT[key][amt]

    // 5) Konserven-Container sicherstellen
    if (CANNED_KEYS.has(key)) amt = canFix(amt)

    if (name !== origName || amt !== origAmt) changes.push(`${curId}: ['${origName}','${origAmt}'] → ['${name}','${amt}']`)

    // Warnung: unaufgelöste "or" oder ECHTE Fehl-Parse einer Konserve (als Stück statt can/g/ml).
    // g/ml sind bei Konserven-Keys OK (packs.js führt sie via `contains` zu Dosen zusammen);
    // nur ein Stück-Parse (unit=null) wäre der eigentliche can/gram-Bug.
    const p = parseAmount(amt)
    if (/\bor\b/i.test(name) || /\bor\b/i.test(amt)) unhandled.push(`${curId}: OR bleibt in ['${name}','${amt}']`)
    if (CANNED_KEYS.has(key) && p.qty != null && p.unit == null) unhandled.push(`${curId}: Konserve parst als Stück: ['${name}','${amt}']`)

    kept.push(`['${name}','${amt}']`)
  }
  return `${m[1]}[${kept.join(',')}]${m[3]}`
})

console.log(`\n=== ${changes.length} Änderungen ===`)
changes.forEach(c => console.log('  ' + c))
console.log(`\n=== ${removed.length} entfernte (optionale) Zutaten ===`)
removed.forEach(r => console.log(`  ${r.id}: ${r.name}`))
if (unhandled.length) {
  console.log(`\n=== ⚠ ${unhandled.length} UNBEHANDELT ===`)
  unhandled.forEach(u => console.log('  ' + u))
}

if (APPLY) {
  fs.writeFileSync(FILE, out.join('\n'))
  console.log('\n✓ src/data/recipes.js geschrieben.')
} else {
  console.log('\n(Dry-Run — mit --apply schreiben)')
}
