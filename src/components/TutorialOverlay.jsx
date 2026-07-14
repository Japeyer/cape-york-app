import { useState } from 'react'
import { createPortal } from 'react-dom'
import { S } from '../strings.js'

// Einmaliges Onboarding beim ERSTEN "Create trip". Kleiner Slide-Carousel, der die wichtigsten
// Funktionen erklärt (Configurator → Menüplan/Swap → Offline-Rezepte → Einkaufsliste → Stock).
// Wird von App.jsx gerendert (Portal nach document.body), sichtbar über allen Views/Sheets.
// onDone wird von "Skip" UND vom letzten Slide ("Let's plan") aufgerufen — der Aufrufer markiert
// das Tutorial als gesehen und fährt in den Configurator fort.
export default function TutorialOverlay({ onDone }) {
  const slides = S.tutorial.slides
  const [i, setI] = useState(0)
  const last = i === slides.length - 1
  const slide = slides[i]

  const next = () => (last ? onDone() : setI(i + 1))
  const back = () => setI(n => Math.max(0, n - 1))

  return createPortal(
    <div className="tut-overlay" role="dialog" aria-modal="true" aria-label={slide.title}>
      <div className="tut-card">
        <button className="tut-skip" onClick={onDone}>{S.tutorial.skip}</button>

        <div className="tut-icon" aria-hidden="true">{slide.icon}</div>
        <h2 className="tut-title">{slide.title}</h2>
        <p className="tut-body">{slide.body}</p>

        <div className="tut-dots" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={slides.length}>
          {slides.map((_, idx) => (
            <span key={idx} className={`tut-dot${idx === i ? ' active' : ''}`} aria-hidden="true" />
          ))}
        </div>

        <div className="tut-nav">
          {i > 0
            ? <button className="tut-back" onClick={back}>{S.tutorial.back}</button>
            : <span className="tut-back-spacer" />}
          <button className="tut-next" onClick={next}>
            {last ? S.tutorial.done : S.tutorial.next}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
