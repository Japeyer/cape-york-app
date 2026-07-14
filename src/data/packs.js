// Typische australische Verpackungsgrößen (Coles/Woolworths, Größenordnung 2025/2026) für die
// häufigsten Grundzutaten. Zweck (Stufe-2-Waste-Optimierung nach dem Eigen-Trip):
//  1. Die Einkaufsliste rundet Masse-/Volumen-Mengen auf ganze Packungen auf und zeigt den Rest
//     ("1 × 1kg · ~300g left"), damit klar ist wie viel wirklich gekauft werden muss.
//  2. Der Generator bevorzugt Menüs, die bereits geöffnete Packungen aufbrauchen (weniger
//     Foodwaste durch Groß-Packs, weniger verschiedene Grundzutaten).
//
// Keys = kanonische Zutaten-Keys aus `generator.js` (`canonicalIngredient().key`, lowercase).
// Zusammengefasste Varianten laufen unter dem kanonischen Namen: alle Reissorten → `rice`,
// alle Nudel-Formen → `pasta`. Nicht gelistete Zutaten behalten das bisherige
// "kaufe die Summe"-Verhalten (kein Pack-Runden).
//
//   pack           – Packungsgröße in `unit`
//   unit           – 'g' | 'ml' (Masse/Volumen → Rundung in der Liste) ODER ein Gebinde
//                    ('can' | 'carton'). Gebinde werden generisch auf ganze Einheiten gerundet.
//   contains       – (optional, nur Gebinde) Inhalt einer Einheit in `containsUnit`. Erlaubt, in
//                    Rezepten unterschiedlich notierte Mengen ("400ml" vs. "1 can") zu EINER
//                    Gebinde-Zahl zusammenzuführen, statt "500 ml + 1 can" nebeneinander.
//   containsUnit   – 'g' | 'ml' zu `contains`
//   mainStaple     – true für die sperrigen "eine Sorte pro Gericht"-Grundnahrungsmittel
//                    (Reis/Pasta/Couscous/Hafer). NUR diese steuern die Menü-Auswahl (weniger
//                    verschiedene Packs). Mehl/Zucker/Linsen sind billige Vorrats-Zutaten →
//                    Pack-Rundung ja, aber KEIN Auswahl-Bias (sonst verzerrt es die Rezeptwahl).
//   perishableOpen – true, wenn nach dem Öffnen ohne Kühlung schnell verderblich. Der Generator
//                    plant solche Zutaten bevorzugt in Rezepte, die sie zeitnah mitverbrauchen.
//   label          – menschenlesbare Packungsangabe für die Liste
export const PACK_SIZES = {
  // ── Sperrige Haupt-Grundnahrungsmittel (steuern die Menü-Auswahl, Kern des Waste-Problems) ──
  'rice':         { pack: 1000, unit: 'g', mainStaple: true, perishableOpen: false, label: '1kg bag' },
  'pasta':        { pack: 500,  unit: 'g', mainStaple: true, perishableOpen: false, label: '500g pack' },
  'couscous':     { pack: 500,  unit: 'g', mainStaple: true, perishableOpen: false, label: '500g box' },
  'rolled oats':  { pack: 750,  unit: 'g', mainStaple: true, perishableOpen: false, label: '750g pack' },
  'oats':         { pack: 750,  unit: 'g', mainStaple: true, perishableOpen: false, label: '750g pack' },

  // ── Billige Vorrats-Zutaten: nur Pack-Rundung, kein Auswahl-Bias ──
  'flour':        { pack: 1000, unit: 'g', perishableOpen: false, label: '1kg bag' },
  'plain flour':  { pack: 1000, unit: 'g', perishableOpen: false, label: '1kg bag' },
  'sugar':        { pack: 1000, unit: 'g', perishableOpen: false, label: '1kg bag' },
  'brown sugar':  { pack: 500,  unit: 'g', perishableOpen: false, label: '500g pack' },
  'lentils':      { pack: 500,  unit: 'g', perishableOpen: false, label: '500g pack' },

  // ── Nach Gewicht verkaufte, angebrochen begrenzt haltbare Zutaten ──
  'feta':         { pack: 200,  unit: 'g', perishableOpen: true,  label: '200g pack' },
  'halloumi':     { pack: 225,  unit: 'g', perishableOpen: true,  label: '225g pack' },
  'ricotta':      { pack: 250,  unit: 'g', perishableOpen: true,  label: '250g tub' },
  'bacon':        { pack: 250,  unit: 'g', perishableOpen: true,  label: '250g pack' },

  // ── Dosen/Kartons: Rundung läuft generisch; `contains` führt gemischt notierte Mengen zusammen ──
  // `contains`/`containsUnit` erlauben, dass eine Zutat in Rezepten mal in g/ml, mal in Dosen notiert
  // ist und trotzdem zu EINER Dosen-Zahl zusammengeführt wird (statt "200 g + 1 can" nebeneinander).
  'coconut milk':   { pack: 1, unit: 'can',    contains: 400,  containsUnit: 'ml', perishableOpen: true, label: '400ml can' },
  'diced tomatoes': { pack: 1, unit: 'can',    contains: 400,  containsUnit: 'g',  perishableOpen: true, label: '400g can' },
  'chickpeas':      { pack: 1, unit: 'can',    contains: 400,  containsUnit: 'g',  perishableOpen: true, label: '400g can' },
  'black beans':    { pack: 1, unit: 'can',    contains: 400,  containsUnit: 'g',  perishableOpen: true, label: '400g can' },
  'baked beans':    { pack: 1, unit: 'can',    contains: 400,  containsUnit: 'g',  perishableOpen: true, label: '400g can' },
  'white beans':    { pack: 1, unit: 'can',    contains: 400,  containsUnit: 'g',  perishableOpen: true, label: '400g can' },
  'kidney beans':   { pack: 1, unit: 'can',    contains: 400,  containsUnit: 'g',  perishableOpen: true, label: '400g can' },
  'corn':           { pack: 1, unit: 'can',    contains: 400,  containsUnit: 'g',  perishableOpen: true, label: '400g can' },
  'peas':           { pack: 1, unit: 'can',    contains: 400,  containsUnit: 'g',  perishableOpen: true, label: '400g can' },
  'refried beans':  { pack: 1, unit: 'can',    contains: 400,  containsUnit: 'g',  perishableOpen: true, label: '400g can' },
  'tuna in oil':    { pack: 1, unit: 'can',    contains: 185,  containsUnit: 'g',  perishableOpen: true, label: '185g can' },
  'canned salmon':  { pack: 1, unit: 'can',    contains: 210,  containsUnit: 'g',  perishableOpen: true, label: '210g can' },
  'uht cream':      { pack: 1, unit: 'carton', contains: 250,  containsUnit: 'ml', perishableOpen: true, label: '250ml carton' },
  'cream':          { pack: 1, unit: 'carton', contains: 250,  containsUnit: 'ml', perishableOpen: true, label: '250ml carton' },
  'uht milk':       { pack: 1, unit: 'carton', contains: 1000, containsUnit: 'ml', perishableOpen: true, label: '1L carton' },
}
