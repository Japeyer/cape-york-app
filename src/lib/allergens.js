// Allergen-/Präferenz-Detektion auf Rezept-Ebene.
// Heuristisch aus den Zutaten — kein per-Rezept-Tag nötig (51 Edits gespart).
//
// Öffentliche API: filterByAllergens(recipe, userAllergens) → { keep, toppingAllergens }
//   keep=false       → mind. ein User-Allergen ist 'core'-Zutat → Rezept ausschließen
//   toppingAllergens → ['nuts', …] für Rezepte die das Allergen nur als Topping/Optional führen
//
// Architektur-Vorgabe 1 (CLAUDE.md): isolierte Logik, Stufe 2 kann ein strukturiertes
// allergens-Tag pro Rezept anbringen ohne API-Bruch.

export const ALLERGENS = ['nuts', 'gluten', 'dairy', 'eggs', 'soy', 'fish', 'shellfish', 'pork', 'garlic']

// Pro Allergen: Vokabular für die Zutaten-Match. Wortgrenzen \b stellen sicher dass
// "honey" nicht bei "ney" matched. Schweinwürste sind im Australien-Pool fast immer
// Schwein → "sausage" wird zur pork-Liste gezählt.
const ALLERGEN_RX = {
  nuts:      /\b(nuts?|peanuts?|almonds?|cashews?|pine nuts?|hazelnuts?|walnuts?|pecans?|pistachios?|macadamias?|peanut butter)\b/i,
  gluten:    /\b(pasta|spaghetti|penne|macaroni|rigatoni|noodles?|tortilla|wraps?|tacos?|sandwich bread|sourdough|bread|toast|pita|naan|crispbread|crackers?|flour|couscous|breadcrumbs?|oats?|porridge|muesli|bread roll|baking powder)\b/i,
  dairy:     /\b(milk|butter|cheese|cheddar|parmesan|mozzarella|feta|ricotta|cream|sour cream|yoghurt|condensed milk|bocconcini)\b/i,
  eggs:      /\beggs?\b/i,
  soy:       /\b(soy sauce|soy|tofu|tempeh|edamame|miso)\b/i,
  fish:      /\b(fish|tuna|sardines?|anchovy|anchovies|salmon|cod|mackerel|fish sauce)\b/i,
  shellfish: /\b(prawns?|shrimps?|crab|lobster|mussels?|oysters?|clams?|scallops?|oyster sauce)\b/i,
  pork:      /\b(pork|bacon|ham|chorizo|sausages?|bratwurst|prosciutto|salami|kielbasa|frankfurter)\b/i,
  garlic:    /\bgarlic\b/i,
}

// Garlic-Sonderfall: in fast jedem Rezept (Curry, Pasta, Stir-Fry etc.) ist Knoblauch eine
// kleine Aroma-Zutat die ohne Qualitätsverlust weggelassen werden kann. Wir behandeln
// Garlic deshalb DEFAULT als Topping — der User kriegt eine Warnung im UI, aber das Rezept
// bleibt im Pool. Ausnahme: Rezepte wo Garlic im Namen steht oder primärer Charakter
// ist (Garlic toast, Aglio e olio, Garlic shrimp, …) → 'core', werden komplett ausgeschlossen.
const GARLIC_CORE_NAME_RX = /\b(garlic\s+(?:bread|toast|butter|shrimp|prawns|chicken)|aglio[\s-]e[\s-]olio|garlic-?heavy)\b/i

// Marker dafür dass eine Zutat NUR Topping/Optional ist und das Rezept ohne sie funktioniert.
// "to taste" ist sehr weich — gilt auch (z.B. "Chili flakes to taste").
const TOPPING_RX = /(^\s*(?:optional|if using)\s*[:.\-–])|(\bto serve\b)|(\bto taste\b)|(\bto top\b)|(\bto garnish\b)|(\bon the side\b)|(\(optional[^)]*\))|(\bif (?:you have|available)\b)/i

// Plant milks (oat/almond/soy/coconut) sollen NICHT als dairy zählen — sie matchen
// das `milk`-Wort in der dairy-Regex sonst False-Positive.
const PLANT_MILK_RX = /\b(plant milk|oat milk|almond milk|soy milk|coconut milk|rice milk|uht (?:plant|oat|almond|soy|coconut))\b/i

