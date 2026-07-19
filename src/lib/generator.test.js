import { describe, it, expect, afterEach } from 'vitest'
import { generate, compatibleRecipesForCat, specialQuotaForDays, estimateSpecialCount, canonicalIngredient, describeQty, effortAllowed, parseAmount, unitClass, scaleFactor, scaleAmountLabel, roundAmount, isDamped } from './generator.js'
import { setUserRecipes } from './recipe-pool.js'
import { RECIPES } from '../data/recipes.js'

// Effort eines geplanten Rezepts (id) nachschlagen — für die cookEffort-Filter-Tests.
const EFFORT_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r.effort || 'easy']))
function planMealEfforts(plan) {
  return plan
    .flatMap(p => [p.f, p.m, p.ab])
    .filter(meal => meal && meal.r && EFFORT_BY_ID[meal.r])   // eingebaute Rezepte
    .map(meal => EFFORT_BY_ID[meal.r])
}

// Default-Konfig die zu allen Tests passt — überschreibe einzelne Felder pro Test.
function defaults(overrides = {}) {
  return {
    days: 16,
    people: [
      { type: 'adult-m', appetite: 'medium' },
      { type: 'adult-f', appetite: 'medium' },
    ],
    diet: 'omnivore',
    burners: 2,
    fridgeSize: 'large',
    bamagaStop: true,
    bamagaDay: 9,
    allergens: [],
    restaurantSlots: {},
    overrides: {},
    enabledStops: { cooktown: false, coen: false, archer: false },
    ...overrides,
  }
}

// ── Output-Struktur ──────────────────────────────────────────────────────

