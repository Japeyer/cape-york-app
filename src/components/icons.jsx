// Icon-Set der App — Linien-Icons als SVG-Komponenten.
//
// Warum SVG statt Emoji oder PNG:
//   - Emoji sehen auf jedem Gerät anders aus und haben keinen gemeinsamen Stil
//   - PNG wäre bei 24 px unscharf und würde das Offline-Bundle unnötig aufblähen
//   - SVG folgt via `currentColor` dem CSS — Aktiv-/Ruhe-Zustand ohne zweite Datei
//
// STILREGELN — für jedes neue Icon verbindlich, sonst zerfällt das Set:
//   Raster          24 × 24 viewBox
//   Sicherheitsrand 2 px, Motiv lebt in 2..22
//   Strichstärke    1.75
//   Enden/Ecken     round
//   Füllung         keine (fill="none"), reine Kontur
//   Farbe           stroke="currentColor", NIE eine feste Farbe im SVG
//   Optisch         Motiv vertikal/horizontal auf 12/12 zentrieren
//
// Die Geometrie wurde mit scripts-externem Prüfskript auf Rasterlage und
// Zentrierung kontrolliert (siehe CHANGELOG 2026-09-20).

// Gemeinsame Strich-Eigenschaften. Als Attribute am <svg>, damit sie auch dann
// greifen, wenn das Icon irgendwo ohne passende CSS-Regel gerendert wird.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

// Menu — Kalender mit Menü-Liste im Blatt.
// Der Kalenderrahmen sagt „Zeitplan", die Punkt-Linien-Zeilen sagen „Speisefolge".
// Damit folgt das Icon derselben Grammatik wie RecipesIcon: Grundobjekt + Marker.
//
// Zeilen bewusst nur drei und asymmetrisch (letzte kürzer) — das liest sich als Liste
// statt als Streifenmuster. Abstand 2.7 Einheiten; bei 20 px sind das ~2.2 px, also die
// Untergrenze des Machbaren. Wer die Zeilen enger setzt, bekommt einen Farbfleck.
export function MenuIcon(props) {
  return (
    <svg {...base} {...props}>
      {/* Kalenderrahmen mit Ringen */}
      <path d="M4.5 6.8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-12Z" />
      <path d="M4.5 9.8h15" />
      <path d="M8.5 3.1v3.4" />
      <path d="M15.5 3.1v3.4" />
      {/* Menü-Liste: Punkt + Zeile, dreimal */}
      <circle cx="8.4" cy="12.6" r="0.75" />
      <path d="M10.4 12.6h5.6" />
      <circle cx="8.4" cy="15.3" r="0.75" />
      <path d="M10.4 15.3h5.6" />
      <circle cx="8.4" cy="18" r="0.75" />
      <path d="M10.4 18h3.2" />
    </svg>
  )
}

