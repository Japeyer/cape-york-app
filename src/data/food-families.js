// Lebensmittel-Familien für die Rezept-Icons.
//
// ── 19 GRUPPEN, VORHER 9 ─────────────────────────────────────────────────────
// Die 9er-Fassung war durch die Farbe begrenzt: Alle Icons waren ähnlich abstrakte
// Silhouetten, also musste die FARBE die Unterscheidung allein tragen — und die warme
// Palette der App gibt keine 17 klar trennbaren Töne her.
//
// Mit den neuen Icons trägt die FORM die Identität: Steak, Keule, Wurst und Fisch sind
// vier verschiedene Objekte, nicht viermal „irgendwas Fleischiges". Damit ist die Farbe
// nur noch Unterstützung und die Gruppen dürfen feiner werden.
//
// ── HERKUNFT DER ICONS ───────────────────────────────────────────────────────
// `public/food/*.png` — erzeugt über die OpenAI-Images-API (siehe CHANGELOG), aus dem
// 4×4-Raster freigestellt und auf 96 px skaliert. KEINE Vektoren: der Entwickler hat
// diesen mehrfarbigen, handgezeichneten Stil ausdrücklich gewählt, und den kann eine
// Kontur-Zeichnung nicht wiedergeben.
//
// ── DATEN BLEIBEN UNANGETASTET ───────────────────────────────────────────────
// `recipes.js` führt weiter Emoji. Die Familie kommt aus dem Lookup hier. Dadurch ist
// die Umstellung ohne Datenmigration reversibel, und nutzereigene Rezepte (Emoji-
// Freitextfeld im Editor) fallen automatisch auf ihr Emoji zurück statt zu brechen.

// `color` wird nicht mehr zum Einfärben gebraucht — die Icons sind mehrfarbige Bilder.
// Sie steht als REPRÄSENTATIVE Farbe der Gruppe für Stellen, an denen kein Bild passt
// (etwa ein Punkt-Marker) und dokumentiert zugleich die Palette.
//
// Die Werte sind AUS DEN BILDERN GEMESSEN, nicht geschätzt: häufigste Farbe je Icon,
// auf 5 Bit je Kanal quantisiert, sehr helle und sehr dunkle Pixel ausgenommen.
// Wer ein Icon austauscht, sollte den Wert neu messen statt ihn zu raten.
export const FOOD_FAMILIES = {
  meat:      { label: 'Red meat',        color: '#BB2921' },
  poultry:   { label: 'Poultry',         color: '#C46C0A' },
  cured:     { label: 'Cured & BBQ',     color: '#B42C1E' },
  fish:      { label: 'Fish & seafood',  color: '#2973AE' },
  egg:       { label: 'Eggs',            color: '#B96022' },
  dairy:     { label: 'Cheese & dairy',  color: '#FEBD26' },
  veg:       { label: 'Vegetables',      color: '#FE7609' },
  salad:     { label: 'Salad & greens',  color: '#416F34' },
  pasta:     { label: 'Pasta',           color: '#2A72AD' },
  rice:      { label: 'Rice & grains',   color: '#7E4989' },
  bread:     { label: 'Bread & wraps',   color: '#BA6623' },
  soup:      { label: 'Soup & stew',     color: '#F67B8E' },
  spice:     { label: 'Spicy',           color: '#D12422' },
  fruit:     { label: 'Fruit',           color: '#D22624' },
  sweet:     { label: 'Sweet',           color: '#C37D3D' },
  pantry:    { label: 'Pantry & nuts',   color: '#69296C' },
  dining:    { label: 'Eating out',      color: '#2675B9' },
  leftovers: { label: 'Leftovers',       color: '#1D69BD' },
  drinks:    { label: 'Drinks',          color: '#06828A' },
}

// Emoji → Familie. Deckt alle 45 in recipes.js vorkommenden Emoji ab; die
// Vollständigkeit prüft ein Test, damit ein neues Rezept mit unbekanntem Emoji nicht
// stumm im Fallback landet.
export const EMOJI_FAMILY = {
  // Fleisch, feiner aufgeteilt als in der 9er-Fassung
  '🥩': 'meat', '🍖': 'meat', '🍔': 'meat',
  '🍗': 'poultry',
  '🥓': 'cured', '🌭': 'cured',
  // Fisch
  '🐟': 'fish', '🍣': 'fish',
  // Ei und Milchprodukt getrennt — vorher eine Gruppe
  '🥚': 'egg', '🍳': 'egg',
  '🧀': 'dairy',
  // Gemüse und Blattsalat getrennt
  '🍆': 'veg', '🍅': 'veg', '🍄': 'veg', '🎃': 'veg', '🌽': 'veg', '🍠': 'veg',
  '🥗': 'salad', '🌱': 'salad', '🥑': 'salad', '🫒': 'salad',
  // Beilagen: vorher alles „grain", jetzt drei Gruppen
  '🍝': 'pasta',
  '🍚': 'rice', '🍛': 'rice',
  '🌯': 'bread', '🌮': 'bread', '🥙': 'bread', '🥪': 'bread', '🥞': 'bread', '🥟': 'bread',
  // Suppe und Eintopf
  '🍜': 'soup', '🍲': 'soup', '🥣': 'soup', '🥄': 'soup',
  '🌶': 'spice',
  // Obst und Süsses getrennt
  '🍌': 'fruit', '🍓': 'fruit', '🥥': 'fruit',
  '🍪': 'sweet',
  '🫙': 'pantry', '🥫': 'pantry', '🥜': 'pantry',
  // Die alte Restkategorie „other" ist in drei Gruppen aufgelöst — Restaurantbesuch,
  // Reste und Getränk sind in einem Essensplaner drei verschiedene Dinge.
  '🍽': 'dining',
  '♻️': 'leftovers',
  '🍷': 'drinks',
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
  return FOOD_FAMILIES[family]?.color ?? FOOD_FAMILIES.dining.color
}