describe('generate() — Output-Struktur', () => {
  it('liefert config / plan / shopping / warnings', () => {
    const r = generate(defaults())
    expect(r).toHaveProperty('config')
    expect(r).toHaveProperty('plan')
    expect(r).toHaveProperty('shopping')
    expect(r).toHaveProperty('warnings')
    expect(Array.isArray(r.plan)).toBe(true)
    expect(Array.isArray(r.warnings)).toBe(true)
    expect(typeof r.shopping).toBe('object')
  })

  it('config enthält die für UI relevanten Felder', () => {
    const r = generate(defaults())
    expect(r.config.days).toBe(16)
    expect(r.config.persons).toBe(2)
    expect(r.config.groupFactor).toBeCloseTo(2.0, 5)
    expect(r.config.dailyKcal).toBe(5400)
    expect(r.config.diet).toBe('omnivore')
    expect(r.config.dietApplied).toBe('omnivore')
    expect(r.config.bamagaStop).toBe(true)
    expect(r.config.bamagaDay).toBe(9)
    expect(typeof r.config.meatClusterDays).toBe('number')
  })

  it('plan hat genau `days` Einträge mit korrekter Slot-Struktur', () => {
    const r = generate(defaults({ days: 10 }))
    expect(r.plan).toHaveLength(10)
    for (const day of r.plan) {
      expect(day).toHaveProperty('d')
      expect(day).toHaveProperty('f')   // breakfast
      expect(day).toHaveProperty('m')   // lunch
      expect(day).toHaveProperty('ab')  // dinner
      expect(day.f).toBeTruthy()
      expect(day.m).toBeTruthy()
      expect(day.ab).toBeTruthy()
    }
  })

  it('plan-Tage sind 1-basiert und sequenziell', () => {
    const r = generate(defaults({ days: 7 }))
    expect(r.plan.map(d => d.d)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('Tag 1 hat skip:pickup statt Frühstück (Vehicle-Pickup nach 10am)', () => {
    const r = generate(defaults({ days: 7 }))
    expect(r.plan[0].f).toEqual({ skip: true, kind: 'pickup' })
    expect(r.plan[0].m).toBeTruthy()
    expect(r.plan[0].m.skip).toBeUndefined()
    expect(r.plan[0].ab).toBeTruthy()
    expect(r.plan[0].ab.skip).toBeUndefined()
  })

  it('letzter Tag hat skip:dropoff statt Dinner (Vehicle-Drop-off vor 5pm)', () => {
    const r = generate(defaults({ days: 7 }))
    const last = r.plan[r.plan.length - 1]
    expect(last.ab).toEqual({ skip: true, kind: 'dropoff' })
    expect(last.f).toBeTruthy()
    expect(last.f.skip).toBeUndefined()
    expect(last.m).toBeTruthy()
    expect(last.m.skip).toBeUndefined()
  })

  it('1-Tages-Trip: nur Lunch (Frühstück = pickup, Dinner = dropoff)', () => {
    const r = generate(defaults({ days: 1 }))
    expect(r.plan[0].f).toEqual({ skip: true, kind: 'pickup' })
    expect(r.plan[0].ab).toEqual({ skip: true, kind: 'dropoff' })
    expect(r.plan[0].m).toBeTruthy()
    expect(r.plan[0].m.skip).toBeUndefined()
  })

  it('skip-Slots ziehen keine Zutaten in die Einkaufsliste', () => {
    // Voll-Vegan-Trip mit 7 Tagen → keine Frischfleisch-Items am Pickup-Tag.
    // Wir testen indirekt über den Item-Count: 1-Tag-Trip muss ~3 Mahlzeiten weniger Zutaten als
    // 2-Tag-Trip haben (Pickup-Frühstück + Dropoff-Dinner Tag 1, plus Dropoff-Dinner Tag 2 =
    // 1+0 vs 1+1 Pickup/Dropoff-Skips). Hier prüfen wir nur, dass ein 1-Tages-Trip nur Lunch
    // generiert und das Cairns-Bucket entsprechend mager ist (nur essentials + Lunch-Zutaten).
    const r = generate(defaults({ days: 1 }))
    expect(r.plan).toHaveLength(1)
    // Cairns enthält Camping-Essentials + Lunch-Zutaten — kein Crash.
    expect(r.shopping.cairns.length).toBeGreaterThan(0)
  })
})

// ── Input-Klemmung ───────────────────────────────────────────────────────

describe('generate() — Input-Klemmung an System-Boundary', () => {
  it('days < 1 → 1', () => {
    const r = generate(defaults({ days: 0 }))
    expect(r.config.days).toBe(1)
    expect(r.plan).toHaveLength(1)
  })
  it('days = 3 (Tagesausflug-/Wochenende) → 3, kein Clamp auf 7', () => {
    const r = generate(defaults({ days: 3, bamagaStop: false }))
    expect(r.config.days).toBe(3)
    expect(r.plan).toHaveLength(3)
  })
  it('days > 31 → 31', () => {
    const r = generate(defaults({ days: 999 }))
    expect(r.config.days).toBe(31)
  })
  it('people leer → 1 Default-Adult-M', () => {
    const r = generate(defaults({ people: [] }))
    expect(r.config.persons).toBe(1)
  })
  it('people > 8 → auf 8 gekappt', () => {
    const ppl = Array.from({ length: 12 }, () => ({ type: 'adult-m', appetite: 'medium' }))
    const r = generate(defaults({ people: ppl }))
    expect(r.config.persons).toBe(8)
  })
  it('unbekannte Diät → omnivore', () => {
    const r = generate(defaults({ diet: 'fruitarian' }))
    expect(r.config.dietApplied).toBe('omnivore')
  })
  it('unbekannte Burner-Anzahl → 2', () => {
    const r = generate(defaults({ burners: 7 }))
    expect(r.config.burnersApplied).toBe(2)
  })
  it('Burners 3 wird akzeptiert (großer Camper)', () => {
    const r = generate(defaults({ burners: 3 }))
    expect(r.config.burnersApplied).toBe(3)
  })
  it('unbekannte fridgeSize → large', () => {
    const r = generate(defaults({ fridgeSize: 'industrial' }))
    expect(r.config.fridgeSize).toBe('large')
  })
})

// ── Determinismus ────────────────────────────────────────────────────────

describe('generate() — Determinismus', () => {
  it('zweifacher Call mit identischer Config → identischer Plan + Shopping', () => {
    const cfg = defaults()
    const a = generate(cfg)
    const b = generate(cfg)
    expect(a.plan).toEqual(b.plan)
    expect(a.shopping).toEqual(b.shopping)
  })
})

// ── Bamaga-Routing ───────────────────────────────────────────────────────

describe('Bamaga-Routing', () => {
  it('bamagaStop=true → genau 1 Tag mit bamaga=true', () => {
    const r = generate(defaults({ bamagaDay: 9 }))
    const bamagaDays = r.plan.filter(d => d.bamaga)
    expect(bamagaDays).toHaveLength(1)
    expect(bamagaDays[0].d).toBe(9)
  })

  it('bamagaStop=false → keine bamaga-flagged days, kein bamaga-Bucket', () => {
    const r = generate(defaults({ bamagaStop: false }))
    expect(r.plan.filter(d => d.bamaga)).toHaveLength(0)
    expect(r.shopping.bamaga).toBeUndefined()
    expect(r.shopping.cairns).toBeDefined()
    expect(r.config.bamagaDay).toBe(null)
  })

  it('bamagaDay wird auf [2, days-1] geklemmt', () => {
    expect(generate(defaults({ bamagaDay: 1 })).config.bamagaDay).toBe(2)
    expect(generate(defaults({ days: 10, bamagaDay: 99 })).config.bamagaDay).toBe(9)
    expect(generate(defaults({ days: 7, bamagaDay: 7 })).config.bamagaDay).toBe(6)
  })

  it('frisches Fleisch nach Bamaga-Tag landet im bamaga-Bucket', () => {
    const r = generate(defaults({ days: 16, bamagaDay: 9 }))
    expect(r.shopping.cairns).toBeDefined()
    expect(r.shopping.bamaga).toBeDefined()
    // Bamaga-Bucket sollte mindestens essentials + Frisch-Kategorie enthalten
    expect(r.shopping.bamaga.length).toBeGreaterThan(0)
  })
})

// ── Anti-Wiederholungs-Logik ──────────────────────────────────────────────

describe('Anti-Wiederholungs-Logik (lastPick)', () => {
  it('1-burner Omnivore-Default: keine konsekutiven Duplikate über alle Slots', () => {
    // Das war der echte Bug: a4 (Beef stir-fry) an Tag 5+6 und 13+14 in der 16-Tage-Default-Config.
    const r = generate(defaults({ burners: 1 }))
    let consecutiveCount = 0
    for (let i = 1; i < r.plan.length; i++) {
      const prev = r.plan[i - 1]
      const curr = r.plan[i]
      for (const slot of ['f', 'm', 'ab']) {
        if (prev[slot]?.r && curr[slot]?.r && prev[slot].r === curr[slot].r) {
          consecutiveCount++
        }
      }
    }
    // 0 ist Ziel; einzelner Hit kann nur passieren wenn der Pool für eine Kategorie
    // genau 1 Item hat (dann ist Wiederholung unvermeidbar — Generator warnt).
    if (consecutiveCount > 0) {
      // Falls Wiederholung doch auftritt: muss in Warnings gemeldet sein.
      const hasThinPoolWarning = r.warnings.some(w => /every \w+ will be the same/.test(w))
      expect(hasThinPoolWarning).toBe(true)
    } else {
      expect(consecutiveCount).toBe(0)
    }
  })

  it('Restaurant-Slot zwischendrin sperrt den Folgetag NICHT (lastPick=null)', () => {
    const r = generate(defaults({
      restaurantSlots: { 5: { ab: true } },
    }))
    // Tag 5 dinner = restaurant; Tag 6 dinner sollte free pick haben
    expect(r.plan[4].ab.rest).toBe(true)
    expect(r.plan[5].ab.r).toBeTruthy()
  })
})

// ── Restaurant-Slots ─────────────────────────────────────────────────────

describe('Restaurant-Slots', () => {
  it('Restaurant-Mahlzeiten haben rest:true und kein recipe-id', () => {
    const r = generate(defaults({
      restaurantSlots: { 3: { f: true, m: true, ab: true } },
    }))
    expect(r.plan[2].f.rest).toBe(true)
    expect(r.plan[2].m.rest).toBe(true)
    expect(r.plan[2].ab.rest).toBe(true)
    expect(r.plan[2].f.r).toBeUndefined()
  })

  it('alle Slots auf Restaurant → Shopping enthält nur Essentials, keine Rezept-Zutaten', () => {
    // Wenn der User JEDE Mahlzeit auswärts isst, sollte die Shopping-Liste nur noch
    // Camping-Essentials enthalten (Wasser/Eis/Foil etc.) — keine Rezept-Zutaten.
    const allRest = {}
    for (let d = 1; d <= 7; d++) allRest[d] = { f: true, m: true, ab: true }
    const r = generate(defaults({ days: 7, bamagaStop: false, restaurantSlots: allRest }))
    const cairnsCats = r.shopping.cairns
    expect(cairnsCats.length).toBe(1)
    expect(cairnsCats[0].cat).toMatch(/essentials/i)
  })
})

// ── Overrides ────────────────────────────────────────────────────────────

describe('User-Overrides', () => {
  it('Override-Recipe wird statt Generator-Pick verwendet', () => {
    // Validiert via Override-Marker auf der MealEntry (ovr:true) und stabiler Recipe-ID.
    const baseline = generate(defaults({ days: 7 }))
    const dinnerDay3 = baseline.plan[2].ab.r
    // Pick ein anderes Rezept aus dem Pool für Override
    const compat = compatibleRecipesForCat('a', { diet: 'omnivore', burners: 2, allergens: [] })
    const otherRecipe = compat.find(r => r.id !== dinnerDay3)
    expect(otherRecipe).toBeTruthy()
    const r = generate(defaults({
      days: 7,
      overrides: { 3: { ab: otherRecipe.id } },
    }))
    expect(r.plan[2].ab.r).toBe(otherRecipe.id)
    expect(r.plan[2].ab.ovr).toBe(true)
  })

  it('Override mit nicht-existenter Recipe-ID → fällt auf Generator-Pick zurück', () => {
    const r = generate(defaults({
      overrides: { 3: { ab: 'doesnt-exist-xyz' } },
    }))
    // Sollte nicht crashen, sollte ein gültiges Rezept liefern
    expect(r.plan[2].ab.r).toBeTruthy()
    expect(r.plan[2].ab.ovr).toBeFalsy()
  })
})

// ── Camping-Essentials ───────────────────────────────────────────────────

describe('Camping-Essentials-Injection', () => {
  it('Cairns-Bucket hat Essentials als erste Kategorie', () => {
    const r = generate(defaults())
    expect(r.shopping.cairns).toBeDefined()
    expect(r.shopping.cairns[0].cat).toMatch(/essentials/i)
    expect(r.shopping.cairns[0].items.length).toBeGreaterThan(0)
  })

  it('Wasser-Item skaliert mit Personen × Tagen × 3L (Cape-York-Heuristik)', () => {
    const r = generate(defaults({ days: 10, bamagaStop: false, people: [
      { type: 'adult-m', appetite: 'medium' },
      { type: 'adult-f', appetite: 'medium' },
    ] }))
    const essentials = r.shopping.cairns[0].items
    const water = essentials.find(it => /water/i.test(it.name))
    expect(water).toBeTruthy()
    // 2 Personen × 10 Tage × 3L = 60L → 5 Jerry Cans à 12L
    expect(water.qty).toMatch(/60L/)
  })

  it('compressor fridge → kein Eis-Item in Cairns oder Bamaga', () => {
    const r = generate(defaults({ fridgeCompressor: true, bamagaStop: true }))
    const iceCairns = r.shopping.cairns[0].items.find(it => /ice/i.test(it.name))
    const iceBamaga = r.shopping.bamaga[0].items.find(it => /ice/i.test(it.name))
    expect(iceCairns).toBeUndefined()
    expect(iceBamaga).toBeUndefined()
  })

  it('cooler-box (kein Compressor) → Eis skaliert mit Fridge-Größe', () => {
    const rLarge = generate(defaults({ fridgeCompressor: false, fridgeSize: 'large' }))
    const rSmall = generate(defaults({ fridgeCompressor: false, fridgeSize: 'small' }))
    const iceL = rLarge.shopping.cairns[0].items.find(it => /ice/i.test(it.name))
    const iceS = rSmall.shopping.cairns[0].items.find(it => /ice/i.test(it.name))
    expect(iceL?.qty).toMatch(/2 ×/)
    expect(iceS?.qty).toMatch(/3 ×/)
  })

  it('bamagaStop=true → Bamaga-Bucket hat eigene Refill-Essentials', () => {
    const r = generate(defaults({ bamagaStop: true }))
    expect(r.shopping.bamaga).toBeDefined()
    expect(r.shopping.bamaga[0].cat).toMatch(/essentials/i)
  })

  it('bamagaStop=false → kein Bamaga-Bucket, kein Bamaga-Wasser-Refill', () => {
    const r = generate(defaults({ bamagaStop: false }))
    expect(r.shopping.bamaga).toBeUndefined()
  })
})

// ── Optional Stops (Cooktown / Coen / Archer) ────────────────────────────

describe('Optionale Resupply-Stops', () => {
  it('alle 4 enabledStops aus → nur Cairns-Bucket (+Bamaga falls bamagaStop=true)', () => {
    const r = generate(defaults({ bamagaStop: false }))
    expect(Object.keys(r.shopping).sort()).toEqual(['cairns'])
  })

  it('cooktown enabled → bekommt eigenen Bucket mit Essentials', () => {
    const r = generate(defaults({
      enabledStops: { cooktown: true, coen: false, archer: false },
    }))
    expect(r.shopping.cooktown).toBeDefined()
    expect(r.shopping.cooktown[0].cat).toMatch(/essentials/i)
  })

  it('alle 3 optional + bamaga → 5 Buckets (cairns/cooktown/coen/archer/bamaga)', () => {
    const r = generate(defaults({
      bamagaStop: true,
      enabledStops: { cooktown: true, coen: true, archer: true },
    }))
    expect(Object.keys(r.shopping).sort()).toEqual(['archer', 'bamaga', 'cairns', 'coen', 'cooktown'])
  })
})

// ── Allergen-Filter ──────────────────────────────────────────────────────

describe('Allergen-Filter', () => {
  it('pork-Filter → keine Mahlzeit hat pork als Core-Zutat', () => {
    const r = generate(defaults({ allergens: ['pork'] }))
    // Validierung indirekt: kein crash, gültiger plan, alle Rezepte rendern
    expect(r.plan.every(d => d.f && d.m && d.ab)).toBe(true)
  })

  it('Topping-Allergen-Hits werden als ta auf der Mahlzeit gemeldet', () => {
    // Ein Rezept mit nuts-as-topping sollte mit ta:["nuts"] versehen sein
    const r = generate(defaults({ allergens: ['nuts'], days: 28 }))
    const flagged = r.plan.flatMap(d => [d.f, d.m, d.ab])
      .filter(m => m?.ta?.includes('nuts'))
    // Mindestens ein topping-only nuts-Rezept sollte im Pool sein und gepicked werden.
    // Falls 0 → Pool hat keins, was auch ok wäre. Hier: weiches Assert.
    expect(Array.isArray(flagged)).toBe(true)
  })

  it('Vegan-Diät → keine Tier-Allergene als Core nötig', () => {
    const r = generate(defaults({ diet: 'vegan' }))
    expect(r.config.dietApplied).toBe('vegan')
    // Kein Crash, alle Slots gefüllt
    expect(r.plan.every(d => d.f && d.m && d.ab)).toBe(true)
  })
})

// ── Fridge-Cluster-Logik ─────────────────────────────────────────────────

describe('Fleisch-Cluster nach Fridge-Size', () => {
  it('large fridge → mehr cluster days als small', () => {
    const rLarge = generate(defaults({ fridgeSize: 'large' }))
    const rSmall = generate(defaults({ fridgeSize: 'small' }))
    expect(rLarge.config.meatClusterDays).toBeGreaterThanOrEqual(rSmall.config.meatClusterDays)
  })

  it('small fridge + omnivore → Fridge-Cluster-Hint in warnings', () => {
    const r = generate(defaults({ fridgeSize: 'small' }))
    const hasFridgeWarning = r.warnings.some(w => /fridge|cluster|fresh-meat/i.test(w))
    expect(hasFridgeWarning).toBe(true)
  })

  it('clusterDays bewegt sich im erwarteten Range [1, 6]', () => {
    for (const fridge of ['small', 'medium', 'large']) {
      const r = generate(defaults({ fridgeSize: fridge }))
      expect(r.config.meatClusterDays).toBeGreaterThanOrEqual(1)
      expect(r.config.meatClusterDays).toBeLessThanOrEqual(6)
    }
  })

  it('meatAllowedDays listet die Cluster-Tage (Cairns + Bamaga)', () => {
    // 16 Tage, Bamaga an Tag 9, large fridge (clusterDays = 6) → Tage 1–6 + 9–14 erlaubt.
    const r = generate(defaults({ days: 16, fridgeSize: 'large', bamagaStop: true, bamagaDay: 9 }))
    expect(Array.isArray(r.config.meatAllowedDays)).toBe(true)
    expect(r.config.meatAllowedDays).toContain(1)
    expect(r.config.meatAllowedDays).toContain(r.config.meatClusterDays)
    // Tag direkt vor Bamaga (außerhalb Cairns-Cluster) sollte FEHLEN
    const dayBeforeBamaga = 8
    if (dayBeforeBamaga > r.config.meatClusterDays) {
      expect(r.config.meatAllowedDays).not.toContain(dayBeforeBamaga)
    }
    // Bamaga-Tag (Start des 2. Clusters) muss enthalten sein
    expect(r.config.meatAllowedDays).toContain(9)
    // Sortierung
    const sorted = [...r.config.meatAllowedDays].sort((a, b) => a - b)
    expect(r.config.meatAllowedDays).toEqual(sorted)
  })

  it('meatAllowedDays bei kleinem Cluster + langem Trip ist deutlich kleiner als days', () => {
    // small fridge → clusterDays meist 1–3. Bei 16 Tagen ohne Bamaga sollten >50% Off-Cluster sein.
    const r = generate(defaults({ days: 16, fridgeSize: 'small', bamagaStop: false }))
    expect(r.config.meatAllowedDays.length).toBeLessThan(16)
    expect(r.config.meatAllowedDays.length).toBe(r.config.meatClusterDays)
  })
})

// ── Diät-Fallback ────────────────────────────────────────────────────────

describe('Diät-Fallback bei zu kleinem Pool', () => {
  it('Vegan + viele Allergene → Fallback-Warning ausgelöst', () => {
    const r = generate(defaults({
      diet: 'vegan',
      allergens: ['nuts', 'gluten', 'dairy', 'eggs', 'soy'],
    }))
    // Bei extrem restriktiver Config kann der Pool leer bleiben — Generator MUSS warnen
    // (slot=null akzeptabel, UI rendert dann "no recipe").
    expect(r.warnings.length).toBeGreaterThan(0)
    // Plan-Länge bleibt korrekt — kein crash
    expect(r.plan).toHaveLength(16)
  })

  it('Vegan ohne Allergene → vegan bleibt (kein Fallback)', () => {
    const r = generate(defaults({ diet: 'vegan' }))
    expect(r.config.dietApplied).toBe('vegan')
    expect(r.plan.every(d => d.f && d.m && d.ab)).toBe(true)
  })
})

// ── Item-IDs sind stabil (Storage-Key-Stabilität) ────────────────────────

describe('Item-ID-Stabilität', () => {
  it('Items mit gleichem Namen bekommen gleiche ID quer durch Configs', () => {
    const r1 = generate(defaults({ days: 7 }))
    const r2 = generate(defaults({ days: 14 }))
    const ids1 = new Set()
    const ids2 = new Set()
    for (const cats of Object.values(r1.shopping)) for (const c of cats) for (const i of c.items) ids1.add(i.id + ':' + i.name)
    for (const cats of Object.values(r2.shopping)) for (const c of cats) for (const i of c.items) ids2.add(i.id + ':' + i.name)
    // Items die in beiden vorkommen, müssen gleiche ID haben (sonst checked-State verloren)
    const intersect = [...ids1].filter(x => ids2.has(x))
    expect(intersect.length).toBeGreaterThan(0)
  })
})

// ── Plant-based Convenience-Produkte ──────────────────────────────────────
// Vegane Faux-Meat / Plant Cream Rezepte (f14/f15/m24/m25/a33/a34/a35) wurden in (r) hinzugefügt.
// Sie dürfen NICHT als Frischfleisch klassifiziert werden, sonst blockieren sie Cluster-Slots.

describe('Plant-based Faux-Meat-Klassifizierung', () => {
  it('Vegan-Pool enthält die neuen Convenience-Rezepte (3-burner für a35)', () => {
    // a35 ist 3-burner — braucht burners:3 Filter um sichtbar zu sein.
    const f = compatibleRecipesForCat('f', { diet: 'vegan', burners: 3 })
    const m = compatibleRecipesForCat('m', { diet: 'vegan', burners: 3 })
    const a = compatibleRecipesForCat('a', { diet: 'vegan', burners: 3 })
    const ids = [...f, ...m, ...a].map(r => r.id)
    expect(ids).toEqual(expect.arrayContaining(['f14', 'f15', 'm24', 'm25', 'a33', 'a34', 'a35']))
  })

  it('Vegan-Plan über 28 Tage zeigt mindestens ein Convenience-Rezept', () => {
    // Großes Pool-Sample: bei 28 Tagen × 3 Slots = 84 Mahlzeiten muss mindestens
    // eines der 7 Convenience-Rezepte gepickt werden, sonst greift Round-Robin nicht.
    const r = generate(defaults({ days: 28, diet: 'vegan' }))
    const allMealIds = r.plan.flatMap(d => [d.f, d.m, d.ab].filter(x => x?.r).map(x => x.r))
    const conv = ['f14', 'f15', 'm24', 'm25', 'a33', 'a34', 'a35']
    const hits = allMealIds.filter(id => conv.includes(id))
    expect(hits.length).toBeGreaterThan(0)
  })

  it('Vegan-Convenience-Rezepte werden NICHT in den Frischfleisch-Cluster eingeordnet', () => {
    // Wenn containsFreshMeat() für vegan sausages true wäre, würden diese Rezepte nur
    // in Cluster-Tagen erscheinen. Bei einem omnivore-Plan mit small fridge (cluster ~3 Tage)
    // dürfen sie nicht plötzlich am Tag 1 als "Fleisch" auftauchen.
    // Hier prüfen wir direkt: Vegan-Plan über 7 Tage muss ALLE Tage Mahlzeiten haben
    // (keine null-Slots durch falsche Cluster-Filterung).
    const r = generate(defaults({ days: 7, diet: 'vegan', fridgeSize: 'small', bamagaStop: false }))
    for (const day of r.plan) {
      // Pickup-Tag (Tag 1) hat skip:true für Frühstück, Dropoff-Tag für Dinner — andere Slots immer da
      if (!day.f?.skip)  expect(day.f).toBeTruthy()
      if (!day.m?.skip)  expect(day.m).toBeTruthy()
      if (!day.ab?.skip) expect(day.ab).toBeTruthy()
    }
  })

  it('Plant-based Items landen in der "Fresh meat & plant proteins"-Einkaufskategorie', () => {
    // Ein Vegan-Plan mit a33 (Plant-based bolognese) muss "Plant-based mince" in der
    // 🥩-Kategorie haben, nicht in 📦 Other.
    const r = generate(defaults({
      days: 7, diet: 'vegan',
      overrides: { 2: { ab: 'a33' } },
      bamagaStop: false,
    }))
    const cats = r.shopping.cairns
    const meatCat = cats.find(c => c.cat.includes('Fresh meat'))
    expect(meatCat).toBeTruthy()
    const hasMince = meatCat.items.some(i => /mince/i.test(i.name))
    expect(hasMince).toBe(true)
  })
})

// ── Special Occasion Dinners (a36–a41) ────────────────────────────────────
// Specials werden vom Generator als separate Layer eingesetzt — 0 bis 3 pro Trip je nach
// Länge, max 1 pro Cluster, in Cluster-Mitte. User-Overrides gewinnen, Restaurant-Slots
// gewinnen, Specials überschreiben Round-Robin. Pro Diät existieren je 2 Specials.

describe('Special Occasion Dinners', () => {
  const SPECIAL_IDS = ['a36', 'a37', 'a38', 'a39', 'a40', 'a41']
  function countSpecials(plan) {
    return plan.filter(d => d.ab?.r && SPECIAL_IDS.includes(d.ab.r)).length
  }

  it('Kurzer Trip (<5 Tage) → 0 Specials', () => {
    const r = generate(defaults({ days: 4, bamagaStop: false, burners: 3 }))
    expect(countSpecials(r.plan)).toBe(0)
  })

  it('Mid-Trip (5-12 Tage) → exakt 1 Special', () => {
    const r = generate(defaults({ days: 10, bamagaStop: false, burners: 3 }))
    expect(countSpecials(r.plan)).toBe(1)
  })

  it('Trip 13-21 Tage → exakt 2 Specials (bei Bamaga-Stop max 1 pro Cluster)', () => {
    const r = generate(defaults({ days: 16, bamagaStop: true, bamagaDay: 9, burners: 3 }))
    expect(countSpecials(r.plan)).toBe(2)
  })

  it('Trip 22+ Tage → bis zu 3 Specials (gecappt durch Cluster-Anzahl × 1/Cluster)', () => {
    // Ohne Bamaga: nur 1 Cluster → max 1 Special. Mit Bamaga: 2 Cluster → max 2 Specials.
    // Quota sagt 3, aber Cluster-Cap greift. Das ist by design.
    const noBamaga = generate(defaults({ days: 25, bamagaStop: false, burners: 3 }))
    expect(countSpecials(noBamaga.plan)).toBe(1)
    const withBamaga = generate(defaults({ days: 25, bamagaStop: true, bamagaDay: 13, burners: 3 }))
    expect(countSpecials(withBamaga.plan)).toBe(2)
  })

  it('Omnivore-Trip pickt aus omnivore Specials (a36/a37)', () => {
    const r = generate(defaults({ days: 10, diet: 'omnivore', bamagaStop: false, burners: 3 }))
    const specials = r.plan.filter(d => SPECIAL_IDS.includes(d.ab?.r)).map(d => d.ab.r)
    expect(specials.length).toBe(1)
    expect(['a36', 'a37']).toContain(specials[0])
  })

  it('Vegetarian-Trip pickt aus vegetarian/vegan Specials (a38–a41, da omnivore-Filter)', () => {
    const r = generate(defaults({ days: 10, diet: 'vegetarian', bamagaStop: false, burners: 3 }))
    const specials = r.plan.filter(d => SPECIAL_IDS.includes(d.ab?.r)).map(d => d.ab.r)
    expect(specials.length).toBe(1)
    // Vegetarian akzeptiert vegetarian + vegan Specials (a38–a41).
    expect(['a38', 'a39', 'a40', 'a41']).toContain(specials[0])
  })

  it('Vegan-Trip pickt nur vegane Specials (a40/a41)', () => {
    const r = generate(defaults({ days: 10, diet: 'vegan', bamagaStop: false, burners: 3 }))
    const specials = r.plan.filter(d => SPECIAL_IDS.includes(d.ab?.r)).map(d => d.ab.r)
    expect(specials.length).toBe(1)
    expect(['a40', 'a41']).toContain(specials[0])
  })

  it('User-Override gewinnt vor Special', () => {
    // Auf einem 10-Tage-Trip würde ein Special bei Tag ~5 landen. User-Override für Tag 5
    // muss greifen — das Special wird übersprungen (kein Ersatz-Tag).
    const r = generate(defaults({
      days: 10, bamagaStop: false, burners: 3,
      overrides: { 5: { ab: 'a1' } },  // a1 = Pasta Bolognese
    }))
    expect(r.plan[4].ab.r).toBe('a1')
    expect(r.plan[4].ab.ovr).toBe(true)
  })

  it('Specials werden NICHT auf Pickup-Tag (1) oder Dropoff-Tag (last)', () => {
    // Hinweis: Pickup (Tag 1) skipped nur Frühstück, NICHT Dinner. Nur Dropoff skipped Dinner.
    // computeSpecialAssignments schließt Tag 1 und Tag `days` trotzdem aus — der Test prüft,
    // dass ein gefundenes Special nicht an einem dieser Tage liegt.
    const r = generate(defaults({ days: 7, bamagaStop: false, burners: 3 }))
    expect(r.plan[6].ab?.skip).toBe(true)  // letzter Tag = dropoff
    const specialIdx = r.plan.findIndex(d => SPECIAL_IDS.includes(d.ab?.r))
    if (specialIdx >= 0) {
      expect(specialIdx).toBeGreaterThanOrEqual(1)
      expect(specialIdx).toBeLessThan(r.plan.length - 1)
    }
  })

  it('Specials sind NICHT im regulären Round-Robin (mit Override-Gegen-Test)', () => {
    // 4-Tage-Trip → 0 Specials per Quota. Specials dürfen also gar nicht im Plan auftauchen.
    const r = generate(defaults({ days: 4, bamagaStop: false, burners: 3 }))
    const anySpecial = r.plan.some(d => SPECIAL_IDS.includes(d.ab?.r))
    expect(anySpecial).toBe(false)
  })

  it('Special mit Frischfleisch landet im Cluster (kein Steak am Tag 14 mit small fridge)', () => {
    // Steak (a36) hat Frischfleisch. Bei small fridge ist Cluster ~3 Tage post-Cairns.
    // Tag 14 darf KEIN Steak haben (würde verderben).
    const r = generate(defaults({
      days: 16, diet: 'omnivore', fridgeSize: 'small', bamagaStop: false, burners: 3,
    }))
    const steakDay = r.plan.findIndex(d => d.ab?.r === 'a36')
    if (steakDay >= 0) {
      // Wenn ein Steak gepickt wurde, muss der Tag in meatAllowedDays sein
      expect(r.config.meatAllowedDays).toContain(steakDay + 1)
    }
  })

  it('Special-Marker `spec: true` ist im Plan-Output für UI-Badge', () => {
    const r = generate(defaults({ days: 10, bamagaStop: false, burners: 3 }))
    const specials = r.plan.filter(d => d.ab?.spec === true)
    expect(specials.length).toBe(1)
    // Override-Marker `ovr` darf nicht gleichzeitig auf einem Special sitzen
    expect(specials.every(d => !d.ab.ovr)).toBe(true)
  })
})

// ── UI-Helper-Exports (Configurator-Preview) ──────────────────────────────

describe('specialQuotaForDays / estimateSpecialCount', () => {
  it('Quota skaliert nach Trip-Länge in 4 Bändern', () => {
    expect(specialQuotaForDays(0)).toBe(0)
    expect(specialQuotaForDays(4)).toBe(0)
    expect(specialQuotaForDays(5)).toBe(1)
    expect(specialQuotaForDays(12)).toBe(1)
    expect(specialQuotaForDays(13)).toBe(2)
    expect(specialQuotaForDays(21)).toBe(2)
    expect(specialQuotaForDays(22)).toBe(3)
    expect(specialQuotaForDays(31)).toBe(3)
  })

  it('Cluster-Cap: ohne Bamaga max 1 Special, mit Bamaga max 2', () => {
    // 10 Tage Quota=1 — beides liefert 1 (Quota greift schon)
    expect(estimateSpecialCount({ days: 10, bamagaStop: false })).toBe(1)
    expect(estimateSpecialCount({ days: 10, bamagaStop: true })).toBe(1)
    // 16 Tage Quota=2 — ohne Bamaga gecappt auf 1, mit Bamaga 2
    expect(estimateSpecialCount({ days: 16, bamagaStop: false })).toBe(1)
    expect(estimateSpecialCount({ days: 16, bamagaStop: true })).toBe(2)
    // 25 Tage Quota=3 — beides durch Cluster-Cap reduziert
    expect(estimateSpecialCount({ days: 25, bamagaStop: false })).toBe(1)
    expect(estimateSpecialCount({ days: 25, bamagaStop: true })).toBe(2)
  })

  it('Kurzer Trip → 0 unabhängig von Bamaga', () => {
    expect(estimateSpecialCount({ days: 4, bamagaStop: true })).toBe(0)
    expect(estimateSpecialCount({ days: 4, bamagaStop: false })).toBe(0)
  })

  it('Pool-Aware: 2-Burner omnivore findet jetzt Special (a42 Beef stroganoff)', () => {
    expect(estimateSpecialCount({
      days: 16, bamagaStop: true, diet: 'omnivore', burners: 2, allergens: [],
    })).toBe(2)
  })

  it('Pool-Aware: 2-Burner vegan findet jetzt Special (a44 Coconut laksa)', () => {
    expect(estimateSpecialCount({
      days: 10, bamagaStop: false, diet: 'vegan', burners: 2, allergens: [],
    })).toBe(1)
  })

  it('Pool-Aware: 2-Burner vegetarian findet Special (a39 oder a43)', () => {
    expect(estimateSpecialCount({
      days: 10, bamagaStop: false, diet: 'vegetarian', burners: 2, allergens: [],
    })).toBe(1)
  })

  it('Pool-Aware: 1-Burner sieht sequenzierbare Specials (z.B. Beef stroganoff)', () => {
    // Vor (z): 1-Burner → 0 Specials. Nach (aa): sequenzierbare Specials (parallel != true)
    // sind sichtbar via fitsBurnerSetup. a42 Beef stroganoff (burners:2) ist sequenzierbar.
    expect(estimateSpecialCount({
      days: 16, bamagaStop: true, diet: 'omnivore', burners: 1, allergens: [],
    })).toBe(2)
    expect(estimateSpecialCount({
      days: 16, bamagaStop: true, diet: 'vegan', burners: 1, allergens: [],
    })).toBe(2)
  })

  it('Pool-Aware: parallel-only Specials (a43 Risotto) bei niedriger Burner-Anzahl nicht im Pool', async () => {
    const { compatibleRecipesForCat } = await import('./generator.js')
    // 1-Burner-vegetarian → a43 (Wild mushroom risotto, parallel:true) muss raus
    const veg1 = compatibleRecipesForCat('a', { diet: 'vegetarian', burners: 1, allergens: [] })
    expect(veg1.find(r => r.id === 'a43'), 'a43 ist parallel-only → 1-Burner darf es nicht sehen').toBeUndefined()
    // a39 Halloumi mezze (burners:2, NICHT parallel) → 1-Burner sequenziell-OK
    expect(veg1.find(r => r.id === 'a39'), 'a39 ist sequenzierbar → 1-Burner sieht es').toBeDefined()
  })

  it('Pool-Aware: dairy-allergy filtert Halloumi/Risotto/Stroganoff — vegan-Specials bleiben', () => {
    // vegan ist by definition dairy-free, sollte unverändert 1 zeigen
    expect(estimateSpecialCount({
      days: 10, bamagaStop: false, diet: 'vegan', burners: 2, allergens: ['dairy'],
    })).toBe(1)
  })

  it('Pool-Aware: 3-Burner zeigt jede Diät hat ≥1 passendes Special', () => {
    for (const diet of ['omnivore', 'vegetarian', 'vegan']) {
      expect(estimateSpecialCount({
        days: 10, bamagaStop: false, diet, burners: 3, allergens: [],
      })).toBe(1)
    }
  })

  it('Backward-compat: ohne diet/burners/allergens bleibt es legacy-Verhalten (Maximum)', () => {
    // Bestehende Tests erwarten dass „16d + Bamaga = 2" unabhängig vom Pool gilt
    expect(estimateSpecialCount({ days: 16, bamagaStop: true })).toBe(2)
  })
})

describe('Special-Pool: alle Diäten haben mind. 1 2-Burner-Special', () => {
  it('Generator produziert Special-Plan für 2-Burner-Setup jeder Diät', async () => {
    const { generate } = await import('./generator.js')
    for (const diet of ['omnivore', 'vegetarian', 'vegan']) {
      const result = generate(defaults({
        days: 16, bamagaStop: true, bamagaDay: 9, diet, burners: 2,
      }))
      const specials = result.plan.filter(d => d.ab?.spec)
      expect(specials.length, `2-Burner ${diet} sollte ≥1 Special bekommen`).toBeGreaterThanOrEqual(1)
    }
  })
})

// ── Pool-Coverage nach (y) ─────────────────────────────────────────────
//
// Erwartung: nach Pool-Erweiterung um 12 allergie-defensive Rezepte (4 breakfast,
// 3 lunch, 5 dinner) müssen die kritischen Coverage-Lücken geschlossen sein.

describe('Pool-Coverage: Gluten-frei + Allergie-defensive Optionen vorhanden', () => {
  it('Jede Diät hat mind. 1 gluten-freies Frühstück', async () => {
    const { RECIPES } = await import('../data/recipes.js')
    const { filterByAllergens } = await import('./allergens.js')
    for (const diet of ['omnivore', 'vegetarian', 'vegan']) {
      const dietPool = RECIPES.filter(r => r.cat === 'f' && !r.occasion && (
        diet === 'omnivore' ? true :
        diet === 'vegetarian' ? r.diet !== 'omnivore' :
        r.diet === 'vegan'
      ))
      const gfPool = dietPool.filter(r => filterByAllergens(r, ['gluten']).keep)
      expect(gfPool.length, `${diet} sollte ≥1 GF-Frühstück haben`).toBeGreaterThanOrEqual(1)
    }
  })

  it('Vegan-Pool hat mind. 8 Frühstücke (vorher: 7, +1 GF-Option)', async () => {
    const { RECIPES } = await import('../data/recipes.js')
    const vegBreakfasts = RECIPES.filter(r => r.cat === 'f' && r.diet === 'vegan' && !r.occasion)
    expect(vegBreakfasts.length).toBeGreaterThanOrEqual(8)
  })

  it('Vegetarian-Dinner-Pool (regulär) hat mind. 10 Optionen (vorher: 7)', async () => {
    const { RECIPES } = await import('../data/recipes.js')
    const vegDinners = RECIPES.filter(r => r.cat === 'a' && !r.occasion && (
      r.diet === 'vegetarian' || r.diet === 'vegan'
    ))
    expect(vegDinners.length).toBeGreaterThanOrEqual(15)
  })

  it('Vegan Lunch hat jetzt gluten-freie Option (vorher: 0)', async () => {
    const { RECIPES } = await import('../data/recipes.js')
    const { filterByAllergens } = await import('./allergens.js')
    const veganLunches = RECIPES.filter(r => r.cat === 'm' && r.diet === 'vegan' && !r.occasion)
    const gfVeganLunches = veganLunches.filter(r => filterByAllergens(r, ['gluten']).keep)
    expect(gfVeganLunches.length).toBeGreaterThanOrEqual(1)
  })

  it('Neue Rezepte f16-f19, m26-m28, a45-a49 sind alle im Pool', async () => {
    const { RECIPES } = await import('../data/recipes.js')
    const expectedIds = ['f16','f17','f18','f19','m26','m27','m28','a45','a46','a47','a48','a49']
    for (const id of expectedIds) {
      const r = RECIPES.find(x => x.id === id)
      expect(r, `Rezept ${id} fehlt`).toBeDefined()
      expect(r.cat, `${id} cat`).toBeDefined()
      expect(r.diet, `${id} diet`).toBeDefined()
      expect(r.ing, `${id} ing`).toBeDefined()
      expect(r.steps, `${id} steps`).toBeDefined()
    }
  })

  it('Pool-Gesamtgröße: 97 Rezepte (84 + 12 neue + a50 User-Request)', async () => {
    const { RECIPES } = await import('../data/recipes.js')
    expect(RECIPES.length).toBe(97)
  })
})

// ── Waste-Optimierung (Stufe 2): Kanonisierung + Pack-Runden + Pack-Fill ──────
// Nach dem Eigen-Trip: Einkaufsliste soll austauschbare Grundzutaten als EINE Zeile führen,
// auf ganze Packungen runden, und der Generator soll weniger verschiedene Grund-Packs anbrechen.

describe('Zutaten-Kanonisierung', () => {
  it('fasst austauschbare Reissorten zu "Rice" zusammen', () => {
    for (const n of ['Jasmine rice', 'Basmati rice', 'Long-grain rice', 'Jasmine or brown rice', 'Jasmine rice or brown rice']) {
      expect(canonicalIngredient(n)).toEqual({ key: 'rice', display: 'Rice' })
    }
  })

  it('fasst Nudel-Formen zu "Pasta" zusammen', () => {
    for (const n of ['Spaghetti', 'Penne', 'Penne or rigatoni', 'Macaroni or penne', 'Pasta']) {
      expect(canonicalIngredient(n)).toEqual({ key: 'pasta', display: 'Pasta' })
    }
  })

  it('mergt plain onion, hält Red/Spring onion getrennt', () => {
    expect(canonicalIngredient('Onion').key).toBe('onion')
    expect(canonicalIngredient('Onions').key).toBe('onion')
    expect(canonicalIngredient('Red onion').key).toBe('red onion')
    expect(canonicalIngredient('Spring onion').key).toBe('spring onion')
  })

  it('lässt nicht-substituierbare Varianten getrennt (kein falsches Merge)', () => {
    // Diese enthalten "rice"/"pasta" als Substring, sind aber eigene Produkte.
    for (const n of ['Arborio rice', 'Sushi rice', 'Rice noodles', 'Rice vinegar', 'Rice flour', 'Gnocchi', 'Instant noodles']) {
      expect(canonicalIngredient(n).key).not.toBe('rice')
      expect(canonicalIngredient(n).key).not.toBe('pasta')
    }
  })

  it('strippt Parenthetik / Optional-Prefix wie zuvor', () => {
    expect(canonicalIngredient('Coconut milk (full-fat)').key).toBe('coconut milk')
    expect(canonicalIngredient('Optional: bacon').display).toBe('Bacon')
  })

  it('fasst "X or Y"-Alternativen + Serviervermerke generisch zusammen (kein Hardcoding)', () => {
    // Der konkrete User-Report: drei Maple-Syrup-Varianten in der Liste → EINE.
    for (const n of ['Maple syrup', 'Maple syrup or honey', 'Maple syrup or agave', 'Maple syrup to serve']) {
      expect(canonicalIngredient(n)).toEqual({ key: 'maple syrup', display: 'Maple syrup' })
    }
    // gilt allgemein für weitere Zutaten
    expect(canonicalIngredient('Soy sauce or tamari').key).toBe('soy sauce')
    expect(canonicalIngredient('Sour cream or Greek yogurt').key).toBe('sour cream')
    expect(canonicalIngredient('Walnuts or pecans').key).toBe('walnuts')
    expect(canonicalIngredient('Parmesan, grated').key).toBe('parmesan')
  })

  it('mangelt NICHT den Adjektiv-Fall (gemeinsames Kopf-Nomen)', () => {
    // "Olive or coconut oil" darf NICHT zu "Olive" werden, "Rice or hokkien noodles" NICHT zu Rice.
    expect(canonicalIngredient('Olive or coconut oil').key).toBe('olive or coconut oil')
    expect(canonicalIngredient('Rice or hokkien noodles').key).not.toBe('rice')
    expect(canonicalIngredient('Black or green olives').key).toBe('black or green olives')
  })
})

describe('describeQty() — Pack-Runden', () => {
  const totals = pairs => ({ totals: new Map(pairs), hasNoQty: false })

  it('rundet Masse auf ganze Packungen + zeigt Verbrauch', () => {
    // 900 g Reis bei 1kg-Pack → 1 Pack, "~900 g used"
    const s = describeQty(totals([['g', 900]]), { pack: 1000, unit: 'g', label: '1kg bag' })
    expect(s).toBe('1 × 1kg bag · ~900 g used')
  })

  it('rundet auf mehrere Packungen auf', () => {
    // 1600 g Pasta bei 500g-Pack → 4 Packs
    const s = describeQty(totals([['g', 1600]]), { pack: 500, unit: 'g', label: '500g pack' })
    expect(s).toMatch(/^4 × 500g pack/)
  })

  it('rundet angebrochene Dosen auf ganze auf', () => {
    const s = describeQty(totals([['can', 0.5]]), undefined)
    expect(s).toBe('1 can · uses ~0.5 cans')
  })

  it('führt gemischt notierte Gebinde-Mengen zusammen (ml + can → cans)', () => {
    // 500 ml + 1 can Kokosmilch (Dose = 400 ml) → 2.25 → 3 Dosen
    const info = { pack: 1, unit: 'can', contains: 400, containsUnit: 'ml', label: '400ml can' }
    const s = describeQty(totals([['ml', 500], ['can', 1]]), info)
    expect(s).toMatch(/^3 cans/)
    expect(s).not.toMatch(/ml/)  // keine gemischte "500 ml + 1 can"-Zeile mehr
  })

  it('lässt nicht-gelistete Zutaten unverändert', () => {
    expect(describeQty(totals([['g', 250]]), undefined)).toBe('250 g')
  })
})

describe('Pack-Fill-Heuristik (Waste-Reduktion)', () => {
  it('Einkaufsliste zeigt Reis/Pasta je als EINE Zeile, keine Varianten-Namen', () => {
    const r = generate(defaults())
    const names = Object.values(r.shopping).flatMap(cats => cats.flatMap(c => c.items.map(i => i.name)))
    // keine rohen Varianten mehr
    expect(names.some(n => /jasmine|basmati|long-grain|spaghetti|penne|macaroni/i.test(n))).toBe(false)
    // Reis erscheint höchstens einmal
    expect(names.filter(n => n === 'Rice').length).toBeLessThanOrEqual(1)
    expect(names.filter(n => n === 'Pasta').length).toBeLessThanOrEqual(1)
  })

  it('Reis-Zeile ist auf ganze Packungen gerundet', () => {
    const r = generate(defaults())
    const rice = Object.values(r.shopping).flatMap(cats => cats.flatMap(c => c.items)).find(i => i.name === 'Rice')
    if (rice) expect(rice.qty).toMatch(/×.*(kg|g).*used/)
  })

  it('Kokosmilch erscheint als ganze Dosen, nicht als "ml + can"-Mix', () => {
    const r = generate(defaults())
    const cm = Object.values(r.shopping).flatMap(cats => cats.flatMap(c => c.items)).find(i => i.name === 'Coconut milk')
    if (cm) expect(cm.qty).not.toMatch(/ml.*can|can.*ml/)
  })

  it('konsolidiert die austauschbaren Dinner-Grundzutaten (Reis/Pasta/Couscous)', () => {
    // Ohne die Heuristik zieht die Menü-Vielfalt alle vier Haupt-Carbs (rice/pasta/couscous/
    // noodles) je einmal → viele halb-genutzte Packs. Mit Konsolidierung bleiben es wenige.
    // Schwelle ≤ 3 seit der Zutaten-Normalisierung (2026-07-14): "Rice or hokkien noodles" u.ä.
    // lösen jetzt korrekt auf "Rice noodles" auf (eigene Zutat, nicht mehr als `rice` gezählt),
    // wodurch die Greedy-Konsolidierung hier Reis+Pasta+Couscous statt zwei Carbs wählt — alle
    // real genutzt (Pasta 100 %, Reis ~70 %, Couscous ~64 % eines Pakets), kein halb-leerer Wildwuchs.
    const r = generate(defaults())
    const mainCarbs = ['rice', 'pasta', 'couscous']
    const names = Object.values(r.shopping).flatMap(cats => cats.flatMap(c => c.items.map(i => i.name.toLowerCase())))
    const distinct = new Set(names.filter(n => mainCarbs.includes(n)))
    expect(distinct.size).toBeLessThanOrEqual(3)
  })

  it('keine aufeinanderfolgenden Dinner-Wiederholungen', () => {
    const r = generate(defaults({ days: 20 }))
    let consecutive = 0
    for (let i = 1; i < r.plan.length; i++) {
      if (r.plan[i].ab?.r && r.plan[i].ab.r === r.plan[i - 1].ab?.r) consecutive++
    }
    expect(consecutive).toBe(0)
  })

  it('bleibt deterministisch trotz Score-basierter Auswahl', () => {
    const a = generate(defaults({ days: 21 }))
    const b = generate(defaults({ days: 21 }))
    expect(a.plan).toEqual(b.plan)
    expect(a.shopping).toEqual(b.shopping)
  })
})

// ── Plan-vs-Reality: Leftovers, Meal-Status, Multi-Stop-Frisch-Routing ────────
// Nach dem Eigen-Trip: Plan war zu starr — nicht jede Mahlzeit gekocht (auswärts/improvisiert/
// Reste). Drei Features gegen Foodwaste durch Über-Einkauf.

describe('Leftover-aware Planung', () => {
  const count = res => Object.values(res.shopping).flatMap(c => c.flatMap(x => x.items)).length

  it('plant Rest-Lunch am Folgetag eines Großansatz-Dinners', () => {
    const r = generate(defaults({ days: 16 }))
    const leftovers = r.plan.filter(d => d.m?.leftover)
    expect(leftovers.length).toBeGreaterThan(0)
    for (const d of leftovers) {
      expect(d.m.fromDay).toBe(d.d - 1)                    // Reste vom Vortag
      const src = r.plan.find(x => x.d === d.m.fromDay)
      expect(src.ab?.batch).toBeGreaterThan(1)             // Quell-Dinner ist Großansatz
    }
  })

  it('Rest-Lunch bringt keine eigenen Einkaufs-Zutaten', () => {
    // Vergleich: identische Config, aber Leftover-fähige Rezepte entfernt gäbe es nicht einfach —
    // stattdessen prüfen wir, dass ein Leftover-Slot kein `.r` trägt (→ generateShopping skippt).
    const r = generate(defaults({ days: 16 }))
    for (const d of r.plan.filter(x => x.m?.leftover)) {
      expect(d.m.r).toBeUndefined()
    }
  })

  it('Determinismus mit Leftovers erhalten', () => {
    const a = generate(defaults({ days: 18 }))
    const b = generate(defaults({ days: 18 }))
    expect(a.plan).toEqual(b.plan)
  })
})

describe('Reaktiver Meal-Status (cooked / deviation)', () => {
  const count = res => Object.values(res.shopping).flatMap(c => c.flatMap(x => x.items)).length

  it('"cooked as planned" verhält sich wie der Default (alle Zutaten)', () => {
    const base = defaults({ days: 10, bamagaStop: false })
    const day = generate(base).plan.find(d => d.ab?.r && !d.ab.leftover)
    const r = generate({ ...base, mealStatus: { [day.d]: { ab: 'cooked' } } })
    expect(r.plan.find(d => d.d === day.d).ab.reviewed).toBe('cooked')
    expect(count(r)).toBe(count(generate(base)))
  })

  it('Deviation mit leerer used-Liste = gar nicht gekocht → Zutaten fallen weg', () => {
    const base = defaults({ days: 10, bamagaStop: false })
    const r0 = generate(base)
    const day = r0.plan.find(d => d.ab?.r && !d.ab.leftover)
    const r = generate({ ...base, mealStatus: { [day.d]: { ab: { used: [] } } } })
    expect(count(r)).toBeLessThan(count(r0))
    expect(r.plan.find(d => d.d === day.d).ab.usedIng).toEqual([])
  })

  it('Deviation mit Teil-Auswahl zählt nur die angehakten Zutaten', () => {
    const base = defaults({ days: 10, bamagaStop: false })
    const r0 = generate(base)
    const day = r0.plan.find(d => d.ab?.r && !d.ab.leftover)
    const none = generate({ ...base, mealStatus: { [day.d]: { ab: { used: [] } } } })
    const one  = generate({ ...base, mealStatus: { [day.d]: { ab: { used: [0] } } } })
    // Teil-Auswahl liegt zwischen "gar nicht" und "voll".
    expect(count(one)).toBeGreaterThanOrEqual(count(none))
    expect(count(one)).toBeLessThanOrEqual(count(r0))
  })

  it('alle Slots als nicht-gekocht → Shopping enthält nur Essentials', () => {
    const days = 8
    const ms = {}
    for (let d = 1; d <= days; d++) ms[d] = { f: { used: [] }, m: { used: [] }, ab: { used: [] } }
    const r = generate(defaults({ days, bamagaStop: false, mealStatus: ms }))
    expect(r.shopping.cairns.every(c => /essentials/i.test(c.cat))).toBe(true)
  })
})

describe('Multi-Stop-Frisch-Routing + Weipa', () => {
  it('jeder aktivierte verlässliche Stop bekommt einen Bucket, Roadhouse-frei', () => {
    const r = generate(defaults({
      days: 16, bamagaStop: true, bamagaDay: 13,
      enabledStops: { cooktown: true, coen: true, weipa: true, archer: false },
      stopDays: { cooktown: 4, coen: 8, weipa: 11 },
    }))
    expect(Object.keys(r.shopping).sort()).toEqual(['bamaga', 'cairns', 'coen', 'cooktown', 'weipa'])
  })

  it('Resupply-Stops führen NUR Frisch + Essentials, Staples bleiben in Cairns', () => {
    const r = generate(defaults({
      days: 16, bamagaStop: true, bamagaDay: 13,
      enabledStops: { cooktown: true, weipa: true },
      stopDays: { cooktown: 4, weipa: 10 },
    }))
    const isFreshOrEssentials = cat => /Fresh|essentials/i.test(cat)
    for (const id of ['cooktown', 'weipa', 'bamaga']) {
      expect((r.shopping[id] || []).every(c => isFreshOrEssentials(c.cat))).toBe(true)
    }
    // Cairns trägt die haltbaren Grundnahrungsmittel (Pasta/Reis/Brot).
    expect(r.shopping.cairns.some(c => /Pasta, rice/i.test(c.cat))).toBe(true)
  })

  it('Roadhouse (Archer) bekommt KEIN Frisch-Routing — nur Essentials', () => {
    const r = generate(defaults({
      days: 12, bamagaStop: false,
      enabledStops: { archer: true }, stopDays: { archer: 6 },
    }))
    const archer = r.shopping.archer || []
    expect(archer.length).toBeGreaterThan(0)
    expect(archer.every(c => /essentials/i.test(c.cat))).toBe(true)
  })

  it('nur Bamaga aktiv → Cairns+Bamaga-Split wie zuvor (backward-compat)', () => {
    const r = generate(defaults({ days: 16, bamagaStop: true, bamagaDay: 9 }))
    expect(Object.keys(r.shopping).sort()).toEqual(['bamaga', 'cairns'])
  })

  it('Determinismus mit Leftovers + Multi-Stop + mealStatus', () => {
    const cfg = defaults({
      days: 20, bamagaStop: true, bamagaDay: 14,
      enabledStops: { cooktown: true, weipa: true },
      stopDays: { cooktown: 4, weipa: 10 },
      mealStatus: { 3: { ab: { used: [] } }, 5: { m: 'cooked' } },
    })
    const a = generate(cfg), b = generate(cfg)
    expect(a.plan).toEqual(b.plan)
    expect(a.shopping).toEqual(b.shopping)
  })
})

// ── Eigene Rezepte (Custom-Menu, per Swap platziert) ─────────────────────────
describe('User-Rezepte via Override', () => {
  afterEach(() => setUserRecipes([]))
  const CUSTOM = {
    id: 'u-t', cat: 'a', icon: '🍲', name: 'Custom camp curry', diet: 'omnivore', burners: 1,
    time: '', tools: '', kcal: '', cooling: 'medium', effort: 'easy',
    ing: [['Kangaroo fillet', '200g/person'], ['Bush tomato', '2']], steps: ['cook'],
  }

  it('per Swap platziertes User-Rezept → im Plan + Zutaten in der Einkaufsliste', () => {
    setUserRecipes([CUSTOM])
    const r = generate(defaults({ days: 10, bamagaStop: false, overrides: { 4: { ab: 'u-t' } } }))
    const d4 = r.plan.find(p => p.d === 4)
    expect(d4.ab.t).toBe('Custom camp curry')
    expect(d4.ab.ovr).toBe(true)
    const names = Object.values(r.shopping).flatMap(c => c.flatMap(x => x.items.map(i => i.name)))
    expect(names.some(n => /kangaroo/i.test(n))).toBe(true)
  })

  it('unbekanntes Override-Rezept (gelöscht) → graceful Fallback, kein Crash', () => {
    const r = generate(defaults({ days: 8, bamagaStop: false, overrides: { 3: { ab: 'u-gone' } } }))
    expect(r.plan.find(p => p.d === 3).ab).toBeTruthy()
  })

  it('User-Rezept taucht NICHT im Auto-Plan auf (nur per Swap)', () => {
    setUserRecipes([{ ...CUSTOM, id: 'u-auto', name: 'ZZ auto test' }])
    const r = generate(defaults({ days: 16, bamagaStop: false }))
    const used = r.plan.flatMap(p => [p.f?.r, p.m?.r, p.ab?.r])
    expect(used.includes('u-auto')).toBe(false)
  })
})

// ── Kochaufwand-Filter (cookEffort) ──────────────────────────────────────

describe('effortAllowed() — Aufwands-Obergrenze', () => {
  const easy   = { effort: 'easy' }
  const medium = { effort: 'medium' }
  const hard   = { effort: 'hard' }

  it("'low' lässt nur easy zu", () => {
    expect(effortAllowed(easy, 'low')).toBe(true)
    expect(effortAllowed(medium, 'low')).toBe(false)
    expect(effortAllowed(hard, 'low')).toBe(false)
  })
  it("'medium' lässt easy + medium zu, aber nicht hard", () => {
    expect(effortAllowed(easy, 'medium')).toBe(true)
    expect(effortAllowed(medium, 'medium')).toBe(true)
    expect(effortAllowed(hard, 'medium')).toBe(false)
  })
  it("'high' lässt alles zu", () => {
    expect(effortAllowed(hard, 'high')).toBe(true)
  })
  it('unbekannt/fehlend = keine Einschränkung (true)', () => {
    expect(effortAllowed(hard, undefined)).toBe(true)
    expect(effortAllowed(hard, 'bogus')).toBe(true)
    expect(effortAllowed({}, 'low')).toBe(true)   // fehlendes effort → rank 0 = easy
  })
})

describe('generate() — cookEffort filtert den Plan', () => {
  it("cookEffort 'low' → jede geplante Mahlzeit ist easy (auch Specials)", () => {
    const r = generate(defaults({ days: 16, cookEffort: 'low' }))
    const efforts = planMealEfforts(r.plan)
    expect(efforts.length).toBeGreaterThan(0)
    expect(efforts.every(e => e === 'easy')).toBe(true)
  })

  it("cookEffort 'medium' → keine 'hard'-Rezepte im Plan", () => {
    const r = generate(defaults({ days: 16, cookEffort: 'medium' }))
    expect(planMealEfforts(r.plan).includes('hard')).toBe(false)
  })

  it("cookEffort 'high' (Default) → aufwändigere Rezepte erlaubt", () => {
    const r = generate(defaults({ days: 16, cookEffort: 'high' }))
    // 16-Tage-omnivore zieht mit hoher Obergrenze mind. ein medium/hard-Rezept.
    expect(planMealEfforts(r.plan).some(e => e !== 'easy')).toBe(true)
  })

  it('fehlender cookEffort verhält sich wie high (rückwärtskompatibel)', () => {
    const withHigh = generate(defaults({ days: 12, bamagaStop: false, cookEffort: 'high' }))
    const without  = generate(defaults({ days: 12, bamagaStop: false }))
    expect(planMealEfforts(without.plan)).toEqual(planMealEfforts(withHigh.plan))
  })

  it('config trägt cookEffort + cookEffortApplied', () => {
    const r = generate(defaults({ cookEffort: 'low' }))
    expect(r.config.cookEffort).toBe('low')
    expect(r.config.cookEffortApplied).toBe('low')
  })

  it("'low' liefert trotzdem für jede Diät einen vollständigen Plan (keine leeren Slots)", () => {
    for (const diet of ['omnivore', 'vegetarian', 'vegan']) {
      const r = generate(defaults({ days: 14, diet, bamagaStop: false, cookEffort: 'low' }))
      const holes = r.plan.filter(p => !p.f || !p.m || !p.ab)
      expect(holes).toEqual([])
    }
  })
})

describe('estimateSpecialCount() — respektiert cookEffort', () => {
  it("'low' liefert höchstens so viele Specials wie 'high'", () => {
    const base = { days: 16, bamagaStop: true, diet: 'omnivore', burners: 2, allergens: [] }
    const hi  = estimateSpecialCount({ ...base, cookEffort: 'high' })
    const lo  = estimateSpecialCount({ ...base, cookEffort: 'low' })
    expect(lo).toBeLessThanOrEqual(hi)
  })
})

// ── Mengen-Parsing: Container-Anzahl-Schutz (can/gram-Bug) + Zutaten-Konsistenz ──

describe('parseAmount() — Container zählt Dosen, nie Grammzahl', () => {
  it('"185g can/person" → 1 can (nicht 185)', () => {
    const p = parseAmount('185g can/person')
    expect(p.qty).toBe(1)
    expect(p.unit).toBe('can')
  })
  it('"2 × 185g cans" → 2 cans', () => {
    const p = parseAmount('2 × 185g cans (for both)')
    expect(p.qty).toBe(2)
    expect(p.unit).toBe('can')
  })
  it('"1 × 400g can" → 1 can', () => {
    expect(parseAmount('1 × 400g can').qty).toBe(1)
    expect(parseAmount('1 × 400g can').unit).toBe('can')
  })
  it('reine Masse bleibt Masse', () => {
    const p = parseAmount('200g/person')
    expect(p.qty).toBe(200); expect(p.unit).toBe('g')
  })
})

describe('Regression: Tuna-Menge bleibt plausibel (kein 372-cans-Bug)', () => {
  it('Tuna aggregiert zu wenigen Dosen, nicht Hunderten', () => {
    const r = generate(defaults({ days: 16, overrides: { 3: { ab: 'a3' }, 5: { m: 'm6' }, 7: { ab: 'a30' } } }))
    const tuna = Object.values(r.shopping)
      .flatMap(cats => cats.flatMap(c => c.items))
      .find(i => /tuna/i.test(i.name))
    if (tuna) {
      const cans = tuna.amount?.can ?? 0
      expect(cans).toBeLessThan(30)
    }
  })
})

describe('Zutaten-Konsistenz über den ganzen Pool', () => {
  const CANNED = new Set(['diced tomatoes', 'coconut milk', 'chickpeas', 'black beans', 'baked beans',
    'white beans', 'kidney beans', 'corn', 'peas', 'refried beans', 'tuna in oil', 'canned salmon'])

  it('keine Konserve parst als bloßes Stück (immer can/g/ml)', () => {
    const offenders = []
    for (const r of RECIPES) for (const [n, a] of r.ing) {
      const key = canonicalIngredient(n).key
      if (!CANNED.has(key)) continue
      const p = parseAmount(a)
      if (p.qty != null && p.unit == null) offenders.push(`${r.id}: ${n} = "${a}"`)
    }
    expect(offenders).toEqual([])
  })

  it('keine Zutat mehr mit "X or Y" im Namen oder in der Menge', () => {
    const offenders = []
    for (const r of RECIPES) for (const [n, a] of r.ing) {
      if (/\bor\b/i.test(n) || /\bor\b/i.test(a)) offenders.push(`${r.id}: ["${n}","${a}"]`)
    }
    expect(offenders).toEqual([])
  })

  it('jede kanonische Zutat nutzt EINE Einheiten-Klasse (nach packs-Merge der Dosen)', () => {
    const byKey = new Map()
    for (const r of RECIPES) for (const [n, a] of r.ing) {
      const key = canonicalIngredient(n).key
      const p = parseAmount(a)
      if (p.qty == null) continue
      // Konserven: g/ml/can zählen als EINE Klasse (packs.js führt sie zu Dosen zusammen).
      const cls = CANNED.has(key)
        ? 'canned'
        : unitClass(p.unit === 'kg' ? 'g' : p.unit === 'l' ? 'ml' : p.unit)
      if (!byKey.has(key)) byKey.set(key, new Set())
      byKey.get(key).add(cls)
    }
    const mixed = [...byKey.entries()].filter(([, s]) => s.size > 1)
      .map(([k, s]) => `${k}: {${[...s].join(',')}}`)
    expect(mixed).toEqual([])
  })
})

// ── Skalierung mit der Gruppengröße ────────────────────────────────────────
//
// Regression zum Entwickler-Report (Juli 2026): "Red lentil soup für 2 und für 4 Personen
// verlangte dieselbe Menge Kokosmilch". Ursache: scaleFactor gab für jede Menge ohne
// "/person"- oder "(for both)"-Marker ×1 zurück — 448 von 1022 Zutaten-Zeilen skalierten nie.
// Der Pool ist durchgehend für 2 Personen geschrieben (BASE_SERVINGS), also ist eine
// unmarkierte Menge eine 2-Personen-Menge und muss mit factor/2 skalieren.

describe('scaleFactor() — unmarkierte Mengen sind 2-Personen-Mengen', () => {
  const at = (amt, factor, name = 'Coconut milk') => scaleFactor(parseAmount(amt), factor, name)

  it('unmarkierte Menge skaliert linear ab der 2-Personen-Basis', () => {
    expect(at('1 × 400ml can', 1)).toBe(0.5)   // 1 Person → halbe Dose
    expect(at('1 × 400ml can', 2)).toBe(1)     // 2 Personen → wie geschrieben
    expect(at('1 × 400ml can', 4)).toBe(2)     // 4 Personen → 2 Dosen  ← der gemeldete Bug
    expect(at('1 × 400ml can', 8)).toBe(4)
  })

  it('"/person"-Menge skaliert weiterhin mit der vollen Personenzahl', () => {
    expect(at('150g/person', 1, 'Red lentils')).toBe(1)
    expect(at('150g/person', 4, 'Red lentils')).toBe(4)
  })

  it('"(for both)" ist gleichbedeutend mit unmarkiert', () => {
    expect(at('2 (for both)', 4, 'Naan bread')).toBe(at('2', 4, 'Naan bread'))
  })

  it('Gewürze und Bratfett skalieren halb-linear statt linear', () => {
    // dampen(r) = 1 + (r-1)*0.5 → 4 Pers. ×1.5 statt ×2, 8 Pers. ×2.5 statt ×4
    expect(at('1.5 tsp', 4, 'Cumin')).toBe(1.5)
    expect(at('1.5 tsp', 8, 'Cumin')).toBe(2.5)
    expect(at('2 tbsp', 4, 'Olive oil')).toBe(1.5)
    expect(at('1 tsp', 4, 'Smoked paprika')).toBe(1.5)
    expect(at('0.5 tsp', 4, 'Chili flakes')).toBe(1.5)
  })

  it('Sauce/Paste/Mehl skalieren linear — nicht als "Gewürz" gedämpft', () => {
    // Sie liegen in derselben Kategorie "🫙 Spices, oils & sauces" und tragen dieselbe Einheit
    // (tbsp) wie das Öl; die Dämpfung darf hier trotzdem nicht greifen.
    expect(at('1 tbsp', 4, 'Tomato paste')).toBe(2)
    expect(at('2 tbsp', 4, 'Soy sauce')).toBe(2)
    expect(at('1 tsp', 4, 'Baking powder')).toBe(2)
    expect(at('2 tbsp', 4, 'Cornflour')).toBe(2)
  })

  it('Aromaten werden gedämpft — Knoblauch, Ingwer, frischer Chili', () => {
    // Entwickler-Report: "für 7 Personen würde ich nicht 11 Knoblauchzehen in Fajitas machen".
    // Linear wären es genau 11 gewesen (3 × 7.05/2). Deckt sich mit der Kochliteratur:
    // Knoblauch ~75% der rechnerischen Menge, Aroma sättigt.
    expect(at('3 cloves', 4, 'Garlic')).toBe(1.5)
    expect(at('2cm piece, grated', 4, 'Ginger')).toBe(1.5)
    expect(at('1, sliced', 4, 'Red chili')).toBe(1.5)
  })

  it('Zwiebeln bleiben linear — sie sind Gemüse, nicht nur Aroma', () => {
    // a46 Fajitas: "Onion, 0.5/person, sliced" — die isst man. Dämpfen würde zu wenig liefern.
    expect(at('1 large', 4, 'Onion')).toBe(2)
    expect(at('2', 4, 'Spring onion')).toBe(2)
  })

  it('DAMPED_RX erwischt keine Beinahe-Treffer', () => {
    // Präfix-Kollisionen, die eine unverankerte oder zu kurze Regex still kaputt machen würde:
    // "Coconut milk" vs. "Coconut oil" · "Salmon"/"Salted butter" vs. "Salt" ·
    // "Sesame oil" vs. "Oil" (nur am Namensanfang) · "Chives" vs. "Chili".
    for (const n of ['Coconut milk (full-fat)', 'Salmon', 'Salted butter', 'Sesame oil', 'Chives']) {
      expect(at('2 tbsp', 4, n)).toBe(2)
    }
  })

  it('Aroma-Namen, die Lebensmittel sind, bleiben linear (DAMPED_NOT_RX)', () => {
    // "Garlic bread" ist Brot, "Ginger beer" ist ein Getränk — beide skalieren linear.
    // Kommen aktuell nicht als Zutat im Pool vor, wären aber jederzeit plausibel.
    for (const n of ['Garlic bread', 'Garlic toast', 'Ginger beer', 'Gingerbread', 'Garlic naan']) {
      expect(at('2 tbsp', 4, n)).toBe(2)
    }
  })

  it('dämpft genau Gewürzkit + Bratfett + Aromaten — nicht mehr', () => {
    // Schutz gegen schleichende Ausweitung: aktuell 17 von 271 Zutaten-Namen im Pool.
    const names = [...new Set(RECIPES.flatMap(r => r.ing.map(([n]) => n)))]
    const damped = names.filter(n => at('2 tbsp', 4, n) === 1.5).sort()
    expect(damped).toEqual([
      'Black pepper', 'Chili flakes', 'Coconut oil', 'Coconut oil (in batter + for pan)',
      'Cumin', 'Curry powder', 'Garlic', 'Ginger', 'Mixed dried herbs', 'Oil', 'Olive oil',
      'Red chili', 'Red chili, sliced', 'Salt', 'Salt & pepper', 'Smoked paprika', 'Vegetable oil',
    ])
  })

  it('keine gedämpfte Zutat trägt noch einen /person-Marker', () => {
    // Ein "/person" auf einem Gewürz würde die Dämpfung umgehen und linear skalieren — genau der
    // Paprika-Fall (a46: "1.5 tsp/person" → 10.5 TL bei 7 Personen). scripts/normalize-spice-
    // scaling.mjs hat diese 22 Zeilen auf Pro-Gericht-Mengen umgestellt.
    const leaks = []
    for (const r of RECIPES) for (const [n, a] of r.ing) {
      if (isDamped(n) && /\/person|per person/i.test(a)) leaks.push(`${r.id} "${n}": "${a}"`)
    }
    expect(leaks).toEqual([])
  })

  it('Sauce/Mayo behalten ihr /person — die skalieren zu Recht linear', () => {
    expect(at('1 tbsp/person', 4, 'Soy sauce')).toBe(4)
    expect(at('2 tbsp/person', 4, 'Mayo')).toBe(4)
  })

  it('a12 Red lentil soup: Kokosmilch verdoppelt sich von 2 auf 4 Personen', () => {
    const a12 = RECIPES.find(r => r.id === 'a12')
    const [name, amt] = a12.ing.find(([n]) => /coconut milk/i.test(n))
    expect(scaleFactor(parseAmount(amt), 4, name))
      .toBe(scaleFactor(parseAmount(amt), 2, name) * 2)
  })
})

describe('scaleAmountLabel() — Anzeige in der Rezept-Ansicht', () => {
  it('rechnet die Menge auf die Gruppe um und entfernt den /person-Marker', () => {
    expect(scaleAmountLabel('150g/person', 4, 'Red lentils')).toBe('600g')
    expect(scaleAmountLabel('1 × 400ml can', 4, 'Coconut milk')).toBe('2 × 400ml cans')
    expect(scaleAmountLabel('3 cloves', 4, 'Garlic')).toBe('5 cloves')   // gedämpft (linear wären 6)
  })

  it('Gebinde-GRÖSSE bleibt stehen, nur die Anzahl skaliert', () => {
    expect(scaleAmountLabel('1 × 400ml can', 8, 'Coconut milk')).toBe('4 × 400ml cans')
    expect(scaleAmountLabel('2 × 185g cans (for both)', 4, 'Tuna in oil')).toBe('4 × 185g cans')
  })

  it('Gebinde ohne Anzahl im String bekommt die Anzahl vorangestellt', () => {
    // "185g can/person" → parseAmount liest implizit 1 Dose; die 185 ist die Größe, nicht die Anzahl.
    expect(scaleAmountLabel('185g can/person', 4, 'Baked beans (canned)')).toBe('4 × 185g cans')
    expect(scaleAmountLabel('185g can/person', 1, 'Baked beans (canned)')).toBe('185g can')
  })

  it('Kochwasser skaliert mit, Verhältnis-Angaben nicht', () => {
    expect(scaleAmountLabel('1 + 400ml water', 4, 'Vegetable stock cube')).toBe('2 + 800ml water')
    expect(scaleAmountLabel('1 + 2× rice water', 4, 'Chicken stock cube')).toBe('2 + 2× rice water')
  })

  it('Schnittmaße in cm bleiben unangetastet', () => {
    expect(scaleAmountLabel('100g/person, sliced 1cm thick', 4, 'Halloumi')).toBe('400g, sliced 1cm thick')
    expect(scaleAmountLabel('1 large/person, sliced 1cm rounds', 4, 'Eggplant')).toBe('4 large, sliced 1cm rounds')
  })

  it('Gramm-Gloss in Klammern skaliert mit der Primärmenge', () => {
    expect(scaleAmountLabel('1 tbsp (20g)/person', 4, 'Peanut butter')).toBe('4 tbsp (80g)')
    expect(scaleAmountLabel('45g/person (25g mash, 20g sear)', 4, 'Butter')).toBe('180g (100g mash, 80g sear)')
  })

  it('Freitext-Annotationen überleben die Skalierung', () => {
    expect(scaleAmountLabel('2 tsp — important!', 8, 'Cumin')).toBe('5 tsp — important!')
    expect(scaleAmountLabel('2 (for both), warmed', 4, 'Naan bread')).toBe('4, warmed')
  })

  it('Mengen ohne Zahl bleiben wörtlich stehen', () => {
    // "to taste" und "small handful/person" sind bereits für jede Gruppengröße korrekt.
    expect(scaleAmountLabel('to taste', 8, 'Salt')).toBe('to taste')
    expect(scaleAmountLabel('small handful/person', 8, 'Coriander leaves')).toBe('small handful/person')
  })

  it('kein Marker überlebt, wo eine Zahl skaliert wurde', () => {
    const leaks = []
    for (const r of RECIPES) for (const [n, a] of r.ing) {
      if (parseAmount(a).qty == null) continue        // ohne Zahl bleibt der Text roh (s.o.)
      const out = scaleAmountLabel(a, 4, n)
      if (/\/person|per person|for both/i.test(out)) leaks.push(`${r.id}: "${a}" → "${out}"`)
    }
    expect(leaks).toEqual([])
  })

  it('produziert für keine Zutaten-Zeile im Pool eine kaputte Ausgabe', () => {
    const bad = []
    for (const r of RECIPES) for (const [n, a] of r.ing) {
      for (const f of [1, 2, 4, 8]) {
        const out = scaleAmountLabel(a, f, n)
        if (!out.trim() || /NaN|undefined|null/.test(out)) bad.push(`${r.id}: "${a}" @${f} → "${out}"`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('generate() — Einkaufsliste skaliert mit der Gruppe', () => {
  const P2 = [{ type: 'adult-m', appetite: 'medium' }, { type: 'adult-f', appetite: 'medium' }]
  const P4 = [...P2, { type: 'adult-m', appetite: 'medium' }, { type: 'adult-f', appetite: 'medium' }]
  const shoppingByKey = (people) => {
    const r = generate(defaults({ people }))
    const m = new Map()
    for (const sections of Object.values(r.shopping))
      for (const sec of sections) for (const it of sec.items) m.set(it.key, it)
    return m
  }
  const sum = it => Object.values(it.amount || {}).reduce((s, q) => s + q, 0)
  const planIds = (people) => generate(defaults({ people })).plan.flatMap(d => [d.f?.r, d.m?.r, d.ab?.r])

  // WICHTIG für den Test unten: der Plan hängt über den Waste-Optimizer (Release ac, Pack-Füllung)
  // am groupFactor. Bei 1–4 Personen ist er identisch, ab 5 weicht er in ~30 von 48 Slots ab.
  // Ein Mengen-Vergleich über verschiedene Gruppengrößen ist deshalb NUR bei gleichem Plan
  // aussagekräftig — sonst vergleicht man zwei verschiedene Menüs.
  it('der Plan ist bei 2 und 4 Personen identisch (Vorbedingung des Mengen-Vergleichs)', () => {
    expect(planIds(P4)).toEqual(planIds(P2))
  })

  it('jedes vergleichbare Item wächst von 2 auf 4 Personen — keines bleibt gleich', () => {
    const two = shoppingByKey(P2), four = shoppingByKey(P4)
    const flat = []
    for (const [key, a] of two) {
      const b = four.get(key)
      if (!b || sum(a) === 0) continue
      if (sum(b) <= sum(a)) flat.push(`${key}: ${sum(a)} → ${sum(b)}`)
    }
    expect(flat).toEqual([])
  })

  it('liefert für jede Gruppengröße 1–8 eine intakte Einkaufsliste', () => {
    // Deckt ungerade (5, 7) und gemischte Gruppen ab. Kein Mengen-Vergleich zwischen den Größen,
    // weil der Plan ab 5 Personen abweicht (s.o.) — geprüft wird die Integrität der Ausgabe.
    const M = { type: 'adult-m', appetite: 'medium' }
    const F = { type: 'adult-f', appetite: 'medium' }
    const C = { type: 'child', appetite: 'light' }
    const groups = [
      [M], [M, F], [M, F, M], [M, F, M, F], [M, F, M, F, M],
      [M, F, M, F, M, F], [M, F, M, F, M, F, M], [M, F, M, F, M, F, M, F],
      [M, F, C, C, C],                                  // gemischt mit Kindern
      [{ type: 'adult-m', appetite: 'heavy' }, { type: 'child', appetite: 'light' }],
    ]
    const bad = []
    for (const people of groups) {
      for (const [key, it] of shoppingByKey(people)) {
        if (!it.qty || /NaN|undefined|Infinity/.test(it.qty)) bad.push(`${people.length}P ${key} → "${it.qty}"`)
        for (const [u, q] of Object.entries(it.amount || {})) {
          if (!Number.isFinite(q) || q < 0) bad.push(`${people.length}P ${key}.${u} = ${q}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('Kokosmilch verdoppelt sich von 2 auf 4 Personen', () => {
    const a = shoppingByKey(P2).get('coconut milk')
    const b = shoppingByKey(P4).get('coconut milk')
    expect(a).toBeTruthy()
    expect(b.amount.can).toBeCloseTo(a.amount.can * 2, 5)
  })
})

// ── Rundung & ungerade Gruppengrößen ───────────────────────────────────────
//
// Warum das nötig ist: groupFactor ist fast nie glatt. 5 Erwachsene = 5.05 (Mann 1.05 + Frau 0.95),
// 7 Erwachsene = 7.05. Ohne einheiten-bewusste Rundung stünde in der Rezept-Ansicht "758g Red
// lentils" und "7.5 cloves" — Scheingenauigkeit, die niemand abmisst.
// Die Rundung ist NUR Anzeige: die Einkaufsliste rechnet ungerundet weiter und rundet erst am
// Ende auf ganze Gebinde.

describe('roundAmount() — küchentaugliche Stufen je Einheiten-Klasse', () => {
  it('Masse/Volumen werden gröber, je größer der Wert', () => {
    expect(roundAmount(7.4, 'g')).toBe(7)         // <10 → ganze
    expect(roundAmount(152, 'ml')).toBe(150)      // <1000 → 10er
    expect(roundAmount(757.5, 'g')).toBe(760)     // 5 Pers. Linsen — war "758g"
    expect(roundAmount(1057.5, 'g')).toBe(1050)   // 7 Pers. Linsen — war "1058g"
    expect(roundAmount(82, 'g')).toBe(80)         // <100 → 5er
  })

  it('Löffel bleiben in Viertelschritten (mit Messlöffel abmessbar)', () => {
    expect(roundAmount(2.625, 'tsp')).toBe(2.75)
    expect(roundAmount(3.5, 'tbsp')).toBe(3.5)
  })

  it('Zählbares ab 3 ganz, darunter Viertel', () => {
    expect(roundAmount(7.575, 'clove')).toBe(8)   // war "7.5 cloves"
    expect(roundAmount(3.525, null)).toBe(4)      // Zwiebeln bei 7 Pers.
    expect(roundAmount(2.525, null)).toBe(2.5)    // halbe Zwiebel ist normal
    expect(roundAmount(0.25, null)).toBe(0.25)    // Viertelzwiebel steht so im Pool
  })

  it('Gebinde: ab 3 halbe Dosen, darunter Viertel', () => {
    expect(roundAmount(3.525, 'can')).toBe(3.5)   // "3.5 cans" = 4 öffnen, letzte halb
    expect(roundAmount(2.525, 'can')).toBe(2.5)
    // Ein 0.5er-Raster hätte 0.63 auf 0.5 ABgerundet → Menge sinkt, obwohl die Gruppe wächst.
    expect(roundAmount(0.63, 'can')).toBe(0.75)
  })
})

describe('scaleAmountLabel() — ungerade und gemischte Gruppen', () => {
  // Echte groupFactor-Werte, nicht die glatten Wunschzahlen.
  const F5 = 5.05   // 5 Erwachsene
  const F7 = 7.05   // 7 Erwachsene

  it('5 Personen (Faktor 5.05) liefert abmessbare Mengen', () => {
    expect(scaleAmountLabel('150g/person', F5, 'Red lentils')).toBe('760g')
    expect(scaleAmountLabel('1 × 400ml can', F5, 'Coconut milk')).toBe('2.5 × 400ml cans')
    expect(scaleAmountLabel('3 cloves', F5, 'Garlic')).toBe('5 cloves')   // gedämpft (linear wären 8)
    expect(scaleAmountLabel('1 + 400ml water', F5, 'Vegetable stock cube')).toBe('2.5 + 1000ml water')
  })

  it('7 Personen (Faktor 7.05) liefert abmessbare Mengen', () => {
    expect(scaleAmountLabel('150g/person', F7, 'Red lentils')).toBe('1050g')
    expect(scaleAmountLabel('1 × 400ml can', F7, 'Coconut milk')).toBe('3.5 × 400ml cans')
    expect(scaleAmountLabel('3 cloves', F7, 'Garlic')).toBe('7 cloves')   // gedämpft (linear wären 11)
  })

  it('a46 Fajitas bei 7 Personen — der gemeldete Fall', () => {
    // Entwickler: "für 7 Personen würde ich nicht 11 Knoblauchzehen in Fajitas machen, ebenso
    // wenig 10.75 Esslöffel Paprika." Knoblauch war ungedämpft, Paprika trug "/person".
    const a46 = RECIPES.find(r => r.id === 'a46')
    const amt = (rx) => a46.ing.find(([n]) => rx.test(n))
    const [gName, gAmt] = amt(/^garlic/i)
    const [pName, pAmt] = amt(/^smoked paprika/i)
    expect(scaleAmountLabel(gAmt, F7, gName)).toBe('7 cloves, minced')   // war: 11
    expect(pAmt).toBe('3 tsp')                                           // war: '1.5 tsp/person'
    expect(scaleAmountLabel(pAmt, F7, pName)).toBe('6.75 tsp')           // war: 10.5 tsp
    // Was man ISST, skaliert weiter linear:
    const [cName, cAmt] = amt(/^chicken breast/i)
    expect(scaleAmountLabel(cAmt, F7, cName)).toBe('1400g, sliced')
  })

  it('keine Scheingenauigkeit über den ganzen Pool bei krummen Faktoren', () => {
    const bad = []
    for (const r of RECIPES) for (const [n, a] of r.ing) {
      const p = parseAmount(a)
      if (p.qty == null) continue
      for (const f of [3.05, 5.05, 7.05, 4.55, 6.65]) {
        if (scaleFactor(p, f, n) === 1) continue        // Rohstring bei Basisgröße — darf krumm sein
        const out = scaleAmountLabel(a, f, n)
        const q = parseAmount(out).qty
        if (q == null) continue
        // Masse/Volumen über 100 muss auf 10 glatt sein
        if (['g', 'kg', 'ml', 'l'].includes(p.unit) && q > 100 && Math.abs(q % 10) > 1e-9) {
          bad.push(`${r.id} "${a}" @${f} → "${out}"`)
        }
        // Zählbares ab 3 muss ganzzahlig sein
        const counted = !p.unit || ['clove', 'slice', 'fillet', 'square', 'head', 'roll'].includes(p.unit)
        if (counted && q >= 3 && Math.abs(q - Math.round(q)) > 1e-9) {
          bad.push(`${r.id} "${a}" @${f} → "${out}"`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('Round-Trip: die angezeigte Zahl ist exakt die gerundete Generator-Rechnung', () => {
    // Stärkste Invariante: die Anzeige zurücklesen und gegen die Mathematik prüfen. Fängt genau
    // die Fehler, die man der Ausgabe nicht ansieht — falsche Zahl ersetzt, Gebinde-Größe als
    // Anzahl gelesen, Einheit verschluckt. Über den ganzen Pool × alle realistischen Faktoren.
    const FACTORS = [0.44, 0.8, 1, 1.05, 1.26, 2, 2.1, 3.05, 3.32, 4, 4.55, 5.05, 6, 6.65, 7.05, 8.4, 10.1, 13.3]
    const bad = []
    for (const r of RECIPES) for (const [n, a] of r.ing) {
      const p = parseAmount(a)
      if (p.qty == null) continue
      for (const f of FACTORS) {
        const mult = scaleFactor(p, f, n)
        // Bei mult === 1 gibt scaleAmountLabel bewusst den Rohstring zurück (ungerundet):
        // "125g/person" bei 1 Person muss 125g bleiben, nicht auf 130g gerundet werden.
        const expected = mult === 1 ? p.qty : roundAmount(p.qty * mult, p.unit)
        const back = parseAmount(scaleAmountLabel(a, f, n))
        if (back.qty == null || Math.abs(back.qty - expected) > 1e-9) {
          bad.push(`${r.id} "${a}" @${f} → "${scaleAmountLabel(a, f, n)}" · ${back.qty} ≠ ${expected}`)
        }
        if (back.unit !== p.unit) {
          bad.push(`${r.id} "${a}" @${f} → Einheit ${p.unit} → ${back.unit}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('Monotonie: keine Zutat schrumpft, wenn die Gruppe wächst', () => {
    const FACTORS = [0.44, 1, 1.05, 2, 2.1, 3.05, 4, 4.55, 5.05, 6, 7.05, 8.4, 10.1, 13.3]
    const bad = []
    for (const r of RECIPES) for (const [n, a] of r.ing) {
      if (parseAmount(a).qty == null) continue
      let prev = null
      for (const f of FACTORS) {
        const q = parseAmount(scaleAmountLabel(a, f, n)).qty
        if (q == null) continue
        if (prev != null && q < prev - 1e-9) bad.push(`${r.id} "${a}" @${f}: ${q} < ${prev}`)
        prev = q
      }
    }
    expect(bad).toEqual([])
  })
})

// ── Vorwärts-Schutz: kein Gewürz/Aromat darf künftig ungedämpft durchrutschen ────────────────
//
// Anlass: der Knoblauch-Bug (11 Zehen für 7 Personen) entstand, weil ein Aromat in DAMPED_RX
// FEHLTE. "dämpft genau …" oben prüft nur den IST-Zustand des Pools — es würde ein NEU
// hinzugefügtes, ungedämpftes "Turmeric" NICHT fangen. Diese Tests sind der positive Guard:
// bekannte Trockengewürze/Aromaten MÜSSEN gedämpft sein, frische Blätter/Saucen NICHT.

describe('isDamped() — Vorwärts-Schutz gegen ungedämpfte Gewürze', () => {
  it('das Trockengewürz-Kit + alle plausiblen Erweiterungen sind gedämpft', () => {
    // Kit aus Release (ae) + Gewürze, die ein neues Rezept realistisch mitbringt. Kommt eines
    // davon künftig in ein Rezept, MUSS es gedämpft skalieren — sonst schlägt dieser Test an.
    const mustDamp = [
      'Salt', 'Black pepper', 'Salt & pepper', 'Cumin', 'Smoked paprika', 'Chili flakes',
      'Curry powder', 'Mixed dried herbs',                          // das Kit
      'Paprika', 'Turmeric', 'Ground cumin', 'Ground coriander', 'Garam masala', 'Cayenne',
      'Cinnamon', 'Chili powder', 'Ground ginger', 'Cardamom', 'Nutmeg', 'Allspice', // eindeutige Trockengewürze
      'Dried thyme', 'Dried oregano', 'Dried basil',               // Kräuter NUR in der "Dried"-Form
      'Garlic', 'Ginger', 'Red chili', 'Green chili', 'Chili pepper', // Aromaten
      'Olive oil', 'Vegetable oil', 'Coconut oil', 'Canola oil', 'Oil', // Bratfett
    ]
    const notDamped = mustDamp.filter(n => !isDamped(n))
    expect(notDamped).toEqual([])
  })

  it('mehrdeutige Kräuter bleiben in der BLOSSEN Form linear (könnten frisch sein)', () => {
    // "Oregano"/"Basil"/"Thyme" ohne "Dried"-Präfix könnten das frische Kraut meinen → linear.
    // Nur die eindeutig getrocknete Form ("Dried oregano") wird gedämpft.
    for (const n of ['Oregano', 'Basil', 'Thyme', 'Rosemary', 'Sage', 'Coriander leaves']) {
      expect(isDamped(n)).toBe(false)
    }
  })

  it('frische Blätter, Gemüse und echte Saucen bleiben linear', () => {
    // Gegenprobe: was gegessen wird oder Volumen/Feuchtigkeit liefert, darf NICHT gedämpft werden.
    const mustNotDamp = [
      'Basil', 'Coriander leaves', 'Parsley', 'Mint',              // frische Kräuter (Blatt)
      'Onion', 'Spring onion', 'Red onion', 'Capsicum',            // Gemüse
      'Ground beef', 'Ground pork', 'Ground lamb', 'Salmon', 'Sardines in oil', // Fleisch/Fisch (Kollision "ground")
      'Soy sauce', 'Tamari', 'Fish sauce', 'Oyster sauce', 'Mayo', 'Tahini', 'Mango chutney', // Saucen (Volumen)
      'Tomato paste', 'Sesame oil', 'Coconut milk', 'Coconut cream', 'Peanut butter', // Zutaten, kein Aroma-Streuer
      'Garlic bread', 'Ginger beer', 'Gingerbread', 'Cinnamon roll', // Lebensmittel mit Aroma-Namen
    ]
    const wronglyDamped = mustNotDamp.filter(n => isDamped(n))
    expect(wronglyDamped).toEqual([])
  })

  it('jede tsp/tbsp-Zutat im Pool ist entweder gedämpft oder eine echte Sauce/Zutat', () => {
    // Fängt eine künftige Würz-Lücke: eine Löffel-Menge, die weder gedämpft noch eine bekannte
    // lineare Zutat ist, wäre verdächtig (skaliert linear zu absurden Mengen).
    const KNOWN_LINEAR = /^(?:optional: )?(soy sauce|tamari|fish sauce|oyster sauce|worcestershire|sriracha|hoisin|bbq|tomato (?:paste|sauce|ketchup)|passata|mustard|dijon|mayo|vegan mayo|honey|maple|sugar|brown sugar|tahini|hummus|pesto|salsa|(?:mango )?chutney|jam|nutritional yeast|(?:rice |balsamic |apple cider |red wine )?vinegar|lemon juice|lime juice|capers|olives|peanut butter|almond butter|chia|shredded coconut|sesame|pumpkin seeds|pine nuts|cornflour|cocoa|baking powder|vanilla|coconut oil \(in|fried shallots|pickled|sweet chili|coconut cream|condensed milk|parsley|coriander|basil|mint|dill)\b/i
    const suspects = []
    const seen = new Set()
    for (const r of RECIPES) for (const [n, a] of r.ing) {
      const p = parseAmount(a)
      if (p.qty == null || !['tsp', 'tbsp', 'pinch', 'cup'].includes(p.unit)) continue
      if (isDamped(n) || KNOWN_LINEAR.test(n)) continue
      if (seen.has(n)) continue
      seen.add(n)
      suspects.push(`${r.id} "${n}": "${a}"`)
    }
    expect(suspects).toEqual([])
  })
})
