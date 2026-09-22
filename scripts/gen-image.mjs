// Bild-Generierung über die OpenAI Images API (Modell `gpt-image-1`).
//
// Zweck: Assets für die App erzeugen (Icons, Illustrationen, Platzhalter-Grafiken) ohne
// sie von Hand in einem Grafikprogramm zu bauen. Reines Dev-Werkzeug — es läuft NIE im
// Browser und ist nicht Teil des App-Builds (kein Import aus src/).
//
// WICHTIG — Kosten & Key:
//   Das ChatGPT-Abo enthält KEINEN API-Zugang. Nötig ist ein separates Prepaid-Guthaben
//   auf platform.openai.com. Jeder Aufruf hier kostet echtes Geld (grob 1–20 Cent pro
//   Bild je nach --size/--quality). Das Skript druckt am Ende den Token-Verbrauch aus,
//   den die API zurückmeldet.
//
// WICHTIG — Sicherheit:
//   Das Repo ist public. Der Key gehört in `.env` (steht in .gitignore) und NIRGENDWO
//   sonst hin — nicht in package.json, nicht in eine Komponente, nicht in einen Commit.
//
// Setup (einmalig):
//   1. platform.openai.com → Billing → Guthaben aufladen
//   2. platform.openai.com → API keys → Create new secret key (wird nur 1× angezeigt!)
//   3. Datei `.env` im Projekt-Root anlegen mit genau einer Zeile:
//        OPENAI_API_KEY=sk-...
//
// Verwendung:
//   node scripts/gen-image.mjs "ein Prompt in Englisch"
//   npm run img:gen -- "ein Prompt in Englisch"
//
// Optionen:
//   --out <name>        Dateiname ohne Endung (default: Slug aus dem Prompt + Zeitstempel)
//   --size <wxh>        1024x1024 (default) | 1536x1024 (quer) | 1024x1536 (hoch) | auto
//   --quality <stufe>   low | medium (default) | high | auto  — low ist am billigsten
//   --n <zahl>          Anzahl Varianten (default 1)
//   --transparent       Transparenter Hintergrund (nur png/webp) — gut für Icons
//   --format <typ>      png (default) | webp | jpeg
//   --edit <datei>      Vorlagenbild. Statt frei zu erzeugen, arbeitet das Modell dann
//                       AM BILD weiter (/v1/images/edits). Nötig, wenn eine bestehende
//                       Form erhalten bleiben soll — bei freier Erzeugung erfindet das
//                       Modell sie jedes Mal neu. Mehrfach angebbar für mehrere Vorlagen.
//   --model <name>      default gpt-image-2.5-flare (schnell, zum Iterieren).
//                       gpt-image-2.5-sunburst = langsamer, präziser bei Formen/Logos/Text
//                       -> für die finale Fassung. gpt-image-1-mini = billigste Variante.
//                       Stand 2026-09: 2.5 kostet $30/1M Output-Token, das alte
//                       gpt-image-1 $40 — die neuen Modelle sind besser UND günstiger.
//
// Beispiele:
//   node scripts/gen-image.mjs "flat vector app icon, 4WD silhouette, burnt orange on warm beige, no text" --transparent --out icon-draft
//   node scripts/gen-image.mjs "watercolour of a Cape York savanna road at dusk" --size 1536x1024 --quality high
//
// Ergebnis landet in ./generated-images/ (gitignored).

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'generated-images')
const ENV_FILE = join(ROOT, '.env')

const API_URL = 'https://api.openai.com/v1/images/generations'
const EDIT_URL = 'https://api.openai.com/v1/images/edits'

// Was die API akzeptiert — lokal prüfen spart einen bezahlten Fehlversuch.
const VALID_SIZES = ['1024x1024', '1536x1024', '1024x1536', 'auto']
const VALID_QUALITIES = ['low', 'medium', 'high', 'auto']
const VALID_FORMATS = ['png', 'webp', 'jpeg']

// ---------------------------------------------------------------- Argumente

// Abbruch mit Klartext-Meldung. Wirft statt process.exit() zu rufen: ein harter Exit
// mitten in einer offenen fetch-Verbindung lässt libuv unter Windows mit
// "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" abstürzen. Der Handler
// ganz unten druckt die Meldung und setzt den Exit-Code.
class UserError extends Error {}

function die(msg) {
  throw new UserError(msg)
}