// "Peanut butter" / "Coconut butter" / "Almond butter" sind Nuss-/Pflanzen-Pasten,
// keine Dairy. Würden sonst "butter" in der dairy-Regex triggern.
const PLANT_BUTTER_RX = /\b(peanut butter|almond butter|cashew butter|coconut butter|sunflower butter|tahini)\b/i

// Allergen-spezifische Negationen: "egg-free", "dairy-free", "gluten-free", "nut-free" etc.
// Eine Zutat die explizit als allergen-frei beworben wird, soll natürlich nicht
// das Allergen triggern. Tritt z.B. bei "egg-free wheat noodles" auf.
function isExplicitlyFree(lower, allergen) {
  // Singular/Plural beider Schreibweisen abdecken: "egg-free" / "eggs-free" wäre seltsam,
  // aber "nut-free" / "nuts-free" beides möglich. Wir matchen auf den Stamm.
  const stem = allergen === 'eggs' ? 'egg'
             : allergen === 'nuts' ? 'nut'
             : allergen
  return new RegExp(`\\b${stem}s?-?free\\b`, 'i').test(lower)
}

function ingredientHasAllergen(name, allergen) {
  const lower = name.toLowerCase()
  if (isExplicitlyFree(lower, allergen)) return false
  if (allergen === 'dairy' && PLANT_MILK_RX.test(lower)) return false
  if (allergen === 'dairy' && PLANT_BUTTER_RX.test(lower)) {
    // Wenn die Zutat NUR Plant-Butter ist (nichts dairy daneben), kein dairy-Hit.
    // Falls die Zutat z.B. "butter and peanut butter" wäre, müsste man feiner trennen —
    // tritt im aktuellen Pool nicht auf.
    return false
  }
  return ALLERGEN_RX[allergen].test(lower)
}

function isToppingIngredient(name) {
  return TOPPING_RX.test(name)
}

// Pro Rezept × Allergen: 'core' / 'topping' / undefined.
// Wenn das Allergen in mindestens einer NICHT-Topping-Zutat vorkommt → 'core'.
// Andernfalls aber in einer Topping-Zutat → 'topping'.
//
// Sonderfall garlic: per Default als 'topping' behandelt (weglassbar), AUSSER wenn
// Garlic im Rezeptnamen das primäre Aroma signalisiert (Garlic bread, Aglio e olio etc.).
function recipeAllergenStatus(recipe, allergen) {
  // Garlic-Sonderfall: Name-Match → core, sonst topping wenn überhaupt vorhanden
  if (allergen === 'garlic') {
    let hasGarlic = false
    for (const [name] of recipe.ing) {
      if (ingredientHasAllergen(name, 'garlic')) { hasGarlic = true; break }
    }
    if (!hasGarlic) return undefined
    if (recipe.name && GARLIC_CORE_NAME_RX.test(recipe.name)) return 'core'
    return 'topping'
  }

  let toppingHit = false
  for (const [name] of recipe.ing) {
    if (!ingredientHasAllergen(name, allergen)) continue
    if (isToppingIngredient(name)) {
      toppingHit = true
    } else {
      return 'core'
    }
  }
  return toppingHit ? 'topping' : undefined
}

// Filter-API für den Generator. Liefert pro Rezept:
//   { keep: bool, toppingAllergens: ['nuts', ...] }
// keep=false  → user hat angegeben dass Allergen 'core' im Rezept ist → ausschließen
// keep=true mit toppingAllergens → Rezept geht durch, aber UI zeigt Warnung
export function filterByAllergens(recipe, userAllergens) {
  if (!userAllergens?.length) return { keep: true, toppingAllergens: [] }
  const toppingAllergens = []
  for (const a of userAllergens) {
    const s = recipeAllergenStatus(recipe, a)
    if (s === 'core')    return { keep: false, toppingAllergens: [] }
    if (s === 'topping') toppingAllergens.push(a)
  }
  return { keep: true, toppingAllergens }
}
