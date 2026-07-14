// Kleines Vegan-Indikator-Symbol: grünes V mit Blatt am rechten Strich.
// Orientiert an Standard-Vegan-Labeling (Vegan Society V-Label, EU-V-Label).
// Bewusst klein und unauffällig — der User soll es als Info-Hinweis sehen,
// nicht als Verkaufsargument das Nicht-Veganer abschreckt.
//
// Verwendung:
//   {recipe.diet === 'vegan' && <VeganBadge />}
//
// Props:
//   size  — Pixel-Größe (Quadratisch). Default 14, gut für Inline-Text.
export default function VeganBadge({ size = 14 }) {
  return (
    <svg
      className="vegan-badge"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role="img"
      aria-label="Vegan"
    >
      {/* Großes V — fett, sattes Grün */}
      <path
        d="M3 3 L8 13 L13 3"
        stroke="#3F8C2C"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Blatt-Stamm — verbindet V-Spitze rechts oben mit dem Blatt */}
      <path
        d="M12.5 3.5 L14 1.8"
        stroke="#3F8C2C"
        strokeWidth="0.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Blatt — leicht oval, schräg gedreht, hellgrün */}
      <path
        d="M14 1.8 Q15.6 0.5 15.5 2.2 Q15.2 3.4 13.7 3.5 Q13.3 2.5 14 1.8 Z"
        fill="#6BB144"
        stroke="#3F8C2C"
        strokeWidth="0.4"
      />
      {/* Mittelvene des Blatts */}
      <path
        d="M14 1.9 L14.9 2.6"
        stroke="#3F8C2C"
        strokeWidth="0.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
