// ─────────────────────────────────────────────────────────────────────────
//  SEITEN-TUTORIALS — welche Funktion wird auf welcher Seite erklärt?
// ─────────────────────────────────────────────────────────────────────────
//
// Pro Seite eine Schritt-Liste. Jeder Schritt zeigt genau EINE Funktion: der Rest der
// App wird ausgegraut, das Ziel-Element bleibt hell und bedienbar, ein kleines Popup
// erklärt es. Der Schritt ist erledigt, sobald der Nutzer die Funktion ausführt
// (Tap auf das Ziel-Element) — danach kommt der nächste Schritt bzw. das Tutorial
// verschwindet.
//
// Trennung wie im Rest der App: hier stehen NUR Struktur + Selektoren, die Texte
// liegen in `strings.js` unter `S.tours[page][step.key]` (i18n-Vorbereitung, CLAUDE.md).
//
// Feld-Bedeutung:
//   key     — Text-Schlüssel in S.tours[page] UND stabile Schritt-ID
//   sel     — CSS-Selektor des Ziel-Elements. IMMER ein `data-tour="…"`-Anker in der
//             Komponente, nie eine Layout-Klasse: so bricht ein CSS-Rename das Tutorial
//             nicht still. Der ERSTE Treffer im DOM wird hervorgehoben.
//   skipIf  — optional: Schritt überspringen, wenn er in diesem Zustand sinnlos ist
//             (z.B. „Tag aufklappen", wenn schon ein Tag offen ist).
//   wait    — optional: Ziel erscheint erst DURCH den vorherigen Schritt (z.B. der
//             Swap-Button existiert erst, wenn ein Tag aufgeklappt ist). Ohne `wait`
//             wird ein fehlendes Ziel sofort übersprungen statt gewartet.
//   doneWhen— optional: der Schritt endet an einem ZUSTAND, nicht am Tap (Datums-Range
//             braucht zwei Taps). Solange die Bedingung falsch ist, bleibt der Spotlight
//             stehen; der Tap auf das Ziel schaltet dann NICHT weiter.
//
// Fehlt ein Ziel dauerhaft (leere Seite, Feature nicht sichtbar), wird der Schritt
// stillschweigend übersprungen. Wurde dadurch KEIN Schritt gezeigt, gilt das Tutorial
// nicht als gesehen → es erscheint beim nächsten Besuch erneut (z.B. Stock-Tab, der
// vor dem ersten Einkauf leer ist).

// Ein Zeitraum ist gewählt, sobald „↺ Re-pick dates" existiert (rendert nur mit Range).
const hasDateRange = () => !!document.querySelector('[data-tour="cfg-repick"]')

export const TOURS = {
  // ── Trip-Erstellung (Wizard-Schritte, `page` = 'config-' + S.config.steps[].key) ──
  // Die Erklärung folgt hier dem Bau-Ablauf: Zeitraum wählen → Tag antippen → im Tages-
  // Sheet Resupply-Stop und Restaurant setzen. Die Schritte 3+4 zielen INS offene DaySheet
  // (PageTour pausiert nur, wenn das Ziel NICHT im Sheet liegt).
  'config-dates': [
    { key: 'calendar',   sel: '[data-tour="cfg-calendar"]', skipIf: hasDateRange, doneWhen: hasDateRange },
    { key: 'day',        sel: '[data-tour="cfg-tripday"]',    wait: true },
    { key: 'stop',       sel: '[data-tour="cfg-stop"]',       wait: true },
    { key: 'restaurant', sel: '[data-tour="cfg-restaurant"]', wait: true },
  ],

  'config-group': [
    { key: 'people',    sel: '[data-tour="cfg-people"]' },
    { key: 'diet',      sel: '[data-tour="cfg-diet"]' },
    { key: 'allergies', sel: '[data-tour="cfg-allergies"]' },
  ],

  'config-kitchen': [
    { key: 'effort',   sel: '[data-tour="cfg-effort"]' },
    { key: 'fridge',   sel: '[data-tour="cfg-fridge"]' },
    { key: 'generate', sel: '[data-tour="cfg-generate"]' },
  ],

  // Reihenfolge zählt: gibt es schon einen Trip, ist „öffnen" das Wichtigste; beim
  // allerersten Start fehlt die Karte → Schritt entfällt und „Trip planen" ist dran.
  home: [
    { key: 'open',   sel: '[data-tour="home-open"]' },
    { key: 'create', sel: '[data-tour="home-create"]' },
  ],

  menu: [
    // Tag aufklappen — entfällt, wenn bereits ein Tag offen ist (z.B. „heute").
    { key: 'day',  sel: '[data-tour="menu-day"]', skipIf: () => !!document.querySelector('.day-body') },
    { key: 'swap', sel: '[data-tour="menu-swap"]', wait: true },
    { key: 'log',  sel: '[data-tour="menu-log"]',  wait: true },
  ],

  recipes: [
    { key: 'card', sel: '[data-tour="recipes-card"]' },
    { key: 'own',  sel: '[data-tour="recipes-new"]' },
  ],

  // Ein Tutorial für ALLE Versorgungspunkte (Cairns/Bamaga/…) — die Bedienung ist überall
  // dieselbe, es soll nicht pro Stop erneut erscheinen.
  shopping: [
    { key: 'tick',  sel: '[data-tour="shop-tick"]' },
    { key: 'uses',  sel: '[data-tour="shop-uses"]' },
    { key: 'share', sel: '[data-tour="shop-share"]' },
  ],

  // 'empty' und 'row' schließen einander aus: vor dem ersten Einkauf existiert nur der
  // Empty-State, danach nur die Bestands-Zeilen — der jeweils andere Schritt entfällt
  // automatisch (fehlendes Ziel).
  inventory: [
    { key: 'empty', sel: '[data-tour="inv-empty"]' },
    { key: 'row',   sel: '[data-tour="inv-row"]' },
    { key: 'add',   sel: '[data-tour="inv-add"]' },
  ],
}
