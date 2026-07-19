# Release-Checkliste — „Niemand hungert auf dem Trip"

> Diese Checkliste garantiert, dass Menüplan, Rezepte und Einkaufsliste in allen
> realistischen Szenarien verlässlich funktionieren, bevor ein Trip (Eigen-Trip oder
> Public-Release) live geht. Sie hat drei Ebenen: **A** automatisiert (läuft in `npm test`),
> **B** Golden-Master, **C** manueller Geräte-Check. Ebene A+B laufen bei jedem Commit;
> Ebene C ist die Vorab-Schwelle vor Abflug / Store-Release (vgl. `PRODUCT.md` §5.1).

---

## Ebene A — Automatisierte „Nie-Hunger"-Invarianten (`npm test`)

Der Sicherheits-Sweep (`src/lib/generator.safety.test.js`) fährt **~1090 Konfigurationen**
über die failure-relevanten Achsen ab (Diät × Burner × Kochaufwand × Allergene × Tage ×
Personen × Kühlschrank × Stops) und prüft pro Trip harte Invarianten. Weil der Generator
**deterministisch** ist, ist „grün" ein Beweis über den ganzen abgefahrenen Raum, kein Stichproben-Glück.

| # | Invariante | Riegel gegen |
|---|---|---|
| I1 | Jeder Koch-Slot hat Rezept / Restaurant / Reste — oder ist ein Skip (Pickup/Dropoff). Nie leer. | leerer Teller |
| I2 | Einkauf ≥ Bedarf für jede Zutat (Deckung, via `shortfall(bought, consumed)`). | zu wenig gekauft |
| I3 | Kein Slot unterschreitet die angewandte Diät. | nicht essbar (veg/vegan) |
| I4 | Kein gewähltes Allergen als Core-Zutat. | nicht essbar (Allergie) |
| I5 | Keine verderbliche Zutat wird nach ihrem Koch-Tag gekauft. | Zutat kommt zu spät |
| I6 | Kein `qty`/`amount` ist NaN / undefined / Infinity / ≤ 0. | kaputte Mengenanzeige |
| I8 | Greift ein Fallback (Diät/Burner/Aufwand), erscheint eine Warnung. | stille Verschlechterung |

**I2 im Detail (der wichtigste Riegel):** Die Deckung wird über zwei *getrennte* Codepfade
geprüft — Einkauf aus `generateShopping`, Bedarf aus `consumedByCooked` (in `inventory.js`).
Stimmen sie nicht überein, driftet die App (genau der historische „Öl fälschlich aufgebraucht"-Bug).
`shortfall` klemmt bewusst NICHT auf 0 (anders als `subtractAmounts`), damit eine Unterdeckung
sichtbar wird statt maskiert zu bleiben.
*Grenze, ehrlich benannt:* I2 beweist **Konsistenz** zwischen Einkauf und Verbrauch, nicht die
absolute Korrektheit der Skalierungs-Zahlen — die sichern die konkreten Wert-Tests in
`generator.test.js` (z. B. „Kokosmilch verdoppelt sich 2→4", Fajitas-Mengen) und `RecipesTab.test.jsx`.

**I7 (Rezept-Anzeige == Einkaufs-Skalierung)** ist nicht doppelt getestet: Anzeige und Einkauf
teilen dieselbe `scaleFactor`-Engine, die I2 gegen `consumedByCooked` absichert; die Anzeige selbst
deckt der `scaleAmountLabel`-Block in `generator.test.js` + `RecipesTab.test.jsx` ab.

**Schärfe verifiziert:** Ein absichtlicher Unter-Einkauf-Bug (`× 0.5` im Einkauf) lässt I2
sofort und präzise fehlschlagen — der Sweep ist nicht vacuously grün.

- [ ] `npm test` ist vollständig grün.
- [ ] `npm run build` läuft ohne Fehler durch.

---

## Ebene B — Golden Master des Eigen-Trips (`generator.golden.test.js`)

Der reale Eigen-Trip (16 Tage, 2 Personen, omnivore) liegt als committeter Snapshot fest:
Menüplan + Einkaufsliste (Cairns/Bamaga) + Warnungen + Kennzahlen, als lesbarer Text.

- [ ] Snapshot-Test ist grün — der Eigen-Trip hat sich nicht unbemerkt verschoben.
- [ ] Falls der Diff **gewollt** ist (Rezept-/Generator-Änderung): Snapshot bewusst mit
      `npx vitest -u src/lib/generator.golden.test.js` aktualisiert und den Diff im Commit reviewt.

---

## Ebene C — Manueller Offline-Geräte-Check (vor Abflug / Store-Release)

Das prüft, was Unit-Tests nicht können: PWA-Installation, Service-Worker-Cache, `localStorage`-
Persistenz, echtes Touch/Viewport-Verhalten. Zielgerät: Samsung Galaxy S-Serie (~360 px), **Flugmodus**.

### Offline-Kernfluss
- [ ] App auf dem Zielgerät installiert (PWA „Add to home screen").
- [ ] **Flugmodus an.** App aus dem Cache startet ohne Netz.
- [ ] Konfigurator vollständig durchlaufbar → Plan wird generiert (offline).
- [ ] Menüplan: alle Tage haben Mahlzeiten, keine leeren Slots, Bamaga-Tag markiert.
- [ ] Rezept-Ansicht offen: Zutaten mit **skalierten** Mengen, Schritte lesbar.
- [ ] Einkaufsliste: Cairns + Bamaga getrennt, Mengen plausibel, abhakbar.
- [ ] Stock/Inventar: gekochte Mahlzeit markieren → Bestand sinkt korrekt.

### Persistenz & nicht-destruktive Edits
- [ ] Ein paar Einkaufs-Items abhaken, App **komplett schließen und neu starten** → Häkchen bleiben.
- [ ] Konfigurator nachträglich ändern (z. B. Personen 2 → 4) → Plan + Liste regenerieren,
      bereits abgehakte Items werden **markiert**, nicht stumm überschrieben.
- [ ] (Wenn möglich) App-Update simulieren → `localStorage`-Daten überleben.

### Bedienung im Feld
- [ ] Einhändig bedienbar, Touch-Targets groß genug (≥ 44 px), bei Sonnenlicht lesbar.
- [ ] Kein horizontales Scrollen des Body; Sheets/Modals passen auf den Screen.

---

## Ebene D — Release-spezifisch (nur vor Public-Release, nicht vor Eigen-Trip)

Aus `STATUS.md` — Privacy/Identitäts-Themen, die vor einem öffentlichen Store-Release stehen:

- [ ] Alte Branches `main` / `redesign` auf `origin` (tragen private History) durch den
      sauberen `fresh-start`-Stand ersetzt oder gelöscht — sonst ist der Scrub wirkungslos.
- [ ] Kontakt-Platzhalter (`support@example.com`) durch echte Support-Adresse ersetzt.
- [ ] Live-gehostete Privacy Policy entspricht dem aktuellen Stand (kein OSM, keine private Identität).
- [ ] Echte App-Icons (aktuell teils Platzhalter).

---

### Kurzfassung für „go / no-go"

> **Eigen-Trip:** Ebene A + B grün **und** Ebene C vollständig abgehakt → die App fliegt mit.
> Bricht Ebene C irgendwo, ist das ein dokumentierter Funktions-Lücken-Befund (vgl. `PRODUCT.md` §5.1).
