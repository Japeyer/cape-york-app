// Personen-Icons für den Trip-Konfigurator (Mann / Frau / Kind).
//
// Gehört zu Ebene 2 des Icon-Systems wie die Lebensmittel-Icons: mehrfarbige Bilder,
// nicht Konturen. Eigene Datei statt in `food-icons.jsx`, weil es eine andere Domäne
// ist — eine Datei je Icon-Bereich hält die Zuordnung eindeutig.
//
// ── ZWEI ENTWURFSENTSCHEIDUNGEN FÜRS „GENERISCH" ─────────────────────────────
// Der Entwickler wollte ausdrücklich Köpfe, die keiner Ethnie zugeordnet sind.
// Zwei Mittel dafür, beide im Prompt erzwungen:
//
//   1. KEINE GESICHTSZÜGE. Kopf und Schultern sind eine geschlossene Silhouette.
//      Ohne Augen, Nase und Mund gibt es nichts, woran sich eine Herkunft ablesen
//      liesse — es bleibt ein Piktogramm.
//   2. KEINE HAUTTÖNE. Die Figuren sind teal, olivgrün und bernstein eingefärbt,
//      das Haar jeweils in einem dunkleren Ton derselben Farbe. Eine nicht-wörtliche
//      Farbe liest sich als Zeichen, nicht als Abbildung eines Menschen.
//
// Unterschieden wird über Haar-Silhouette und Proportion (das Kind hat einen
// proportional grösseren Kopf) — die übliche Piktogramm-Sprache.
//
// Die Farben kodieren bewusst NICHT Geschlecht: Teal / Olivgrün / Bernstein statt
// der üblichen Blau-Rosa-Zuordnung.
//
// ── HERKUNFT ─────────────────────────────────────────────────────────────────
// `public/people/*.png` — über die OpenAI-Images-API im Stil der Rezept-Icons erzeugt
// (Set C als Vorlage), aus dem Dreier-Raster freigestellt, auf 96 px skaliert.
// Zusammen 19 KB.

import { S } from '../strings.js'

export const FOOD_ICONS_PEOPLE_ENABLED = true

// Über BASE_URL, nicht als absoluter Pfad: Die App läuft unter /cape-york-app/,
// ein "/people/x.png" würde auf GitHub Pages ins Leere zeigen.
const srcFor = type => `${import.meta.env.BASE_URL}people/${type}.png`

// Für welche Typen gibt es ein Bild? Alles andere fällt auf das Emoji aus
// strings.js zurück, statt ein fehlendes Bild anzufordern.
const HAS_IMAGE = new Set(['adult-m', 'adult-f', 'child'])

export function PersonIcon({ type, size = 28, className }) {
  if (!FOOD_ICONS_PEOPLE_ENABLED || !HAS_IMAGE.has(type)) {
    return <span className={className}>{S.config.typeOptions[type]?.icon}</span>
  }
  return (
    <img
      className={className}
      src={srcFor(type)}
      alt=""
      aria-hidden="true"
      height={size}
      draggable="false"
    />
  )
}
