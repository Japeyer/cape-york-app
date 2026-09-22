// Fortschrittsanzeige des Trip-Konfigurators: ein 4WD, der die Strecke entlangfährt.
//
// Ersetzt die frühere Punktreihe (`cfg-steps-dots`). Der Gedanke dahinter: Drei Punkte
// sagen WIE VIELE Schritte es sind, ein Fahrzeug auf einer Strecke sagt WIE WEIT man ist —
// und die Metapher ist hier nicht aufgesetzt, sondern das Produkt selbst. Die App plant
// eine Fahrt nach Norden; das Icon fährt sie mit.
//
// Die Antipp-Funktion der alten Punkte bleibt erhalten: Die Wegpunkte sind weiterhin
// Buttons, mit denen man zurückspringt (und vorwärts, sobald ein Zeitraum gewählt ist).
// Ohne das wäre die Umstellung ein Rückschritt gewesen.
//
// FORTSCHRITT IST SCHRITTBASIERT, nicht feldbasiert. Feiner aufzulösen — etwa nach
// ausgefüllten Feldern — wäre verlockend, aber der Balken liefe dann auch mal rückwärts,
// wenn jemand eine Auswahl ändert. Das fühlt sich kaputt an. Zwei Sprünge bei drei
// Schritten sind ehrlicher.
//
// FAHRZEUG IST EIN BILD, keine Vektorzeichnung — ausdrücklicher Wunsch des Entwicklers.
// `public/wizard-car.png` entstand aus `generated-images/icon-concept-B.png` über die
// OpenAI-Images-API im Edit-Modus: Farben invertiert (weiss wird orange, orange wird
// transparent), danach auf den Bildinhalt zugeschnitten und auf 104×82 skaliert.
// Ergebnis: freigestelltes oranges Fahrzeug, in der App ist nur dieses sichtbar.
//
// DIE LEISTE IST AM UNTEREN RAND FIXIERT (`position: fixed`), damit sie beim Scrollen
// durch die Schritt-Formulare sichtbar bleibt. `.cfg-wrap` hat entsprechend
// Innenabstand unten, sonst verschwände der letzte Inhalt darunter.

import { S } from '../strings.js'

// Über BASE_URL, nicht als absoluter Pfad: Die App läuft unter /cape-york-app/,
// ein "/wizard-car.png" würde auf GitHub Pages ins Leere zeigen.
const CAR_SRC = `${import.meta.env.BASE_URL}wizard-car.png`

export default function TripProgress({ step, total, onJump, canJump, stepTitle }) {
  // Bei 3 Schritten: 0 % / 50 % / 100 %. Einziger Schritt -> ganz links, keine Division durch 0.
  const pct = total > 1 ? (step / (total - 1)) * 100 : 0

  return (
    <div className="cfg-progress">
      <div className="cfg-road">
        {/* Zurückgelegter Teil der Strecke */}
        <div className="cfg-road-done" style={{ width: `${pct}%` }} />

        {/* Wegpunkte — dieselbe Sprungfunktion wie zuvor die Punkte */}
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`cfg-waypoint${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}
            style={{ left: `${total > 1 ? (i / (total - 1)) * 100 : 0}%` }}
            onClick={() => onJump(i)}
            disabled={i > step && !canJump}
            aria-label={S.config.steps[i]?.title}
            aria-current={i === step ? 'step' : undefined}
          />
        ))}

        {/* Das Fahrzeug. Rein dekorativ — die Schrittinformation steht im Label darunter
            und in den Wegpunkt-Buttons, damit Screenreader nichts doppelt vorlesen. */}
        <div className="cfg-car" style={{ left: `${pct}%` }} aria-hidden="true">
          <img src={CAR_SRC} alt="" width="104" height="82" draggable="false" />
        </div>
      </div>

      <div className="cfg-steps-label">
        {S.config.wizard.stepOf({ cur: step + 1, total })} · {stepTitle}
      </div>
    </div>
  )
}
