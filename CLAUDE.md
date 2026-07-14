# Cape York 2026 — Project Brief for Claude Code

## Was ist dieses Projekt?
Eine Progressive Web App (PWA) als Reise-Begleiter für Cape-York-4WD-Mieter aus Cairns: Konfigurator → generierter Menüplan → Offline-Rezepte → skalierte Einkaufsliste (Cairns + Bamaga). Konfigurator-Range im MVP: 1–8 Personen, 7–28 Tage.

Eigen-Trip vom Entwickler + Reisepartner im Juni 2026 (16 Tage, 2 Personen) ist der erste reale Praxistest (Dogfood). Voller Produkt-Brief — Zielnutzer, Kern-Problem, Top-5-Features, Nicht-Ziele, Erfolgsmetrik — in `PRODUCT.md`.

## Endziel
Öffentliches Produkt im Play Store / Samsung Galaxy Store via Capacitor.js — nicht nur Eigen-Trip-Helfer. Stufe 1 = PWA + Eigen-Trip-Validierung; Stufe 2 = Android-APK + Public-Launch + ggf. Monetarisierung.
**Jede Entscheidung soll diesen Schritt vorwegnehmen.**

## Tech Stack
- **React 18** + **Vite 5**
- **vite-plugin-pwa** für Service Worker / Manifest
- **Kein TypeScript** (einfach halten)
- **Kein UI Framework** (eigenes CSS in App.css)
- **localStorage** für persistente Daten (Checkboxen etc.)
- **Capacitor** wird in Stufe 2 hinzugefügt (noch nicht installiert)

## Deployment
GitHub Pages → `main` Branch → `npm run build` → `/dist` Folder

## Design System (in App.css definiert)
- Primärfarbe: `--or: #C0600C` (Orange)
- Hintergrund: `--bg: #F2EDE7` (warmes Beige)
- Mobile-first, Samsung-optimiert (360px Viewport)
- Feste Topbar (56px) + Fixed Bottom Nav (64px)
- Scrollbarer Content-Bereich dazwischen

## Projektstruktur
```
capeyork-app/
├── index.html              # Root HTML
├── vite.config.js          # Vite + PWA Config
├── package.json
├── CLAUDE.md               # Diese Datei
├── public/
│   ├── icon-192.png        # App Icon (noch erstellen!)
│   └── icon-512.png        # App Icon gross (noch erstellen!)
└── src/
    ├── main.jsx            # Entry point
    ├── App.jsx             # Tab-Navigation, Layout
    ├── App.css             # Alle Styles (zentralisiert)
    ├── index.css           # CSS-Variablen, Reset
    ├── components/
    │   ├── MenuTab.jsx     # 16-Tage Menüplan, statisch (wird zu generiertem Plan aus Konfigurator umgebaut)
    │   ├── RecipesTab.jsx  # Alle Rezepte mit Zutaten + Schritten (bleibt; auf Plan-Filter erweitern)
    │   └── ShoppingTab.jsx # Einkaufsliste mit Checkboxen (statisch; wird aus Plan + Personen abgeleitet)
    ├── data/
    │   ├── days.js         # DAYS[] — statisch, wird durch Generator-Logik ersetzt
    │   ├── recipes.js      # RECIPES[] — ~24 Rezepte (Seed); braucht Tags (Diät, Kühlbedarf, Pro-Person-Mengen)
    │   └── shopping.js     # CAIRNS[] + BAMAGA[] — statisch, wird durch Generator abgelöst
    └── hooks/
        └── useStorage.js   # localStorage Hilfsfunktionen
```

## Geplante neue Dateien (Stufe 1, aus `PRODUCT.md` § 3 abgeleitet)

- `src/components/ConfiguratorTab.jsx` — Onboarding (Tage, Personen, Diät) und nachträgliche Anpassung
- `src/lib/generator.js` — deterministische Generator-Logik (Plan + skalierte Einkaufsliste aus Konfigurator + Rezept-Pool); kapselbar, damit Stufe-2-Algorithmus andocken kann
- `src/strings.js` — User-facing Strings (Englisch im MVP), Vorbereitung für i18n in Stufe 2
- `src/data/regions.js` — datengetriebene Versorgungspunkte (Cape York: Cairns + Bamaga); strukturell offen für spätere Geo-Erweiterung

## Roadmap

Reihenfolge folgt `PRODUCT.md`. Kurzfassung:

### Stufe 1 — MVP (bis Juni 2026, Eigen-Trip-Validierung)
1. **Trip-Konfigurator** (Onboarding) — Tage (7–28), Personen (1–8), Diät-Kategorie
2. **Generierter Menüplan** — deterministisch aus Konfigurator + Rezept-Pool
3. **Rezepte mit Tags** — bestehende ~24 Rezepte mit Diät / Kühlbedarf / Pro-Person-Mengen anreichern
4. **Skalierte Einkaufsliste** — Cairns + Bamaga, abgeleitet aus Plan
5. **Konfigurator nachträglich anpassen** — Plan + Liste regenerieren, abgehakte Items markieren statt überschreiben
6. *(Polish)* Echte Icons (aktuell Platzhalter), Live-Test im Browser bei 360 px Viewport

### Stufe 2 — Public Product (nach Eigen-Trip-Retrospektive)
- Capacitor-Setup, Android-APK-Build, Play Store / Galaxy Store
- Eigene Rezepte (Nutzer-CRUD in `localStorage`)
- Kreativer Plan-Generator (Abwechslung, Kühlbedarf zuerst, Diät-Substitutionen)
- Komfort-Features: Tages-Notizen, Packliste, Kalorien-Tab, Tipps-Tab, Routenplan
- i18n (weitere Sprachen je nach Bedarf)
- Geo-Erweiterung (andere Regionen außerhalb Cape York)
- Monetarisierung (Per-Trip-Lizenz oder Einmalkauf nach Trial — Entscheidung nach Eigen-Trip)

