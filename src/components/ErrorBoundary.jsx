import { Component } from 'react'
import { S } from '../strings.js'

// Globales Absturz-Netz. Fängt Render-/Lifecycle-Fehler in JEDER Kind-Komponente ab und
// zeigt statt eines weißen Bildschirms einen Recovery-Screen mit "Try again" + "Reset".
//
// Warum das existiert: Kein Test findet je ALLE Bugs. Diese Boundary verwandelt jeden noch
// unentdeckten Render-Crash von "App tot → 1-Stern-Bewertung" in "Nutzer klickt weiter".
// Das ist die wichtigste Einzel-Maßnahme gegen schlechte Erst-Bewertungen durch versteckte Bugs.
//
// Bewusst mit INLINE-Styles: ein Sicherheitsnetz darf nicht davon abhängen, dass eine externe
// CSS-Datei geladen/intakt ist. User-facing Text kommt trotzdem aus strings.js (i18n-ready).
// Kein Netzwerk/Auto-Upload (Privacy-Prinzip) — die Details kann der Nutzer freiwillig kopieren.
//
// Grenze (ehrlich): Error Boundaries fangen KEINE Fehler in Event-Handlern, async-Code,
// SSR oder im Boundary selbst. Für Event-Handler bleibt lokales try/catch nötig.

const C = { or: '#C0600C', bg: '#F2EDE7', ink: '#2b2b2b', card: '#fffdfa', line: '#e5ddd2' }

const styles = {
  wrap: {
    minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', background: C.bg, color: C.ink, boxSizing: 'border-box',
    fontFamily: "'Carlito', Calibri, 'Segoe UI', system-ui, sans-serif",
  },
  card: {
    maxWidth: '420px', width: '100%', background: C.card, border: `1px solid ${C.line}`,
    borderRadius: '18px', padding: '28px 24px', boxShadow: '0 6px 24px rgba(0,0,0,0.08)', textAlign: 'center',
  },
  emoji: { fontSize: '40px', lineHeight: 1, marginBottom: '12px' },
  title: { fontSize: '20px', fontWeight: 700, margin: '0 0 8px' },
  body: { fontSize: '15px', lineHeight: 1.5, margin: '0 0 20px', color: '#5a534b' },
  btnPrimary: {
    display: 'block', width: '100%', minHeight: '48px', border: 'none', borderRadius: '12px',
    background: C.or, color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px',
  },
  btnGhost: {
    display: 'block', width: '100%', minHeight: '48px', borderRadius: '12px',
    background: 'transparent', color: C.or, border: `1px solid ${C.or}`, fontSize: '15px', fontWeight: 600, cursor: 'pointer',
  },
  details: { marginTop: '18px', textAlign: 'left', fontSize: '12px', color: '#8a8178' },
  pre: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0 0', fontSize: '11px', maxHeight: '160px', overflow: 'auto' },
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleRetry = this.handleRetry.bind(this)
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Nur lokal loggen — kein Upload (Privacy). Hilft beim Reproduzieren, wenn der Nutzer
    // die Konsole/Details freiwillig teilt.
    try { console.error('[ErrorBoundary]', error, info?.componentStack) } catch {}
  }

  handleRetry() {
    // Erst den Boundary-State zurücksetzen (transiente Fehler heilen so ohne Reload),
    // dann als Fallback neu laden, falls verfügbar.
    this.setState({ hasError: false, error: null })
    try { window.location.reload() } catch {}
  }

  handleReset() {
    try {
      if (typeof window !== 'undefined' && window.confirm && !window.confirm(S.error.resetConfirm)) return
    } catch {}
    try { localStorage.clear() } catch {}
    try { window.location.reload() } catch {}
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const msg = (() => {
      const e = this.state.error
      if (!e) return 'Unknown error'
      return `${e.name || 'Error'}: ${e.message || String(e)}`
    })()

    return (
      <div style={styles.wrap} role="alert" data-testid="error-boundary">
        <div style={styles.card}>
          <div style={styles.emoji}>🛠️</div>
          <h1 style={styles.title}>{S.error.title}</h1>
          <p style={styles.body}>{S.error.body}</p>
          <button type="button" style={styles.btnPrimary} onClick={this.handleRetry}>{S.error.retry}</button>
          <button type="button" style={styles.btnGhost} onClick={this.handleReset}>{S.error.reset}</button>
          <details style={styles.details}>
            <summary>{S.error.detailsSummary}</summary>
            <pre style={styles.pre}>{msg}</pre>
          </details>
        </div>
      </div>
    )
  }
}
