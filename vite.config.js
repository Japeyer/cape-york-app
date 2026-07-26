import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub-Pages Project-Page deployt unter https://<user>.github.io/<repo>/
// Deshalb muss base = '/<repo>/' sein (nicht '/'), sonst zeigen Asset-/Icon-/Service-Worker-Pfade
// auf den Root und 404en. Icons im PWA-Manifest brauchen denselben Prefix.
const REPO_BASE = '/cape-york-app/'

// Content-Security-Policy — NUR im Production-Build injiziert (nicht in dev, sonst bricht Vite-HMR
// mit eval/WebSocket). Die App ist vollständig self-contained: keine externen Scripts/Fonts/CDNs,
// 0 Netzwerk-Calls. Deshalb ist eine strikte 'self'-Policy möglich. `connect-src 'self'` ist der
// Kern-Schutz gegen Daten-Exfiltration: selbst wenn je ein XSS eingeschleppt würde, kann kein Skript
// Daten an einen fremden Server senden. `style-src 'unsafe-inline'` ist für Reacts inline-style-Attribute
// nötig. GitHub Pages sendet keine Header → CSP muss als <meta> in die HTML (frame-ancestors greift
// dort nicht; Clickjacking-Schutz käme später über einen echten Header/Capacitor).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ')

const cspPlugin = {
  name: 'inject-csp-meta',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '</title>',
      `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`
    )
  },
}

export default defineConfig({
  base: REPO_BASE,
  // Vitest-Config: die Sicherheits-Sweeps (generator.safety.test.js: ~864 volle generate()-Läufe)
  // und der App-Fuzzer sind bewusst rechenintensiv. Lokal ~4–5 s, auf den langsameren GitHub-
  // Actions-Runnern reißen sie das Vitest-Default-Timeout von 5000 ms (Deploy schlug daran fehl).
  // 30 s gibt großzügig Luft für CI-Schwankungen, fängt aber echte Endlos-Hänger weiterhin ab.
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  plugins: [
    react(),
    cspPlugin,
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Cape York 2026',
        short_name: 'Cape York',
        description: 'Cape York 4WD camping planner — menu, recipes & shopping list',
        theme_color: '#C0600C',
        background_color: '#F2EDE7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: REPO_BASE,
        scope: REPO_BASE,
        icons: [
          { src: `${REPO_BASE}icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${REPO_BASE}icon-512.png`, sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Neuer SW übernimmt sofort, statt zu warten bis alle alten Tabs geschlossen sind.
        // Wichtig für unsere Iteration: User soll Updates beim nächsten Page-Load sehen,
        // nicht erst nach dem zweiten. Sicher hier weil keine inkompatiblen Schema-Wechsel
        // zwischen Versionen — Storage-Migrations sind alle additive in useStorage.js.
        skipWaiting: true,
        clientsClaim: true,
      }
    })
  ]
})
