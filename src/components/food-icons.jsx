// Ebene 2 des Icon-Systems: Lebensmittel-Icons für Rezepte, Mahlzeiten, Swap.
//
// ── DIE REGEL DES SYSTEMS ────────────────────────────────────────────────────
//   Kontur bedient, Fläche informiert.
//
//   Ebene 1 (components/icons.jsx): Navigation und Chrome. KONTUR, 1.75 Strich,
//     einfarbig orange. Wenige Icons, gross, mit Textlabel.
//   Ebene 2 (diese Datei): Inhalt. GEFÜLLTE Silhouette, Farbe nach Lebensmittel-
//     familie. Viele Icons, klein, dicht.
//
// Das ist kein Stilbruch, sondern die Regel: Zwei Ebenen mit klarer Zuordnung sind
// konsequenter als eine Ebene mit 45 Ausnahmen.
//
// ── WARUM GEFÜLLT ────────────────────────────────────────────────────────────
// Bei kleinen Grössen löst das Auge Farbmasse vor Silhouette vor Detail auf. Eine
// Kontur wirft Kanal 1 und 3 weg. In der Navigation ist das richtig (vier Icons,
// gross, beschriftet); bei 97 Gerichten ohne Label ist es Selbstverkrüppelung.
// Konkret: Der Kalendermarker rendert mit 9 px — eine 1.75er Kontur wäre dort
// 0.66 px stark und damit physikalisch nicht darstellbar. Eine Fläche überlebt.
//
// ── GEMEINSAMES RASTER MIT EBENE 1 ───────────────────────────────────────────
// 24 × 24 viewBox, Motiv in 2..22, auf 12/12 zentriert, runde Formensprache.
// Nur Füllung statt Kontur und Farbe statt currentColor. Geprüft mit dem
// Bounds-Checker im Scratchpad (siehe CHANGELOG 2026-09-20).

import { FOOD_FAMILIES, familyOf, familyColor } from '../data/food-families.js'

// ── UMSCHALTER ───────────────────────────────────────────────────────────────
// false → die App rendert wieder die bisherigen Emoji, exakt wie vor der Umstellung.
// Die Daten in recipes.js sind unverändert geblieben, es gibt also nichts
// zurückzumigrieren. Ein Boolean, ein Reload, alter Zustand.
export const FOOD_ICONS_ENABLED = true

const svgProps = {
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
}