## Coding-Regeln
- **Englisch** in App-UI und User-facing Strings; Code-Kommentare und Chat-Sprache bleiben Deutsch
- **User-facing Strings in `src/strings.js`** auslagern — keine Inline-Strings in Komponenten (Vorbereitung für i18n in Stufe 2)
- Keine unnötigen Dependencies hinzufügen; neue Dependencies brauchen `CHANGELOG.md`-Eintrag mit Begründung
- Mobile first — alles auf Samsung Galaxy S-Serie testen (360px)
- Touch-Targets minimum 44px Höhe
- localStorage Keys immer mit Prefix (z.B. `cfg_` für Konfigurator, `ck_` für Checkboxen, `note_`, `pack_`)
- Neue Komponenten in `/src/components/`, neue Daten in `/src/data/`, Generator-/Hilfslogik in `/src/lib/`

## Architektur-Vorgaben (aus `PRODUCT.md` abgeleitet)

Diese Vorgaben kosten im MVP wenig, aber verhindern, dass spätere Stufen alles umbauen müssen. Sie sind ohne Diskussion zu beachten.

1. **Generator-Logik kapseln.** Plan- und Einkaufslisten-Generierung in `src/lib/generator.js` isoliert halten. MVP-Variante deterministisch; Stufe 2 ersetzt die Logik, ohne die UI anzufassen.
2. **User-facing Strings extern.** Alle Texte aus den Komponenten in `src/strings.js` auslagern, MVP-Sprache Englisch. Bei Stufe-2-i18n wird daraus `src/strings/en.js`, `de.js` etc. ohne Komponenten anzufassen.
3. **Rezept-Datenmodell von Anfang an mit Tags.** Jedes Rezept im Pool führt: Diät-Kategorie, Kühlbedarf, Aufwand, Pro-Person-Mengen. Auch wenn der MVP nur Diät filtert — sonst muss Stufe 2 alle Rezepte nachpflegen.
4. **Versorgungspunkte datengetrieben.** Cairns / Bamaga sind Daten in `src/data/regions.js`, nicht hardcoded in Komponenten. Stufe-2-Geo-Erweiterung tauscht die Region, der Code bleibt gleich.
5. **Kein Backend, keine Accounts, kein Sync.** Alles lokal. `localStorage` ist Quelle der Wahrheit für Nutzer-State.
6. **Konfigurator-Edits sind nicht-destruktiv.** Wenn der Nutzer nachträglich Personen/Tage/Diät ändert: Plan + Liste werden regeneriert; bereits abgehakte Einkaufs-Items werden **markiert** (z.B. „bereits gekauft"), nicht stumm überschrieben.

## Nutzer-Kontext
- der Entwickler, Windows-Nutzer, wenig Terminal-Erfahrung
- Claude Pro Abo
- Doppelrolle: **Entwickler** und **erster Dogfood-Tester** der App auf seinem 16-Tage-Cape-York-Trip im Juni 2026
- Endziel: öffentliches Produkt im Play Store für die breite Zielgruppe (siehe `PRODUCT.md` § 1)

---

## Workflow für Claude (Memory zwischen Sessions)

Dieses Projekt führt zwei begleitende Markdown-Dateien, damit zukünftige Claude-Sessions sofort wissen, wo der letzte Stand war:

- **`STATUS.md`** — *aktueller* Stand: was funktioniert, was offen ist, nächste sinnvolle Schritte, Tech-Notizen. **Immer hier zuerst nachlesen.**
- **`CHANGELOG.md`** — chronologisches Log: was wann gemacht (und bewusst nicht gemacht) wurde. Neueste Einträge oben.

### Regel — verbindlich
**Bei jeder substanziellen Änderung am Projekt müssen `STATUS.md` und `CHANGELOG.md` aktualisiert werden, in derselben Session in der die Änderung passiert ist.**

Substanziell heißt z.B.:
- Neue Dependency, neue Datei, gelöschte Datei, geänderte Buildkonfiguration
- Neues Feature / neuer Tab / neue Komponente
- Architekturentscheidung, Tech-Stack-Wechsel
- Bekannte Lücke neu entdeckt oder geschlossen
- Erkenntnis zu Tooling/Pfaden/Harness, die future-Claude Zeit spart

Reine Whitespace- oder Tippo-Fixes brauchen keinen Changelog-Eintrag.

### Was wohin gehört
| Information | Datei |
|---|---|
| Wie ist das Projekt jetzt? Was geht, was nicht? | `STATUS.md` |
| Was ist als Nächstes sinnvoll? | `STATUS.md` (§ Nächste Schritte) |
| Was wurde wann gemacht? | `CHANGELOG.md` |
| Warum wurde etwas bewusst NICHT gemacht? | `CHANGELOG.md` |
| Produkt-Brief: Zielnutzer, Kern-Problem, Top-5-Features, Nicht-Ziele, Erfolgsmetrik | `PRODUCT.md` |
| Tech-Stack-Entscheidungen, Coding-Regeln, Architektur-Vorgaben | `CLAUDE.md` (diese Datei) — nur bei echten Stack-/Regelwechseln ändern |

### Reihenfolge in einer neuen Session
1. `CLAUDE.md` lesen (Tech-Brief & Regeln — wird automatisch geladen)
2. `PRODUCT.md` lesen (Produkt-Brief: für wen, welches Problem, was wird/wird nicht gebaut)
3. `STATUS.md` lesen (wo stehen wir gerade?)
4. Bei Bedarf in `CHANGELOG.md` schauen (warum etwas so ist wie es ist)
5. Erst dann mit der Arbeit anfangen
