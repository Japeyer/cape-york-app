// Ebene 2 des Icon-Systems: Lebensmittel-Icons für Rezepte, Mahlzeiten, Swap.
//
// ── DIE REGEL DES SYSTEMS ────────────────────────────────────────────────────
//   Kontur bedient, Fläche informiert.
//
//   Ebene 1 (components/icons.jsx): Navigation und Chrome. KONTUR, einfarbig,
//     `currentColor`. Wenige Icons, gross, mit Textlabel.
//   Ebene 2 (diese Datei): Inhalt. MEHRFARBIGE Illustrationen. Viele Icons,
//     klein, dicht.
//
// ── WARUM BILDER STATT VEKTOREN ──────────────────────────────────────────────
// Eine frühere Fassung zeichnete neun gefüllte Silhouetten als SVG. Der Entwickler
// hat sich bewusst für den mehrfarbigen, handgezeichneten Stil entschieden — und den
// kann eine einfarbige Kontur nicht wiedergeben. Die Bilder entstanden über die
// OpenAI-Images-API, wurden aus einem 4×4-Raster freigestellt und auf 96 px skaliert.
//
// ── GRÖSSE ───────────────────────────────────────────────────────────────────
// 96 px Dateigrösse bei maximal 28 px Anzeige deckt 3× ab — die Zielgeräte
// (Samsung Galaxy S) haben devicePixelRatio 3. 19 Icons wiegen zusammen rund 194 KB
// im Offline-Bundle. Wer die Anzeige vergrössert, muss die Dateien neu schneiden;
// die Quellraster liegen in `generated-images/recipeset-*.png`.
//
// Die Icons haben UNTERSCHIEDLICHE Seitenverhältnisse (der Fisch ist breit, die
// Karotte hoch). Deshalb quadratischer Rahmen plus `object-fit: contain` im CSS,
// statt fester Breite und Höhe — sonst würden sie verzerrt.

import { FOOD_FAMILIES, familyOf, familyColor } from '../data/food-families.js'

// ── UMSCHALTER ───────────────────────────────────────────────────────────────
// false → die App rendert wieder die bisherigen Emoji, exakt wie vor der Umstellung.
// Die Daten in recipes.js sind unverändert geblieben, es gibt also nichts
// zurückzumigrieren. Ein Boolean, ein Reload, alter Zustand.
export const FOOD_ICONS_ENABLED = true

// Über BASE_URL, nicht als absoluter Pfad: Die App läuft unter /cape-york-app/,
// ein "/food/x.png" würde auf GitHub Pages ins Leere zeigen.
const srcFor = family => `${import.meta.env.BASE_URL}food/${family}.png`

export const FAMILY_IDS = Object.keys(FOOD_FAMILIES)

// Icon für eine Familie.
export function FamilyIcon({ family, size = 24, className }) {
  const fam = FOOD_FAMILIES[family] ? family : 'dining'
  return (
    <img
      className={className}
      src={srcFor(fam)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable="false"
      loading="lazy"
    />
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

export { FOOD_FAMILIES, familyColor }