function parseArgs(argv) {
  const opts = {
    prompt: '',
    out: null,
    size: '1024x1024',
    quality: 'medium',
    n: 1,
    transparent: false,
    format: 'png',
    model: 'gpt-image-2.5-flare',
    edit: [],
  }
  const positional = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--transparent': opts.transparent = true; break
      case '--out':     opts.out = argv[++i]; break
      case '--size':    opts.size = argv[++i]; break
      case '--quality': opts.quality = argv[++i]; break
      case '--format':  opts.format = argv[++i]; break
      case '--model':   opts.model = argv[++i]; break
      case '--edit':    opts.edit.push(argv[++i]); break
      case '--n':       opts.n = Number(argv[++i]); break
      default:
        if (arg.startsWith('--')) die(`Unbekannte Option: ${arg}`)
        positional.push(arg)
    }
  }

  opts.prompt = positional.join(' ').trim()

  if (!opts.prompt) {
    die('Kein Prompt angegeben.\n\n  node scripts/gen-image.mjs "dein prompt hier"')
  }
  if (!VALID_SIZES.includes(opts.size)) {
    die(`--size muss eins von ${VALID_SIZES.join(', ')} sein (war: ${opts.size})`)
  }
  if (!VALID_QUALITIES.includes(opts.quality)) {
    die(`--quality muss eins von ${VALID_QUALITIES.join(', ')} sein (war: ${opts.quality})`)
  }
  if (!VALID_FORMATS.includes(opts.format)) {
    die(`--format muss eins von ${VALID_FORMATS.join(', ')} sein (war: ${opts.format})`)
  }
  if (!Number.isInteger(opts.n) || opts.n < 1 || opts.n > 10) {
    die(`--n muss eine ganze Zahl zwischen 1 und 10 sein (war: ${opts.n})`)
  }
  if (opts.transparent && opts.format === 'jpeg') {
    die('--transparent geht nicht mit --format jpeg (JPEG kann keine Transparenz). Nimm png oder webp.')
  }

  return opts
}

// ------------------------------------------------------------------ API-Key

// Key kommt aus der Umgebung oder aus .env. `process.loadEnvFile` ist seit Node 20.12
// eingebaut — keine dotenv-Dependency nötig.
function loadApiKey() {
  if (!process.env.OPENAI_API_KEY && existsSync(ENV_FILE)) {
    try {
      process.loadEnvFile(ENV_FILE)
    } catch (err) {
      die(`.env konnte nicht gelesen werden: ${err.message}`)
    }
  }

  const key = process.env.OPENAI_API_KEY?.trim()

  // Die .env-Vorlage enthält einen Platzhalter. Ohne diesen Check bekäme der Nutzer
  // einen 401 von der API und würde den echten Fehler ("noch nicht ausgefüllt") nicht sehen.
  if (key && key.includes('DEIN-KEY-HIER')) {
    die(
      `In ${ENV_FILE} steht noch der Platzhalter.\n\n` +
      '  Ersetze die Zeile\n' +
      '    OPENAI_API_KEY=sk-DEIN-KEY-HIER-EINFUEGEN\n' +
      '  durch deinen echten Key von platform.openai.com -> API keys.\n' +
      '  Nur den Teil nach dem "=" austauschen, ohne Anführungszeichen.'
    )
  }

  if (!key) {
    die(
      'OPENAI_API_KEY nicht gefunden.\n\n' +
      '  1. Key holen:        platform.openai.com -> API keys -> Create new secret key\n' +
      '  2. Guthaben aufladen: platform.openai.com -> Billing\n' +
      `  3. Datei anlegen:     ${ENV_FILE}\n` +
      '     mit genau der Zeile:  OPENAI_API_KEY=sk-...\n\n' +
      '  (.env steht in .gitignore — der Key landet nicht im public Repo.)'
    )
  }
  return key
}

// --------------------------------------------------------------- Dateinamen

// Slug aus dem Prompt, damit man im Explorer noch erkennt was das Bild sein sollte.
function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || 'image'
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// ------------------------------------------------------------------ Request

