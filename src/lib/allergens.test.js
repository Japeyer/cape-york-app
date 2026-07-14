import { describe, it, expect } from 'vitest'
import { ALLERGENS, filterByAllergens } from './allergens.js'

// Helper: minimaler Recipe-Mock (Generator nutzt nur recipe.ing das ein Array von [name, qty]-Tupeln ist).
function recipe(...ingredients) {
  return { id: 'r-test', ing: ingredients.map(name => [name, '1']) }
}

describe('ALLERGENS-Konstante', () => {
  it('enthält die 9 vom Configurator angebotenen Allergene/Präferenzen', () => {
    expect(ALLERGENS).toEqual(['nuts', 'gluten', 'dairy', 'eggs', 'soy', 'fish', 'shellfish', 'pork', 'garlic'])
  })
})

describe('filterByAllergens — keine User-Allergene', () => {
  it('keep:true und leere toppingAllergens-Liste', () => {
    const r = recipe('Bacon', 'Eggs', 'Bread')
    expect(filterByAllergens(r, [])).toEqual({ keep: true, toppingAllergens: [] })
    expect(filterByAllergens(r, null)).toEqual({ keep: true, toppingAllergens: [] })
    expect(filterByAllergens(r, undefined)).toEqual({ keep: true, toppingAllergens: [] })
  })
})

describe('filterByAllergens — Core-Hits → keep:false', () => {
  it('Eggs als Core-Zutat triggert eggs', () => {
    expect(filterByAllergens(recipe('2 eggs', 'Bread'), ['eggs']).keep).toBe(false)
  })
  it('Bacon als Core-Zutat triggert pork', () => {
    expect(filterByAllergens(recipe('200g bacon', 'Bread'), ['pork']).keep).toBe(false)
  })
  it('Sausages triggert pork (Australien-Pool: meist Schwein)', () => {
    expect(filterByAllergens(recipe('4 sausages'), ['pork']).keep).toBe(false)
  })
  it('Cheese triggert dairy', () => {
    expect(filterByAllergens(recipe('100g cheddar cheese'), ['dairy']).keep).toBe(false)
  })
  it('Tuna triggert fish', () => {
    expect(filterByAllergens(recipe('1 can tuna'), ['fish']).keep).toBe(false)
  })
  it('Pasta triggert gluten', () => {
    expect(filterByAllergens(recipe('250g spaghetti'), ['gluten']).keep).toBe(false)
  })
})

describe('filterByAllergens — Topping-Hits → keep:true mit Warning', () => {
  it('"Optional: bacon" — pork ist topping, nicht core', () => {
    const result = filterByAllergens(recipe('Eggs', 'Optional: bacon'), ['pork'])
    expect(result.keep).toBe(true)
    expect(result.toppingAllergens).toContain('pork')
  })
  it('"Pine nuts to garnish" — nuts ist topping', () => {
    const result = filterByAllergens(recipe('Pasta', 'Tomato sauce', 'Pine nuts to garnish'), ['nuts'])
    expect(result.keep).toBe(true)
    expect(result.toppingAllergens).toContain('nuts')
  })
  it('"Parmesan to taste" — dairy ist topping', () => {
    const result = filterByAllergens(recipe('Pasta', 'Tomato sauce', 'Parmesan to taste'), ['dairy'])
    expect(result.keep).toBe(true)
    expect(result.toppingAllergens).toContain('dairy')
  })
  it('"(optional)"-Suffix gilt als topping', () => {
    const result = filterByAllergens(recipe('Rice', 'Beans', 'Cheese (optional)'), ['dairy'])
    expect(result.keep).toBe(true)
    expect(result.toppingAllergens).toContain('dairy')
  })
})

describe('filterByAllergens — False-Positive-Filter', () => {
  it('Coconut milk triggert KEIN dairy (Plant-Milk)', () => {
    expect(filterByAllergens(recipe('400ml coconut milk', 'Curry paste'), ['dairy']).keep).toBe(true)
  })
  it('Oat milk triggert KEIN dairy', () => {
    expect(filterByAllergens(recipe('500ml oat milk'), ['dairy']).keep).toBe(true)
  })
  it('Almond milk triggert KEIN dairy (aber eventuell nuts!)', () => {
    const r = recipe('250ml almond milk')
    expect(filterByAllergens(r, ['dairy']).keep).toBe(true)
    expect(filterByAllergens(r, ['nuts']).keep).toBe(false)  // Almond IST ein Nut
  })
  it('Peanut butter triggert KEIN dairy (Plant-Butter)', () => {
    expect(filterByAllergens(recipe('2 tbsp peanut butter', 'Bread'), ['dairy']).keep).toBe(true)
  })
  it('Peanut butter triggert nuts', () => {
    expect(filterByAllergens(recipe('2 tbsp peanut butter', 'Bread'), ['nuts']).keep).toBe(false)
  })
  it('"egg-free wheat noodles" triggert KEIN eggs', () => {
    expect(filterByAllergens(recipe('200g egg-free wheat noodles', 'Veg'), ['eggs']).keep).toBe(true)
  })
  it('"gluten-free pasta" triggert KEIN gluten', () => {
    expect(filterByAllergens(recipe('250g gluten-free pasta', 'Sauce'), ['gluten']).keep).toBe(true)
  })
  it('"nut-free granola" triggert KEIN nuts', () => {
    expect(filterByAllergens(recipe('100g nut-free granola', 'Yoghurt-alt'), ['nuts']).keep).toBe(true)
  })
})

