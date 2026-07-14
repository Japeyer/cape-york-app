import { S } from '../strings.js'

// About-View — App-Info, Datenschutz-Hinweis, Disclaimer.
// Erreichbar über das ⓘ-Icon im Topbar auf der Home-Seite.
//
// Privacy-Policy-Link zeigt auf die HTML-Variante auf GitHub Pages
// (https://japeyer.github.io/cape-york-app/privacy.html — auto-generiert via
// scripts/build-privacy.mjs aus PRIVACY.md, gehostet als statisches File).
// Diese URL ist Play-Store-tauglich: standalone, kein Login, stabil über Releases.
//
// Hinweis: Die „Data sources"-Sektion (OpenStreetMap/ODbL-Attribution für die Tankstellen-
// und Kartendaten) wurde mit der Deaktivierung der Map entfernt — die App zeigt aktuell keine
// OSM-Daten mehr, also ist keine Attribution nötig. Kommt mit der Map in V2 zurück.
export default function AboutTab() {
  return (
    <div className="about-wrap">
      <div className="about-card">
        <div className="about-app">
          <div className="about-icon">🦘</div>
          <div className="about-app-text">
            <div className="about-app-name">{S.about.appName}</div>
            <div className="about-app-tagline">{S.about.tagline}</div>
          </div>
        </div>

        <div className="about-section">
          <div className="about-section-label">{S.about.privacyHeading}</div>
          <p className="about-text">{S.about.privacyBody}</p>
          <a className="about-link" href={S.about.privacyUrl} target="_blank" rel="noopener noreferrer">
            {S.about.privacyCta} →
          </a>
        </div>

        <div className="about-section about-disclaimer">
          <div className="about-section-label">{S.about.disclaimerHeading}</div>
          <p className="about-text">{S.about.disclaimerBody}</p>
        </div>
      </div>
    </div>
  )
}