// Kangaroo — Markenzeichen in der Topbar. Ersetzt das bisherige 🦘-Emoji.
//
// HERKUNFT: Die Silhouette stammt NICHT aus freier Hand. Sechs handgezeichnete
// Entwürfe lasen sich der Reihe nach als Vogel, Nagetier, rennender Hund und
// spitzköpfige Ratte — die Anatomie eines Kängurus ist zu eigen, um sie aus
// Grundformen zu treffen. Stattdessen: Silhouette per OpenAI-Bildmodell erzeugt
// (`scripts/gen-image.mjs`), dann mit `png-trace.mjs` im Scratchpad vektorisiert
// (PNG selbst dekodiert, Moore-Konturverfolgung, Douglas-Peucker eps 0.9,
// Catmull-Rom-Glättung). 845 Randpunkte -> 87 Stützpunkte.
//
// ZWEI BEWUSSTE ABWEICHUNGEN von der Set-Regel, beide gemessen begründet:
//
//   1. Strichstärke 1.0 statt 1.75. Bei 1.75 laufen Schwanzspitze, Vorderbeine
//      und die Lücke zwischen den Ohren zu — die Details der realen Silhouette
//      sind schmaler als der Strich. Bei 0.75–1.0 steht die Form sauber.
//   2. Darstellung mit 32 px statt 24 px (siehe `.topbar-mark` in App.css).
//      Bei 22 px versagt die Kontur bei JEDER Strichstärke: zu dünn verschwindet,
//      zu dick verschmiert. Das ist eine Grössenfrage, keine Zeichenfrage. Die
//      Topbar ist 56 px hoch, 32 px passen bequem hinein.
//
// Wer die Form ändern will, ändert nicht diesen Pfad, sondern erzeugt ein neues
// Quellbild und zeichnet es nach — von Hand ist hier nichts mehr zu gewinnen.
export function KangarooIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      <path d="M17.2 2.995 C17.35 3.025 17.75 3.325 17.91 3.525 C18.07 3.735 18.07 4.285 18.18 4.235 C18.28 4.195 18.44 3.455 18.53 3.265 C18.62 3.065 18.65 3.095 18.71 3.085 C18.77 3.065 18.84 3.035 18.89 3.175 C18.93 3.305 19 3.675 18.97 3.885 C18.95 4.085 18.75 4.285 18.71 4.415 C18.66 4.545 18.62 4.595 18.71 4.675 C18.8 4.765 18.96 4.705 19.24 4.945 C19.52 5.185 20.2 5.865 20.39 6.095 C20.59 6.335 20.44 6.275 20.39 6.365 C20.35 6.455 20.38 6.635 20.13 6.635 C19.88 6.635 19.12 6.405 18.89 6.365 C18.65 6.325 18.78 6.325 18.71 6.365 C18.63 6.405 18.47 6.455 18.44 6.635 C18.41 6.805 18.44 7.165 18.53 7.425 C18.62 7.695 18.92 7.935 18.97 8.225 C19.03 8.525 18.95 8.955 18.89 9.205 C18.83 9.455 18.66 9.525 18.62 9.735 C18.58 9.945 18.56 10.115 18.62 10.445 C18.68 10.765 18.92 11.305 18.97 11.685 C19.03 12.065 19 12.495 18.97 12.745 C18.95 12.995 18.86 13.105 18.8 13.195 C18.74 13.285 18.66 13.295 18.62 13.285 C18.58 13.265 18.59 13.055 18.53 13.105 C18.47 13.145 18.35 13.485 18.27 13.545 C18.18 13.605 18.07 13.535 18 13.455 C17.93 13.385 17.82 13.195 17.82 13.105 C17.82 13.015 17.97 13.075 18 12.925 C18.03 12.775 18.04 12.405 18 12.215 C17.95 12.025 17.85 11.695 17.73 11.775 C17.61 11.845 17.41 12.465 17.29 12.665 C17.17 12.855 17.05 12.605 17.02 12.925 C16.99 13.255 17.13 14.215 17.11 14.615 C17.1 15.005 17.01 15.145 16.94 15.325 C16.86 15.495 16.73 15.525 16.67 15.675 C16.61 15.825 16.68 15.945 16.58 16.205 C16.48 16.475 16.18 16.825 16.05 17.275 C15.92 17.715 15.83 18.435 15.78 18.865 C15.74 19.295 15.74 19.635 15.78 19.845 C15.83 20.045 15.61 20.035 16.05 20.105 C16.49 20.185 17.97 20.225 18.44 20.285 C18.92 20.345 18.74 20.435 18.89 20.465 C19.03 20.495 19.21 20.435 19.33 20.465 C19.45 20.495 19.51 20.615 19.6 20.645 C19.68 20.665 19.79 20.595 19.86 20.645 C19.94 20.685 20.05 20.845 20.04 20.905 C20.02 20.965 19.86 20.995 19.77 20.995 C19.68 20.995 19.58 20.905 19.51 20.905 C19.43 20.905 20.17 20.995 19.33 20.995 C18.49 20.995 15.28 21.035 14.45 20.905 C13.62 20.775 14.29 20.645 14.36 20.195 C14.44 19.755 14.81 18.825 14.9 18.245 C14.98 17.665 14.94 17.075 14.9 16.735 C14.85 16.395 14.73 16.295 14.63 16.205 C14.53 16.115 14.38 16.235 14.28 16.205 C14.17 16.175 14.1 16.045 14.01 16.025 C13.92 16.015 13.88 15.985 13.74 16.115 C13.61 16.255 13.39 16.505 13.21 16.825 C13.03 17.155 12.89 17.665 12.68 18.065 C12.47 18.465 12.24 18.885 11.97 19.225 C11.7 19.565 11.3 19.915 11.08 20.105 C10.86 20.305 10.83 20.285 10.64 20.375 C10.45 20.465 10.23 20.565 9.93 20.645 C9.63 20.715 9.83 20.785 8.87 20.815 C7.91 20.845 4.92 20.865 4.17 20.815 C3.41 20.775 4.17 20.645 4.34 20.555 C4.52 20.465 4.85 20.375 5.23 20.285 C5.61 20.195 6.15 20.075 6.65 20.015 C7.15 19.965 7.8 19.995 8.25 19.935 C8.69 19.875 9 19.795 9.31 19.665 C9.62 19.535 9.89 19.325 10.11 19.135 C10.33 18.945 10.43 18.855 10.64 18.515 C10.85 18.175 11.17 17.615 11.35 17.095 C11.53 16.575 11.64 15.925 11.7 15.405 C11.76 14.895 11.63 14.475 11.7 13.995 C11.78 13.505 11.97 12.955 12.15 12.485 C12.32 12.005 12.43 11.625 12.77 11.155 C13.11 10.675 13.71 10.045 14.19 9.645 C14.66 9.245 15.16 9.145 15.61 8.755 C16.05 8.375 16.61 7.635 16.85 7.335 C17.08 7.045 16.96 7.255 17.02 6.985 C17.08 6.715 17.1 6.095 17.2 5.745 C17.3 5.385 17.66 5.155 17.64 4.855 C17.63 4.565 17.22 4.225 17.11 3.975 C17.01 3.715 17.01 3.515 17.02 3.345 C17.04 3.185 17.05 2.965 17.2 2.995 Z" />
    </svg>
  )
}