describe('filterByAllergens — Multi-Allergen', () => {
  it('1 Core-Hit reicht für keep:false (auch wenn andere clean)', () => {
    const r = recipe('200g bacon', 'Bread', 'Eggs')
    expect(filterByAllergens(r, ['nuts', 'pork', 'fish']).keep).toBe(false)
  })
  it('mehrere Topping-Hits werden alle in toppingAllergens gemeldet', () => {
    const r = recipe('Pasta', 'Tomato sauce', 'Parmesan to serve', 'Pine nuts to garnish')
    const result = filterByAllergens(r, ['dairy', 'nuts', 'fish'])
    expect(result.keep).toBe(true)
    expect(result.toppingAllergens).toEqual(expect.arrayContaining(['dairy', 'nuts']))
    expect(result.toppingAllergens).not.toContain('fish')
  })
  it('User mit 0 Allergenen sieht alles', () => {
    const r = recipe('Bacon', 'Eggs', 'Cheese', 'Tuna', 'Peanuts')
    expect(filterByAllergens(r, []).keep).toBe(true)
  })
})

describe('filterByAllergens — Wortgrenzen (\\b)', () => {
  it('"honey" matcht NICHT als nuts (kein "ney"-False-Positive)', () => {
    expect(filterByAllergens(recipe('1 tbsp honey'), ['nuts']).keep).toBe(true)
  })
  it('"hammer" (hypothetisch) matcht NICHT als pork-"ham"', () => {
    // Edge case: "Whole hammered chicken" — kein pork
    expect(filterByAllergens(recipe('Hammered chicken'), ['pork']).keep).toBe(true)
  })
})

// Garlic-Sonderfall: per Default als Topping behandelt (Knoblauch ist in fast jedem
// Gericht weglassbar ohne Qualitätsverlust). Ausnahme: Name-Match → core.
describe('filterByAllergens — Garlic (Spezial-Topping-Default)', () => {
  function recipeWithName(name, ...ingredients) {
    return { id: 'r-test', name, ing: ingredients.map(n => [n, '1']) }
  }

  it('Knoblauch in normaler Zutaten-Liste → topping (Rezept bleibt im Pool)', () => {
    const r = recipeWithName('Bolognese', 'Pasta', '3 cloves garlic', 'Tomato sauce')
    const result = filterByAllergens(r, ['garlic'])
    expect(result.keep).toBe(true)
    expect(result.toppingAllergens).toContain('garlic')
  })

  it('Kein Knoblauch in der Liste → keep:true, kein Topping-Eintrag', () => {
    const r = recipeWithName('Plain rice', 'Rice', 'Salt')
    const result = filterByAllergens(r, ['garlic'])
    expect(result.keep).toBe(true)
    expect(result.toppingAllergens).not.toContain('garlic')
  })

  it('„Garlic toast" im Namen → core (Knoblauch ist primäres Aroma)', () => {
    const r = recipeWithName('Garlic toast', 'Bread', 'Butter', 'Garlic')
    expect(filterByAllergens(r, ['garlic']).keep).toBe(false)
  })

  it('„Aglio e olio" im Namen → core', () => {
    const r = recipeWithName('Pasta aglio e olio', 'Spaghetti', 'Olive oil', 'Garlic')
    expect(filterByAllergens(r, ['garlic']).keep).toBe(false)
  })

  it('„Garlic shrimp" im Namen → core', () => {
    const r = recipeWithName('Garlic shrimp pasta', 'Shrimp', 'Pasta', 'Garlic', 'Butter')
    expect(filterByAllergens(r, ['garlic']).keep).toBe(false)
  })

  it('Garlic + andere Allergens — kombiniert', () => {
    const r = recipeWithName('Curry', 'Chicken', 'Garlic', 'Coconut milk')
    // garlic = topping (weglassbar), pork = no-match → keep, topping=['garlic']
    const result = filterByAllergens(r, ['garlic', 'pork'])
    expect(result.keep).toBe(true)
    expect(result.toppingAllergens).toEqual(['garlic'])
  })
})