// Die neun Silhouetten. Jede ist EIN geschlossener Pfad (plus ggf. ein Loch via
// fill-rule evenodd) — je weniger Einzelteile, desto stabiler beim Verkleinern.
const SHAPES = {
  // Keule: Fleischballen + Knochenschaft + Gelenkknauf, drei überlappende Teilpfade.
  // KEIN fill-rule evenodd hier — die Teile überlappen sich und sollen verschmelzen,
  // evenodd würde an den Überschneidungen Löcher stanzen.
  // Erster Entwurf war eine Kapsel mit Loch (Steak mit Knochen); im Rendering las sich
  // das als Tablette. Die Keule ist die eindeutigere Silhouette.
  meat: (
    <path d="M15.3 3.4a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6ZM13.12 12.72 7.12 18.72a1.3 1.3 0 0 1-1.84-1.84l6-6a1.3 1.3 0 0 1 1.84 1.84ZM6.2 15.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z" />
  ),
  // Fisch: Körper + Schwanzflosse, Auge als Loch
  fish: (
    <path fillRule="evenodd" d="M8.6 12c0-3.2 2.8-5.9 6-5.9s5.8 2.7 5.8 5.9-2.6 5.9-5.8 5.9S8.6 15.2 8.6 12Zm8.4-1.6a1 1 0 1 0 2 0 1 1 0 1 0-2 0ZM9 9.9 3.2 6.8v10.4L9 14.1Z" />
  ),
  // Ei
  egg: (
    <path d="M12 4.7c3.2 0 5.9 4.5 5.9 8.5a5.9 5.9 0 0 1-11.8 0c0-4 2.7-8.5 5.9-8.5Z" />
  ),
  // Blatt — steht für Gemüse, Salat und Wurzelgemüse
  veg: (
    <path d="M12 3.2c4.4 3.8 6.6 7.6 6.6 11.1A6.6 6.6 0 0 1 5.4 14.3c0-3.5 2.2-7.3 6.6-11.1Z" />
  ),
  // Brotscheibe — steht für Pasta, Reis, Wraps, Sandwiches
  grain: (
    <path d="M12 4.2c-3.8 0-6.9 2.3-6.9 5.2 0 1.4.8 2.2 1.6 2.6v6.3a1.5 1.5 0 0 0 1.5 1.5h7.6a1.5 1.5 0 0 0 1.5-1.5V12c.8-.4 1.6-1.2 1.6-2.6 0-2.9-3.1-5.2-6.9-5.2Z" />
  ),
  // Schüssel mit drei Dampffahnen
  soup: (
    <path d="M9.5 3.6a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1Zm2.5 0a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1Zm2.5 0a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1ZM3.4 11.4h17.2a8.6 8.6 0 0 1-17.2 0Z" />
  ),
  // Chili — gebogener, sich verjüngender Körper plus Stiel
  spice: (
    <path d="M17.4 9.5c0 5.4-3.5 9.8-7.8 9.8-2.4 0-4.3-1.6-4.3-3.6 0-1.7 1.3-3 3-3 2.7 0 4.9-2.2 4.9-4.9 0-1.5 1.2-2.7 2.6-2.7 1 0 1.6.7 1.6 1.7Zm-2.6-3.2c.9-1 2.2-1.5 3.6-1.3.3 1.4-.2 2.7-1.2 3.6Z" />
  ),
  // Apfel mit Blatt
  fruit: (
    <path d="M12 7.6c1.4-1.1 3.4-1.3 5-.4 2.4 1.3 3.3 4.6 2 7.9-1.2 3.1-3.7 5.6-5.6 5.6-.5 0-1-.2-1.4-.4-.4.2-.9.4-1.4.4-1.9 0-4.4-2.5-5.6-5.6-1.3-3.3-.4-6.6 2-7.9 1.6-.9 3.6-.7 5 .4Zm.6-1c0-1.6 1.2-3 2.8-3.2.2 1.7-1 3.1-2.8 3.2Z" />
  ),
  // Teller (Ring) — neutrale Restkategorie
  other: (
    <path fillRule="evenodd" d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 1 0 0-17Zm0 4a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9Z" />
  ),
}

export const FAMILY_IDS = Object.keys(SHAPES)

// Icon für eine Familie. Farbe kommt aus food-families.js, nicht aus CSS —
// die Familienfarbe IST die Information, sie darf nicht überschreibbar sein.
export function FamilyIcon({ family, size = 24, ...rest }) {
  const shape = SHAPES[family] ?? SHAPES.other
  return (
    <svg {...svgProps} width={size} height={size} fill={familyColor(family)} {...rest}>
      {shape}
    </svg>
  )
}

// Der Aufrufer übergibt weiterhin das Emoji aus recipes.js — diese Komponente
// entscheidet, was daraus wird. Dadurch bleiben die Aufrufstellen unverändert,
// egal ob das Feature an oder aus ist.
//
// Unbekanntes Emoji (z.B. aus einem nutzereigenen Rezept) → das Emoji selbst.
// Das ist der Preis dafür, dass der Editor ein Freitextfeld bleibt.
export function FoodIcon({ icon, size = 24, className }) {
  const family = FOOD_ICONS_ENABLED ? familyOf(icon) : null
  if (!family) return <span className={className}>{icon}</span>
  return <FamilyIcon family={family} size={size} className={className} />
}

export { FOOD_FAMILIES }