// Die Fehler, die man realistisch trifft — jeweils mit dem konkreten nächsten Schritt.
function explainHttp(status) {
  switch (status) {
    case 401:
      return 'HTTP 401 — Key wird abgelehnt. Stimmt der Wert in .env? (beginnt mit "sk-", keine Anführungszeichen drumherum, keine Leerzeichen.)'
    case 403:
      return 'HTTP 403 — Zugriff verweigert. gpt-image-1 verlangt bei manchen Konten eine Organisations-Verifizierung: platform.openai.com -> Settings -> Organization -> General.'
    case 429:
      return 'HTTP 429 — Rate Limit oder Guthaben leer. Unter platform.openai.com -> Billing prüfen ob Credits da sind, sonst kurz warten.'
    case 400:
      return 'HTTP 400 — Anfrage abgelehnt. Meist der Content-Filter (Prompt umformulieren) oder eine ungültige Parameter-Kombination.'
    default:
      return `HTTP ${status} — Anfrage fehlgeschlagen.`
  }
}

// Zwei Endpunkte, je nachdem ob eine Vorlage mitgegeben wurde:
//   ohne --edit  -> /v1/images/generations, JSON, das Modell erfindet alles neu
//   mit  --edit  -> /v1/images/edits, multipart, das Modell arbeitet AM Bild weiter
// Der Unterschied ist wesentlich, sobald eine vorhandene Form erhalten bleiben soll:
// Bei freier Erzeugung entsteht sie jedes Mal neu, egal wie genau der Prompt sie beschreibt.
async function generate(opts, apiKey) {
  let res
  if (opts.edit.length) {
    const form = new FormData()
    form.append('model', opts.model)
    form.append('prompt', opts.prompt)
    form.append('n', String(opts.n))
    form.append('size', opts.size)
    form.append('quality', opts.quality)
    if (opts.transparent) form.append('background', 'transparent')
    for (const file of opts.edit) {
      if (!existsSync(file)) die(`Vorlagenbild nicht gefunden: ${file}`)
      const bytes = readFileSync(file)
      const name = file.split(/[\\/]/).pop()
      const type = name.endsWith('.webp') ? 'image/webp' : name.endsWith('.jpg') || name.endsWith('.jpeg') ? 'image/jpeg' : 'image/png'
      form.append('image[]', new Blob([bytes], { type }), name)
    }
    res = await fetch(EDIT_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },   // Content-Type setzt FormData selbst
      body: form,
    })
  } else {
    const body = {
      model: opts.model,
      prompt: opts.prompt,
      n: opts.n,
      size: opts.size,
      quality: opts.quality,
      output_format: opts.format,
    }
    if (opts.transparent) body.background = 'transparent'

    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  if (!res.ok) {
    const raw = await res.text()
    let detail = raw
    try {
      detail = JSON.parse(raw).error?.message ?? raw
    } catch {
      // kein JSON — dann eben der Rohtext
    }
    die(`${explainHttp(res.status)}\n\n  API meldet: ${detail}`)
  }

  return res.json()
}

// --------------------------------------------------------------------- Main

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const apiKey = loadApiKey()

  console.log(`\n  Modell:  ${opts.model}`)
  console.log(`  Prompt:  ${opts.prompt}`)
  console.log(`  Format:  ${opts.size}, quality=${opts.quality}, ${opts.format}${opts.transparent ? ', transparent' : ''}`)
  console.log(`  Anzahl:  ${opts.n}`)
  if (opts.edit.length) console.log(`  Vorlage: ${opts.edit.join(', ')}   (Edit-Modus)`)
  console.log('\n  ... generiere (dauert meist 10-40 Sekunden)')

  const result = await generate(opts, apiKey)

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const base = opts.out ?? `${slugify(opts.prompt)}-${timestamp()}`
  const written = []

  result.data.forEach((img, i) => {
    if (!img.b64_json) die('Antwort enthielt kein Bild (Feld b64_json fehlt).')
    const suffix = result.data.length > 1 ? `-${i + 1}` : ''
    const file = join(OUT_DIR, `${base}${suffix}.${opts.format}`)
    writeFileSync(file, Buffer.from(img.b64_json, 'base64'))
    written.push(file)
  })

  console.log('\n  Fertig:')
  written.forEach(f => console.log(`    ${f}`))

  // Die API meldet den Token-Verbrauch zurück — grober Kosten-Indikator pro Lauf.
  if (result.usage) {
    const u = result.usage
    console.log(`\n  Verbrauch: ${u.input_tokens ?? '?'} in / ${u.output_tokens ?? '?'} out Tokens`)
  }
  console.log('')
}

main().catch(err => {
  // Erwartete Fehler nur als Meldung, alles Unerwartete mit Stacktrace.
  console.error(`\n[x] ${err instanceof UserError ? err.message : (err.stack ?? String(err))}\n`)
  process.exitCode = 1
})
