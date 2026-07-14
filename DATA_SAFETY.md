# Data Safety — interne Audit-Doku für die Play-Store-Form

**Stand:** 2026-05-03
**Zweck:** vorbereitete Antworten für das Google-Play-Store-Data-Safety-Formular
und für vergleichbare Compliance-Fragen (Samsung Galaxy Store, Apple
App Store falls relevant). Wird nicht öffentlich gehostet — `PRIVACY.md`
ist die user-facing Variante.

> Diese Datei muss bei jeder Änderung am Code, die Daten betrifft (neuer
> localStorage-Key, neuer Network-Call, neues Permission-Use, neue
> Drittanbieter-Library), aktualisiert werden. Bei Doubt: hier nachlesen,
> dann erst submitten.

---

## 1. Audit-Methode

Quellen für diese Antworten:
- Vollständiger `grep` über `src/` nach `localStorage`, `sessionStorage`,
  `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.send`
- Manuelle Prüfung von `index.html` (kein externes Asset)
- Manuelle Prüfung von `vite.config.js` (Service Worker Konfiguration)
- Inspektion aller Dependencies in `package.json` auf Tracking-/Telemetry-Libs

Ergebnis: 0 Network-Calls in `src/`, 0 Cookies, 0 Tracker, 0 Drittanbieter-CDNs.

---

## 2. Play-Store-Formular: konkrete Antworten

### „Does your app collect or share any of the required user data types?"

**Antwort: NEIN.**

Begründung: die App speichert ausschließlich lokal (`localStorage`),
sendet keine Daten an irgendwelche Server, hat keine Accounts, keine
Analytics, keine Crash-Reports. Trip-Konfiguration ist persönliche
Präferenz, keine personenbezogenen Daten im Sinne der DSGVO oder des
Play-Store-Formulars.

### „Is all of the user data collected by your app encrypted in transit?"

**N/A** — es wird gar nichts transmittiert. Die Frage ist im Formular
trotzdem zu beantworten; korrekte Antwort: „Yes, data is encrypted in
transit" (vakuös wahr — die leere Menge erfüllt jede Bedingung).

### „Do you provide a way for users to request that their data be deleted?"

**Antwort: JA.**

Begründung: zwei In-App-Mechanismen ("Reset & start a new trip" auf
Home-Screen, "Reset all" auf Trip-Seite) plus Standard-OS-Pfad
(App-Daten löschen / App deinstallieren). Da nichts auf einem Server
liegt, ist der Lösch-Vorgang vollständig.

---

## 3. Vollständiges Daten-Inventar

### 3.1 localStorage-Keys (alle in `src/hooks/useStorage.js` definiert)

| Key-Pattern | Inhalt | Lebensdauer |
|---|---|---|
| `cfg_v1` | JSON: Trip-Konfiguration (`days`, `startDate`, `people[{type, appetite, customKcal?}]`, `diet`, `burners`, `fridgeSize`, `bamagaStop`, `bamagaDay`, `enabledStops`, `stopDays`, `allergiesEnabled`, `allergens[]`, `restaurantSlots`, `overrides`, `completed`) | bis Reset oder Uninstall |
| `ck_<id>` | `"true"` / `"false"` — Shopping-Checkboxen | bis Reset oder Uninstall |
| `del_<id>` | `"true"` — gelöschte Shopping-Items (per Item-ID, global) | bis Reset oder Uninstall |
| `qty_<id>` | String — Mengen-Override (z.B. `"3 kg"`) | bis Reset oder Uninstall |
| `add_<bucket>_<id>` | JSON `{name, qty, cat}` — User-hinzugefügtes Shopping-Item | bis Reset oder Uninstall |

**Was steht NICHT drin:** kein Name, keine E-Mail, keine GPS-Position,
keine IP, keine User-ID, keine Geräte-ID, keine biometrischen Daten,
keine medizinischen Daten (Diät-Präferenzen sind kategorisch — keine
Diagnose oder Krankheits-Info).

### 3.2 Cookies

Keine. Die App setzt keine `document.cookie`-Werte.

### 3.3 Andere Storage-Mechanismen

- `sessionStorage`: nicht verwendet
- IndexedDB: nicht verwendet (außer indirekt durch das vite-plugin-pwa
  Workbox-Runtime, das aber nur bekannte App-Assets cacht)