// Inventory — Vorratskiste, frontal. Heisst im UI „Stock" (strings.js), die Komponente
// folgt aber der Tab-ID `inventory`, wie die anderen Icons auch.
//
// Bewusst FLACH gezeichnet. Der Vorgänger war ein isometrischer Würfel und damit das
// einzige Icon im Set mit Perspektive — neben Kalender, Buch und Tüte fiel das auf,
// ohne dass man es benennen konnte. Perspektive ist hier kein Stilmittel, sondern ein Bruch.
//
// Achtung beim Nachjustieren: Der Korpus mischt relative (h, v) und ABSOLUTE Kommandos
// (H, V, Arc-Endpunkte). Wer das Icon verschiebt, muss die absoluten Werte einzeln
// mitziehen — genau daran ist die Korrektur am RecipesIcon zunächst gescheitert.
export function InventoryIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.6 5.6h14.8a1.6 1.6 0 0 1 1.6 1.6v9.6a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 16.8V7.2a1.6 1.6 0 0 1 1.6-1.6Z" />
      <path d="M3 9.8h18" />
      <path d="M10.2 9.8v2.6h3.6V9.8" />
    </svg>
  )
}

// Shopping — Einkaufstüte mit Henkel.
// Gegenüber Wagen und Korb die grösste geschlossene Fläche und keine freistehenden
// Teile (ein Wagen hat zwei Räder, die bei kleinen Grössen als lose Punkte zerfallen).
// Der Henkelbogen wölbt sich bis y 3.25 hoch — das ist die Oberkante des Icons, nicht
// der Ansatzpunkt bei y 6.25. Wer hier nachjustiert, muss den Bogen mitrechnen.
export function ShoppingIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5.6 7.25h12.8l-1 11.9a1.8 1.8 0 0 1-1.8 1.6H8.4a1.8 1.8 0 0 1-1.8-1.6Z" />
      <path d="M9 10.25V6.25a3 3 0 0 1 6 0v4" />
    </svg>
  )
}

// Recipes — aufgeschlagenes Buch mit Kochmütze darüber.
// Das Buch allein läse sich als „Nachschlagewerk", die Mütze macht daraus „Kochen".
// Mütze bewusst ÜBER dem Buch statt auf dem Cover: so überlappen die beiden Formen
// nicht und bleiben auch bei kleinen Grössen als zwei Dinge unterscheidbar.
export function RecipesIcon(props) {
  return (
    <svg {...base} {...props}>
      {/* Kochmütze */}
      <path d="M9.3 9.48V7.18a2 2 0 1 1 .9-3.8 2.3 2.3 0 0 1 4 0 2 2 0 1 1 .9 3.8v2.3Z" />
      <path d="M9.3 7.18h5.8" />
      {/* Aufgeschlagenes Buch */}
      <path d="M12 13.48C10 12.18 7.8 11.88 5.2 12.38v7.3c2.6-.5 4.8-.2 6.8 1.1" />
      <path d="M12 13.48c2-1.3 4.2-1.6 6.8-1.1v7.3c-2.6-.5-4.8-.2-6.8 1.1" />
      <path d="M12 13.48v8.3" />
    </svg>
  )
}
