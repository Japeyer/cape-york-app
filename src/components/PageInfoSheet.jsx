import { Sheet } from './DaySheet.jsx'
import { TOURS } from '../lib/tours.js'
import { S } from '../strings.js'

// Seiten-Info hinter dem ⓘ oben rechts.
//
// Ersetzt die Einführungssätze, die früher oben auf jeder Seite standen und dasselbe
// sagten wie das Spotlight-Tutorial. Statt den Text ein zweites Mal zu pflegen, liest
// dieses Sheet die Tutorial-Inhalte: Reihenfolge und Schlüssel aus `TOURS[page]`,
// Texte aus `S.tours[page]`. Ändert sich das Tutorial, ändert sich das ⓘ mit.
//
// `cta` der Schritte bleibt bewusst weg ("Tap the highlighted day") — das ist eine
// Anweisung an den Spotlight-Nutzer und ergibt im Nachschlage-Sheet keinen Sinn.
//
// `note` ist der optionale Vorspann für die Einkaufslisten: die Stop-Notiz
// ("Last big supermarket…") ist Reisewissen und steht in keinem Tutorial — sie ist
// von der Seite hierher gewandert, statt gelöscht zu werden.
export default function PageInfoSheet({ page, note, onClose }) {
  const texts = S.tours[page] || {}
  const steps = (TOURS[page] || [])
    .map(s => texts[s.key])
    .filter(Boolean)

  return (
    <div className="info-sheet">
      <Sheet title={S.info.title} onClose={onClose}>
        {note && <div className="info-note">{note}</div>}
        {steps.map((t, i) => (
          <div className="info-item" key={i}>
            <div className="info-item-title">{t.title}</div>
            <div className="info-item-body">{t.body}</div>
          </div>
        ))}
        {!note && steps.length === 0 && (
          <div className="info-empty">{S.info.empty}</div>
        )}
      </Sheet>
    </div>
  )
}