- Cache API: nur Service-Worker-Cache (`workbox-precache-v2`) für die
  App-eigenen Files (HTML/CSS/JS/Icons). Inhalt wird per
  `globPatterns: ['**/*.{js,css,html,ico,png,svg}']` aus dem Build-Output
  generiert. Keine User-Daten darin.

### 3.4 Network-Calls in der Runtime

Keine. Bestätigt durch:

```bash
grep -rn "fetch(\|XMLHttpRequest\|WebSocket\|EventSource\|navigator.send" src/
# (keine Treffer)
```

Der einzige „Network-Code" ist der vite-plugin-pwa Service Worker, der
ausschließlich die App-eigenen, vorab gecachten Files served. Er macht
keine Outbound-Calls.

### 3.5 Build-time Network-Calls (NICHT in der App, NICHT in Production)

`scripts/fetch-osm.mjs` ruft die Overpass API
(`overpass-api.de/api/interpreter`) auf, wenn der Entwickler
`npm run osm:refresh` manuell ausführt. Das Ergebnis wird in
`src/data/route-pois.js` geschrieben und in den Build gebundelt. Endnutzer
machen diesen Call nie. Diese Information wird in PRIVACY.md unter
„Network connections" für Transparenz erwähnt, gehört aber nicht zur
App-Runtime.

---

## 4. Drittanbieter-Libraries — Audit

Alle Production-Dependencies in `package.json`:

- **`react@^18.3.1`** + **`react-dom@^18.3.1`** — UI-Framework, kein
  Telemetry, keine Network-Calls.
- **`@vitejs/plugin-react@^4.3.1`** — Build-Time-Plugin, kein Runtime-Code.
- **`vite@^5.4.0`** — Build-Time-Tool, kein Runtime-Code.
- **`vite-plugin-pwa@^0.20.0`** — generiert Service Worker via Workbox.
  Der generierte SW enthält Workbox-Runtime, die wir nur für
  Asset-Precaching nutzen. **`workbox-google-analytics`** ist eine
  transitive Dependency (vite-plugin-pwa → workbox-build → … →
  workbox-google-analytics), wird aber nicht aktiviert (keine
  GA-Konfiguration in `vite.config.js`). Der entsprechende Code wird vom
  Workbox-Build nicht in den finalen SW eingefügt. Verifiziert via
  Inspektion von `dist/sw.js` und `dist/workbox-*.js` — keine GA-Calls.
- **`vitest@^3.2.4`** — Dev-Dependency, nicht im Production-Bundle.

Keine Analytics, keine Crash-Reporting, keine A/B-Test-Tools, keine
SDK-Integrationen. Saubere Kette.

---

## 5. Permissions (Android-spezifisch — Stufe 2)

Bei Capacitor-Setup für die Android-App werden **keine** der folgenden
sensiblen Permissions deklariert oder genutzt:

- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`
- `READ_CONTACTS`, `READ_CALENDAR`, `READ_SMS`
- `CAMERA`, `RECORD_AUDIO`
- `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`
- `BLUETOOTH*`, `NFC`

Was wir brauchen werden:

- `INTERNET` — wird automatisch gesetzt, aber nur damit der WebView die
  App-eigenen Assets aus dem APK laden kann; keine Outbound-Calls (siehe
  oben). Falls Capacitor andere Permissions automatisch hinzufügt, müssen
  diese im Pre-Submission-Audit explizit auf `<uses-permission ... />`
  in `android/app/src/main/AndroidManifest.xml` durchgegangen werden, mit
  Begründung pro Permission.

---

## 6. Compliance-Reminder bei Code-Änderungen

Wenn eine zukünftige Änderung etwas davon einführt, **muss diese Datei
und PRIVACY.md aktualisiert werden, in derselben Session**:

- Neuer `localStorage`-Key
- Neuer `fetch(...)`/Network-Call
- Neue Drittanbieter-Library mit potenzieller Telemetry
- Neue Capacitor-Plugin-Permission
- Account-System, User-Auth, Cloud-Sync (alles bisher explizit
  ausgeschlossen — bei Einführung wird die Privacy-Story komplett anders)
- Werbung, In-App-Purchases, Crash-Reporting

Bei Doubt: nicht submitten, erst Audit nachziehen.
