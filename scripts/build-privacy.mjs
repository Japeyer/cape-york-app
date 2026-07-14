// Build-time Konvertierung PRIVACY.md → public/privacy.html.
//
// Hintergrund: Google Play Store verlangt eine Privacy-URL ohne Login-Wall im
// Listing. Der direkte GitHub-Repo-Link auf PRIVACY.md ist für interne Tests OK,
// aber für die Production-Listing brauchen wir eine standalone HTML-Variante
// auf einer stabilen URL (https://Japeyer.github.io/cape-york-app/privacy.html).
//
// Hookt sich an "prebuild" in package.json damit `npm run build` die HTML
// automatisch regeneriert. PRIVACY.md bleibt Source of Truth — public/privacy.html
// ist gitignored und wird im CI bei jedem Deploy frisch generiert.
//
// CSS ist inline + minimal damit das File ohne externe Dependencies funktioniert
// (das ist ja der Punkt: Privacy-URL muss aus jedem Browser stand-alone aufrufbar sein).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC_FILE = join(ROOT, 'PRIVACY.md')
const OUT_DIR = join(ROOT, 'public')
const OUT_FILE = join(OUT_DIR, 'privacy.html')

// Minimal-Styling — Mobile-first, neutrale Typo, Cape-York-Orange als Akzent damit
// es konsistent zur App wirkt aber nicht zu marketing-y für eine Privacy-Page.
const CSS = `
  :root {
    --or: #C0600C;
    --bg: #F2EDE7;
    --tx: #333;
    --tx2: #666;
    --bdr: #DDD;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--tx);
    line-height: 1.6;
    font-size: 16px;
  }
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 20px 80px;
    background: #fff;
    min-height: 100vh;
    border-left: 1px solid var(--bdr);
    border-right: 1px solid var(--bdr);
  }
  h1 {
    color: var(--or);
    font-size: 28px;
    margin: 0 0 8px;
    border-bottom: 2px solid var(--or);
    padding-bottom: 12px;
  }
  h2 {
    color: var(--tx);
    font-size: 20px;
    margin: 28px 0 12px;
  }
  h3 { font-size: 16px; margin: 20px 0 8px; }
  p { margin: 0 0 12px; }
  ul, ol { padding-left: 24px; margin: 0 0 12px; }
  li { margin-bottom: 4px; }
  a { color: var(--or); }
  a:hover { text-decoration: underline; }
  code {
    background: #F5EFEA;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 13px;
    color: var(--tx);
  }
  hr {
    border: none;
    border-top: 1px solid var(--bdr);
    margin: 24px 0;
  }
  strong { color: var(--tx); }
  @media (max-width: 480px) {
    main { padding: 16px 14px 60px; border-left: none; border-right: none; }
    h1 { font-size: 22px; }
    h2 { font-size: 18px; }
  }
`

function buildHtml(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#C0600C" />
  <meta name="robots" content="index,follow" />
  <title>Privacy Policy — Cape York 2026</title>
  <style>${CSS}</style>
</head>
<body>
  <main>
${bodyHtml}
  </main>
</body>
</html>
`
}

function main() {
  if (!existsSync(SRC_FILE)) {
    console.error(`FATAL: ${SRC_FILE} fehlt — erst PRIVACY.md anlegen.`)
    process.exit(1)
  }
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const md = readFileSync(SRC_FILE, 'utf8')
  // HTML-Kommentare (Wartungs-/Platzhalter-Notizen, Hosting-URL) NICHT ins öffentliche
  // HTML durchreichen — marked würde sie sonst 1:1 in den Page-Source schreiben.
  const mdClean = md.replace(/<!--[\s\S]*?-->/g, '')
  const bodyHtml = marked.parse(mdClean, { gfm: true, breaks: false })
  const html = buildHtml(bodyHtml)
  writeFileSync(OUT_FILE, html, 'utf8')

  const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)
  console.log(`✓ ${SRC_FILE} → ${OUT_FILE} (${sizeKb} kB)`)
}

main()
