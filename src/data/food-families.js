// Lebensmittel-Familien für die Rezept-Icons (Ebene 2 des Icon-Systems).
//
// HINTERGRUND — warum Familien statt Gerichte:
// Die 97 Rezepte führen 45 verschiedene Emoji, 23 davon genau einmal. 45 monochrome
// Formen wären bei 24 px nicht auseinanderzuhalten: Nudeln, Curry und Suppe sind
// dreimal dieselbe Schüssel. Auf der Rezeptkarte steht ohnehin der Name daneben —
// das Icon muss nicht identifizieren, nur einordnen. Neun Familien reichen dafür.
//
// WARUM NEUN: Die Unterscheidung trägt hier die FARBE, nicht die Form (bei kleinen
// Grössen löst das Auge Farbmasse vor Silhouette vor Detail auf). Die Palette der App
// ist warm — Rotbraun, Ocker, Sand, Orange liegen dicht beieinander. Mehr als neun
// Töne lassen sich darin nicht sicher trennen. Jede zusätzliche Familie hätte die
// bestehenden unschärfer gemacht.
//
// FARBHERKUNFT: Dieselbe Logik, die `cape-york-pois.js` schon fährt (dort acht
// Kartenkategorien mit je einer Farbe). Blau #3E7AA9, Grün #5C8A4F, Braun #8B5E3C und
// Orange #C0600C sind von dort bzw. aus den CSS-Variablen übernommen.
//
// DATEN BLEIBEN UNANGETASTET: `recipes.js` führt weiter Emoji. Die Zuordnung passiert
// hier per Lookup. Dadurch ist die Umstellung ohne Datenmigration reversibel und
// nutzer-eigene Rezepte (Emoji-Freitextfeld im Editor) laufen automatisch in den
// Fallback, statt zu brechen.

export const FOOD_FAMILIES = {
  meat:   { label: 'Meat',            color: '#A8452B' },
  fish:   { label: 'Fish & seafood',  color: '#3E7AA9' },
  egg:    { label: 'Egg & dairy',     color: '#D99A2B' },
  veg:    { label: 'Vegetables',      color: '#5C8A4F' },
  grain:  { label: 'Grains & bread',  color: '#C9A464' },
  soup:   { label: 'Soup & stew',     color: '#C0600C' },
  spice:  { label: 'Spicy',           color: '#C0392B' },
  fruit:  { label: 'Fruit & sweet',   color: '#D4663D' },
  other:  { label: 'Other',           color: '#7C7269' },
}

// Emoji → Familie. Deckt alle 45 in recipes.js vorkommenden Emoji ab; die Vollständigkeit
// prüft ein Test, damit ein neues Rezept mit unbekanntem Emoji nicht stumm im Fallback landet.
export const EMOJI_FAMILY = {
  // meat (13 Rezepte)
  '🥩': 'meat', '🍗': 'meat', '🍖': 'meat', '🥓': 'meat', '🌭': 'meat', '🍔': 'meat',
  // fish (4)
  '🐟': 'fish', '🍣': 'fish',
  // egg & dairy (7)
  '🥚': 'egg', '🍳': 'egg', '🧀': 'egg',
  // vegetables — inkl. Salat und Wurzelgemüse (21)
  '🍆': 'veg', '🍅': 'veg', '🍄': 'veg', '🎃': 'veg', '🌽': 'veg', '🥑': 'veg',
  '🫒': 'veg', '🥗': 'veg', '🌱': 'veg', '🍠': 'veg',
  // grains & bread — Pasta, Reis, Wraps, Sandwiches (28, die grösste Familie)
  '🍝': 'grain', '🍚': 'grain', '🍛': 'grain', '🌯': 'grain', '🌮': 'grain',
  '🥙': 'grain', '🥪': 'grain', '🥞': 'grain', '🥟': 'grain',
  // soup & stew (6)
  '🍜': 'soup', '🍲': 'soup', '🥣': 'soup', '🥄': 'soup',
  // spicy (4)
  '🌶': 'spice',
  // fruit & sweet (8)
  '🍌': 'fruit', '🍓': 'fruit', '🥥': 'fruit', '🍪': 'fruit',
  // other — Reste, Restaurant, Vorratsglas, Konserve, Nüsse (6)
  '🍽': 'other', '🍷': 'other', '♻️': 'other', '🫙': 'other', '🥫': 'other', '🥜': 'other',
}

// Emoji treten mit und ohne Variantenselektor U+FE0F auf ('♻️' vs '♻') — in recipes.js
// gemischt, und was ein Nutzer ins Freitextfeld tippt, ist ohnehin offen. Deshalb eine
// zweite Tabelle mit normalisierten Schlüsseln. Es genügt NICHT, nur die Eingabe zu
// bereinigen: dann findet '♻' den Eintrag '♻️' nicht. Beide Seiten müssen normalisiert
// werden — genau das hat der Test in food-families.test.js aufgedeckt.
const NORMALIZED = Object.fromEntries(
  Object.entries(EMOJI_FAMILY).map(([e, fam]) => [e.replace(/️/g, ''), fam])
)

// Familie zu einem Emoji. `null` heisst: unbekannt → Aufrufer soll auf das Emoji zurückfallen.
// Wichtig für Nutzerrezepte, bei denen ein beliebiges Emoji eingetippt werden kann.
export function familyOf(emoji) {
  if (!emoji) return null
  return EMOJI_FAMILY[emoji] ?? NORMALIZED[emoji.replace(/️/g, '')] ?? null
}

export function familyColor(family) {
  return FOOD_FAMILIES[family]?.color ?? FOOD_FAMILIES.other.color
}
