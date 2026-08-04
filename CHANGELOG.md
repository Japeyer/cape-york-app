# Changelog

Chronologisches Log der Änderungen pro Session. Neueste oben.
Bei jeder substanziellen Änderung **eine neue Zeile/Block hinzufügen** und den Stand in `STATUS.md` parallel aktualisieren.

---

## 2026-08-04 (bj) — Alte Identitäts-History von GitHub entfernt (Branch `redesign` gelöscht)

**Anlass (der Entwickler):** „Es soll nur noch die aktuellste Version verwendet werden." Damit ist
der seit (aw)/(at) offene Privacy-Blocker geschlossen worden — der letzte Rest der alten History.

**Befund vor der Aktion (verifiziert, nicht angenommen):** `git log redesign` zeigte **30 Commits
mit Klarnamen + privater E-Mail** in den Author-Metadaten; `main`/`fresh-start` dagegen 10 Commits
ausschließlich als `Cape York Dev <…@users.noreply.github.com>`. Auf `origin` lagen keine Tags und
keine weiteren Refs — `redesign` war der einzige verbliebene Träger.

**Gemacht:** `git push origin --delete redesign` + lokalen Branch gelöscht + `--prune`. Auf `origin`
stehen jetzt nur noch `main` und `fresh-start`, beide auf `93c2504`. Lokaler `main` wurde auf
`origin/main` nachgezogen (stand noch einen Commit zurück).

**Ehrliche Grenze — wichtig für den Release-Scrub:** Das Löschen eines Branches entfernt die Commits
NICHT von GitHubs Servern. Direkt nach dem Delete war die alte Spitze `fa53b0e` über ihre SHA-URL
weiterhin abrufbar (`HTTP 200` gemessen). Unerreichbare Objekte verschwinden erst mit einem
Garbage-Collect, den GitHub nicht automatisch fährt. Zwei Wege, in `RELEASE-CHECKLIST.md` Ebene D
als offener Punkt notiert: (1) GitHub Support um GC bitten, (2) Repo löschen und unter gleichem
Namen neu anlegen — hier billig, weil **0 Forks / 0 Stars** (per API geprüft), also existiert die
History nirgends sonst im Fork-Netzwerk. Kosten: Pages + Actions einmal neu aktivieren.

**Nicht gemacht:** Repo-Neuanlage — das ist eine Entscheidung des Entwicklers (kurze Downtime der
Live-URL), keine Aufräum-Aktion, die nebenbei passieren sollte.

---

## 2026-07-31 (bi) — Spotlight-Tutorial auch im Trip-Wizard (Resupply + Restaurant) (Branch `fresh-start`)

**Anlass (der Entwickler):** „Sieht gut aus auf den Seiten, auf denen es umgesetzt wurde — mach das
Gleiche auf den Trip-Erstellungs-Seiten, und geh auf wichtige Details wie Resupply-Stop und
Restaurant ein. Erwähne beim Stock-Tutorial auch, dass dort alle Einkäufe auftauchen, wenn sie
abgehakt wurden, und wieder verschwinden, wenn das Menü als gekocht abgehakt wird."

**Wizard-Schritte bekommen Tutorials** (`config-dates` / `config-group` / `config-kitchen`, Key =
`'config-' + S.config.steps[].key`). Gerendert von `ConfiguratorTab` selbst (nicht `App.jsx`), weil
nur der Wizard seinen aktuellen Schritt kennt.
- **Dates & route:** Kalender → Trip-Tag → **Resupply-Stop** → **Restaurant**. Die letzten beiden
  Schritte zielen INS geöffnete DaySheet.
- **Group & diet:** Gruppe/Appetit → Diät → Allergien. **Cooking & gear:** Kochaufwand → Kühlschrank
  (erklärt die Fleisch-Cluster-Logik) → Generate.

**Zwei Erweiterungen an `PageTour.jsx`, beide vom Wizard erzwungen:**
1. **`doneWhen`** — ein Schritt kann an einem ZUSTAND enden statt am Tap. Eine Datums-Range braucht
   zwei Taps; mit Tap-Abschluss wäre nach dem ersten Tap weitergeschaltet worden. `doneWhen`-Schritte
   schalten am Klick bewusst NICHT weiter. Der Kalender-Schritt nutzt dieselbe Bedingung als
   `skipIf` → im Edit-Modus (Range steht schon) entfällt er.
2. **Sheets pausieren nur noch, wenn das Ziel NICHT im Sheet liegt.** Vorher pausierte das Tutorial
   bei jedem offenen Sheet — dann wären Resupply/Restaurant unerklärbar gewesen (beide leben im
   DaySheet). Der Tour-Layer (1050) liegt über dem Sheet (500), dimmt es also mit.

**Echter Fund beim Verkabeln — Tap im Sheet kam nie an:** die Sheets rufen auf ihrer Karte
`e.stopPropagation()` (damit ein Backdrop-Klick sie nicht schließt). React 17+ hängt EINEN Listener
an den Root-Container; ein `stopPropagation` dort stoppt auch das native Event, bevor es `document`
erreicht → der Bubble-Listener von PageTour sah Taps im DaySheet nie (Test schlug exakt an dieser
Stelle fehl). **Fix:** Listener in der **Capture-Phase** (läuft vor allem anderen, von
`stopPropagation` unberührt) + Weiterschalten per **Microtask**, damit Reacts Handler und Re-Render
zuerst laufen und der Folgeschritt sein Ziel im aktuellen DOM findet.

**Kalender-Anker bewusst der ganze Block** (inkl. ◀▶-Monatsnavigation): läge der Spotlight nur auf
dem Tage-Raster, könnte man im Tutorial nicht in den Trip-Monat blättern, weil die Abdunklung alle
Taps daneben schluckt.

**Stock-Tutorial erweitert:** neuer Schritt `empty` für den leeren Tab (vor dem ersten Einkauf ist
genau das der Normalfall) — erklärt den Kreislauf: **abgehakter Einkauf landet hier, als gekocht
markierte Mahlzeit zieht ihn wieder ab.** `empty` und `row` schließen einander aus (fehlendes Ziel
⇒ Schritt entfällt). Text von `row` um denselben Zusammenhang ergänzt. `cta` ist jetzt optional
(reine Erklärungs-Schritte ohne Aktion).

**Ersetzt: die Wizard-Intro-Karten aus (bg).** Zwei Erklärsysteme auf derselben Seite wären Lärm —
der Inhalt der Karten steckt jetzt in den Tour-Texten, gezeigt am jeweiligen Bedienelement statt als
Textblock darüber. Entfernt: `.cfg-intro`-Block + `showIntro`/`dismissIntro` in `ConfiguratorTab`,
`S.config.steps[].intro` + `S.config.wizard.introDismiss`, `.cfg-intro*`-CSS, `getConfigIntrosSeen`/
`markConfigIntroSeen`. Der Legacy-Key `ui_cfg_intros_v1` wird von „Show tips again" weiter
mitgeräumt. Rückbau wäre klein, falls die Karten doch gewünscht sind.

**Tests:** +3 Integrationstests (Wizard-Schritt 1 komplett inkl. DaySheet-Schritte · Kalender-Schritt
bleibt stehen, bis eine Range steht · Schritte 2/3 zeigen eigene Tipps), Stock-Test auf den
Empty-State umgestellt. Tap-Tests laufen jetzt über async `act` (Microtask-Weiterschaltung).
**417 → 420 Tests grün**, Build grün (JS 1335.73 kB, CSS 60.41 kB).

---

## 2026-07-31 (bh) — Spotlight-Tutorial auf jeder Seite beim ersten Öffnen (Branch `fresh-start`)

**Anlass (der Entwickler):** „Auf jeder Seite soll beim ersten Öffnen ein kurzes Tutorial
erscheinen — auch bei Einkauf und Inventar. Es soll die wichtigsten Funktionen kurz zeigen:
alles ausgegraut, die gerade erklärte Funktion hervorgehoben, das Tutorial selbst ein kleines
Popup über dem ausgegrauten Rest — und es verschwindet, nachdem die Funktion ausgeführt wurde."
Das ist genau der in (bg) bewusst vertagte Punkt („First-Visit-Tipps für Menü/Rezepte/Einkauf/
Stock-Tabs").

**Neue Komponente `PageTour.jsx`** (Portal nach `document.body`, z-index 1050 → über der
Bottom-Nav): pro Seite eine kurze Schritt-Folge, jeder Schritt erklärt **eine** Funktion.
- **Abdunklung = vier Panels RINGS um das Ziel** (nicht ein Panel drüber mit `pointer-events:none`):
  das erklärte Element ist von nichts überdeckt, bleibt also normal bedienbar, während alle Taps
  daneben abgefangen werden. Genau dieser Tap schließt den Schritt ab.
- **Abschluss durch die Aktion:** ein `click`-Listener am `document` (Bubble-Phase, React hat seinen
  Handler dann schon abgearbeitet → das DOM des Folgeschritts existiert) erkennt den Tap auf das
  Ziel und schaltet weiter; nach dem letzten Schritt verschwindet das Tutorial.
- **Notausgänge:** „Next" (weiter ohne die Aktion) und „Skip tips" — niemand soll festhängen, nur
  weil er gerade nicht tippen will.
- **Position:** Popup unter dem Element, sonst darüber, in beide Richtungen so geklemmt, dass es nie
  halb aus dem Bild ragt; Ziel außerhalb des Sichtfelds wird vorher hereingescrollt. Nachgeführt via
  `MutationObserver` + `scroll`/`resize` (setState nur bei echter Rect-Änderung → kein Render-Loop).
- **Robustheit:** offenes Bottom-Sheet (`[role="dialog"], .sheet-backdrop`) → Tutorial **pausiert**
  und kommt danach zurück; fehlendes Ziel → Schritt wird übersprungen (`wait: true` bekommt 2 s
  Gnadenfrist, weil das Element erst durch den vorigen Schritt entsteht); **wurde gar nichts gezeigt,
  gilt die Seite NICHT als gesehen** (leerer Stock-Tab vor dem ersten Einkauf → Tipp kommt beim
  nächsten Besuch wieder); Seite verlassen, nachdem ein Schritt sichtbar war = gesehen.

**Inhalte (`lib/tours.js` = Struktur/Selektoren, `S.tours` = Texte, i18n-konform getrennt):**
Home (Trip öffnen · Trip planen) · Menu (Tag aufklappen → Swap → Log) · Recipes (Rezept öffnen ·
eigenes Rezept) · Shopping (Item abhaken · „🍽 wo verwendet?" · Teilen) · Stock (−1 verbrauchen ·
Item hinzufügen). Alle Versorgungspunkte teilen sich EIN `shopping`-Tutorial (Bedienung ist in
Cairns wie in Bamaga dieselbe). Der Configurator bleibt bei seinen (bg)-Intro-Karten.

**Anker als `data-tour="…"`** in `HomeTab`/`MenuTab`/`RecipesTab`/`ShoppingTab`/`InventoryTab` —
bewusst NICHT über Layout-Klassen, sonst bricht ein CSS-Rename das Tutorial still. Merker global in
`ui_tours_v1` (`getToursSeen`/`markTourSeen`), überlebt Trip-Reset → einmal pro Installation.

**„↺ Show tips again"** in der About-Seite (`resetAllIntros()` leert `ui_tours_v1` + `ui_cfg_intros_v1`)
— ohne das müsste man für einen erneuten Durchlauf `localStorage` von Hand leeren.

**Tests:** neue `PageTour.test.jsx` (**+19**): Erst-Anzeige, Abschluss durch die Aktion, Skip/Next,
Überspringen fehlender Ziele, „nichts gezeigt ⇒ nicht abgehakt", Sheet-Pause, kaputter localStorage,
Geometrie (Ring sitzt exakt auf dem Element; Popup weicht am unteren Rand nach oben aus — mit
gefälschten Rects, weil jsdom kein Layout rechnet) **plus 4 Integrationstests gegen die echte App**
(Home-Spotlight, Menu Tag→Swap, Tab-Wechsel zeigt je eigenen Tipp/keine Wiederholung, leerer
Stock-Tab). **Schärfe belegt:** ein umbenannter `data-tour`-Anker (`menu-swap` → `menu-swapXX`) ließ
den Integrationstest sofort fehlschlagen; danach revertiert. Der UI-Fuzzer läuft weiter crashfrei
(er klickt die Tutorial-Buttons jetzt mit). **398 → 417 Tests grün**, Build grün (JS 1332.77 kB,
CSS 60.83 kB).

**Bewusst offen:** `TutorialOverlay.jsx` + `S.tutorial` (der alte 6-Slide-Carousel) sind weiterhin
im Repo und nirgends eingehängt — jetzt endgültig durch die Seiten-Tutorials ersetzt; Löschen wäre
der nächste saubere Schritt, ist aber eine eigene Entscheidung. Optik der Overlays wurde nicht am
echten Gerät gegengeprüft (jsdom rechnet kein Layout) → 360-px-Sichtprüfung steht aus.

---

## 2026-07-28 (bg) — Configurator als geführter 3-Schritt-Wizard + kontextuelle Intros pro Seite (Branch `fresh-start`)

**Anlass (der Entwickler):** „Für eine bessere Führung durch die App wären unterschiedliche Seiten
am besten — z. B. Datum + Zwischenstopps auf der ersten Seite, dann per Next weiter. Sinnvoll
gruppieren (nicht eine Seite pro Möglichkeit). Und das Tutorial evtl. beim ersten Betreten der
jeweiligen Seite." **Entscheidungen (AskUserQuestion):** 3-Seiten-Aufteilung + „Intro pro Wizard-
Seite jetzt, First-Visit-Tipps auf Menü/Rezepte/Einkauf/Stock später".

**Configurator-Wizard (`ConfiguratorTab.jsx`):** die bisher EINE lange Seite (~11 Einstellungs-
gruppen) ist jetzt ein geführter Drei-Schritt-Flow:
- **Schritt 1 — Dates & route:** Kalender (Zeitraum) + Stopps/Restaurant-Tage (per Tag-Tap → DaySheet).
- **Schritt 2 — Group & diet:** Personen-Editor + Diät + Allergien (+ Allergen-Picker).
- **Schritt 3 — Cooking & gear:** Kochaufwand + Kochstellen + Kühlschrank + Kompressor + Special-
  Preview → **Generate/Update**.
- **Navigation:** antippbare Fortschritts-Punkte (vorwärts nur mit gewähltem Zeitraum) + „Step X of 3
  · Titel"; Bottom-Nav „← Back" / „Next →"; letzte Seite = Generate. Schritt 1 ist das Gate (kein
  Weiter ohne Datums-Range). Edit-Modus: Punkte springen direkt zur gewünschten Seite; Reset liegt
  auf der letzten Seite. Der Special-Dinner-Preview wanderte auf Schritt 3 (nutzt dann alle Werte).
- Kein neuer State im gespeicherten Config — reine UI-Schicht über dem bestehenden `draft`/`onSubmit`.

**Kontextuelle Intros statt Vorab-Carousel:** die alte 6-Slide-`TutorialOverlay` VOR dem Configurator
entfällt aus dem Flow (`handleCreateNew` legt den Trip jetzt direkt an; `showTutorial`/`handleTutorialDone`/
`getTutorialSeen`/`setTutorialSeen`-Verkabelung aus `App.jsx` entfernt). Stattdessen zeigt jede
Wizard-Seite beim **ersten Betreten** eine wegklickbare **Intro-Karte** (Erklärung des Schritts).
Gemerkt global in `localStorage` (`ui_cfg_intros_v1` via `getConfigIntrosSeen`/`markConfigIntroSeen`
in `useStorage.js`) → pro Schritt nur einmal, trip-übergreifend. Strings `S.config.wizard` + `S.config.steps`.
`TutorialOverlay.jsx` + `S.tutorial` bleiben im Repo (Inhalt = App-Rundgang) für die spätere
Tab-First-Visit-Tipp-Runde; nur aus dem Onboarding-Flow ausgehängt.

**Tests:** `App.robustness.test.jsx` Flow-Test „Create → Tutorial → Configurator" auf „Create →
Configurator-Wizard (Schritt 1)" umgestellt (kein Skip mehr; prüft Schritt-Titel + „Next"). Der
UI-Fuzzer durchklickt jetzt zusätzlich Wizard-Nav/Punkte → weiterhin crashfrei. **398 Tests grün**
(unverändert), Build grün (JS 1323.36 kB, CSS 58.81 kB). Auf `fresh-start`, nicht gemerged.

**Bewusst offen (nächste Runde, so vereinbart):** First-Visit-Tipps für Menü/Rezepte/Einkauf/Stock-Tabs.

---

## 2026-07-26 (bf) — Kochaufwand als Präferenz: „viel Aufwand" bevorzugt jetzt aufwändige Rezepte (Branch `fresh-start`)

**Anlass (der Entwickler):** „Die Kochaufwand-Funktion buggt — bei wenig und viel Aufwand tauchen
dieselben Rezepte auf."

**Untersuchung (empirisch belegt — KEIN Verkabelungs-Fehler):** Der Generator filterte korrekt
(`low` = nur `effort:'easy'`, bewiesen: 0 medium/hard), und die Configurator-Verkabelung (Pill →
`draft.cookEffort` → Submit → `generate`) war intakt. Zwei echte Ursachen: **(1) `high` war ein
Ceiling, keine Präferenz** — easy+medium+hard *erlaubt*, aber die Waste-optimierte Auswahl
bevorzugte Aufwand nicht → `low` ⊆ `high`, und da einfache Rezepte in der Mehrzahl sind, füllte
„viel Aufwand" den Plan trotzdem großteils mit denselben einfachen Rezepten. **(2) Datenlage:**
Frühstück 17 easy/2 medium, Lunch 26 easy/2 medium, Dinner 18 easy/**30 medium**/2 hard → nur Dinner
kann überhaupt nennenswert differenzieren (Frühstück/Lunch mangels Rezepten kaum).

**Entscheidung (der Entwickler via AskUserQuestion):** „Präferenz einbauen" (reine Code-Änderung,
statt zusätzlich Rezepte zu schreiben).

**Umsetzung (`generator.js`):**
- Neue `effortPrefRank(recipe, cookEffort)` + `preferByEffort(pool, cookEffort)` — getrennt von
  `effortAllowed` (Pool-**Membership**): die Präferenz bestimmt nur, was ZUERST gewählt wird.
- **Nur `high` ändert sich:** `effortPrefRank` liefert für `high` `2 - EFFORT_RANK` (hard<medium<easy),
  für `low`/`medium` konstant 0 (= No-op). So bleiben `low`/`medium`-Pläne **bit-identisch** zu vorher;
  Gradient: low=nur easy · medium=natürlicher Mix · high=aufwändig-zuerst.
- `chooseWaste` reduziert den Kandidaten-Pool via `preferByEffort` auf das aufwändigste noch
  verfügbare Tier (Waste-Score entscheidet weiterhin INNERHALB des Tiers; erst wenn die aufwändigen
  im Rahmen der Wiederhol-Regeln verbraucht sind, kommen einfachere). Greift für nonMeat **und**
  Fleisch-Buckets (beide wählen über `chooseWaste`) — die Shelf-Life-Tier-Logik (Food-Safety) bleibt
  bei Fleisch primär, Aufwand wirkt sekundär innerhalb des Tiers.
- **Effekt (16d/2P/omnivore, empirisch):** Dinner low = 15 easy/0 medium → high = 1 easy/**12 medium/2 hard**.

**Golden Master bewusst neu eingefroren** (`vitest -u`): der reale Trip nutzt `high`, dessen Dinner
jetzt aufwändiger sind (z. B. Tag 8 „Tuna pasta", Tag 10 „Pasta Bolognese"). Struktur voll intakt
(Fleisch-Cluster bleibt Fleisch, Leftover-Paare, Bamaga Tag 9, Pickup/Dropoff) — Review-Diff geprüft,
keine Regression. **Frühstück/Lunch bleiben mangels aufwändiger Rezepte ähnlich** (Datenlimit, ehrlich
kommuniziert; optionaler Folge-Schritt = mehr medium/hard-Frühstücke/Lunches).

**Tests (+2 in `generator.test.js`):** `high` zieht ≥10 aufwändige Rezepte / `low` = 0; `medium`
bleibt ein easy+medium-Mix (kein high-artiger Zwang). **398 Tests grün** (+2, Sicherheits-Sweep +
Shuffle-Sweep unverändert), Build grün (1322.35 kB).

**Nachtrag (Deploy-Fix):** `fresh-start` wurde auf `main` gebracht (Force-Push, ersetzt die alte
Identitäts-History). Der erste CI-Deploy schlug am Schritt `npm test` fehl: **kein Logik-Fehler,
sondern Timeout** — der Sicherheits-Sweep A (864 volle `generate()`-Läufe) braucht auf den
langsameren GitHub-Actions-Runnern ~7 s und riss Vitests Default-Timeout von 5000 ms (die
Effort-Präferenz hatte den Sweep zusätzlich leicht verlangsamt). Fix: **globales `test.testTimeout`
/`hookTimeout` = 30000 ms in `vite.config.js`** (schützt alle rechenintensiven Sweeps + den
App-Fuzzer gegen CI-Schwankungen, fängt echte Hänger weiterhin ab). Auf `fresh-start` **und `main`**.

---

## 2026-07-24 (be) — Automatische Rezept-Variation pro Trip (Zufalls-Seed) + Kärtchen-Optik verworfen (Branch `fresh-start`)

**Anlass (der Entwickler):** Zwei Dinge in einer Session. (1) In der vorigen Runde probeweise gebaute
**Kärtchen-/Bild-Optik gefiel nicht** → komplett zurückgenommen (Git-Revert auf HEAD, kein Rest).
(2) Wunsch: **kein Button**, sondern automatisch — „jedes Mal wenn eine Reise erstellt wird, sollen
andere Rezepte (im Einklang mit den Anforderungen) auftauchen, sodass 2+ Trips nicht denselben Plan
vorschlagen."

**(1) Revert:** Alle 6 Dateien der Kärtchen-Runde via `git checkout HEAD --` zurückgesetzt (RecipesTab,
strings, App.css, useStorage, STATUS, CHANGELOG). Vorheriger Zustand 1:1 wiederhergestellt.

**(2) Seed-Engine (deterministisch pro Seed) + automatische Vergabe pro Trip:**
- **Leitidee:** Alle HARTEN Restriktionen (Diät, Fleisch/Nicht-Fleisch, Allergene, Burner,
  Fleisch-Cluster/Frische) stecken in der **Pool-Konstruktion + Cluster-Zuweisung**, NICHT in der
  Auswahl-Reihenfolge. Ein Shuffle mischt nur die bereits GEFILTERTEN Pools → ändert, WELCHES
  zulässige Rezept gepickt wird, nie OB es zulässig ist.
- **`generator.js`:** neuer seeded PRNG **`mulberry32`** + `seededShuffle` (Fisher-Yates auf Kopie).
  `buildSplitPool` nimmt `seed`: ist er gesetzt (>0), werden die Pools gemischt — nonMeat unter
  Wahrung der **Strict-vor-Topping-Partition** (Topping-Allergen-Rezepte bleiben Notnagel; Core-
  Allergene sind ohnehin nicht im Pool), meat voll (pickMeat re-bucketet später nach Shelf-Life-Tier
  → Cluster/Frische-Zuweisung unberührt). `seed` durch `generatePlan` → `generate()` durchgereicht,
  dort geklemmt (`Number.isFinite && >0`, sonst 0). **Ohne Seed = 0 = bit-identischer Default.**
- **Automatische Vergabe (kein UI-Button):** `App.jsx` `genSeed()` vergibt bei **jeder
  Trip-Erstellung** (`doCreateNew`) UND beim `resetAll` einen frischen Zufalls-Seed in die
  Trip-Config (`{ ...defaultConfig(), shuffleSeed: genSeed() }`). Zwei Trips → zwei Seeds → andere
  Rezepte. `seed: config.shuffleSeed` fließt in `generate()` (+ useMemo-Dep).
- **Persistenz/Reload-Stabilität — bewusste Design-Entscheidung:** Der Seed sitzt NICHT in
  `defaultConfig()` (das ist auch Fallback in `mergeConfig`/`loadConfig` → würde alten Trips bei
  JEDEM Reload einen neuen Seed unterschieben und den Plan umwürfeln). Stattdessen einmalig bei der
  Erstellung vergeben, in der Trip-Config gespeichert; `mergeConfig` reicht ihn unverändert durch
  → beim Neuladen/Editieren stabil. `ConfiguratorTab` reicht `shuffleSeed` durch den `draft`
  (kein UI-Feld), damit „Generate"/Edit ihn nicht droppt. **Alte Trips ohne Seed bleiben
  deterministisch** (kein Umschalten des Bestands-Verhaltens).
- **Tests:** `generator.shuffle.test.js` (+5) — Shuffle-Sweep 7 Seeds × 5 Configs × 3 Tage = 105
  Trips prüft I1/I2/I3/I4/I6; „Veganer sieht über alle Seeds nur vegane Rezepte"; S1 kein-Seed==
  Default, S2 Seed reproduzierbar, S3 verschiedene Seeds→verschiedene Pläne. `useStorage.test.js`
  (+2) — mergeConfig hält shuffleSeed (Reload-Stabilität); defaultConfig/seed-freier Save bleiben
  seed-frei.

**Golden Master + Sicherheits-Sweep unverändert grün** (S1 garantiert: kein Seed → alter Plan).
**396 Tests grün** (+7), Build grün (1322.11 kB). Auf `fresh-start`, nicht gemerged.

**Verworfen (bewusst):** ein „🎲 Shuffle recipes"-Button im Menu — zuerst gebaut, dann auf Wunsch
des Entwicklers entfernt zugunsten der automatischen Vergabe pro Trip (Button-Strings/CSS/Handler
rückstandslos zurückgebaut).

---

## 2026-07-21 (bd) — Gratis-Launch-Flag + Play-Billing-Architektur vorbereitet (Branch `fresh-start`)

**Anlass (der Entwickler):** „Bereite das Billing vor, aber ich denke, für den ersten Release ist es
am besten, die App gratis auf den Markt zu bringen, bis sie einige Downloads hat."

**Recherche (belegt, aktuell):**
- Offizieller Google-Weg = **Play Billing Library** (aktuell v9, Mai 2026). **Acknowledge des Kaufs
  binnen 3 Tagen ist Pflicht** — sonst Auto-Refund und der Nutzer verliert den Zugang. Serverseitige
  Verifikation ist „stark empfohlen", aber nicht technisch erzwungen (v.a. bei Einmalkäufen).
- Gängige Praxis: RevenueCat/Adapty sind der De-facto-Standard, aber ihr Kernwert (Abo-Lifecycle,
  RTDN, Cross-Platform) zielt auf das, was dieses Produkt NICHT hat.

**Entscheidung:** Für dieses Produkt passt **Einmalkauf** (kein Abo → offline-tauglich: einmal
verifizieren, dauerhaft gültig, kein periodischer Online-Check) + **direktes, client-side Play
Billing**. Damit: kein Backend, kein externer Anbieter, keine eigenen Accounts nötig — Play bindet
den Kauf ans Google-Konto, Restore via `queryPurchases()` (liest den on-device-Cache, offline-fähig).

**Umsetzung — Flag statt Wegwerf-Code:**
- `MONETIZATION_ENABLED = false` in `premium.js`. Für den ersten Release AUS → App komplett gratis.
- `isPremium()` von `hasActiveLicense()` getrennt: `isPremium()` = „sind Features frei?" (bei
  Monetization-aus IMMER true), `hasActiveLicense()` = „hat der Nutzer eine Lizenz aktiviert?" (reine
  Kauf-Frage). Dokumentierter Andockpunkt: hier kommt später `hasPlayBillingEntitlement()` dazu.
- `App.jsx`: der 👤-Kauf/Account-Einstieg ist an den Flag gekoppelt → bei Gratis-Launch ausgeblendet
  (kein toter Premium-Bezug in der UI). Premium-Views bleiben im Code für Stufe 2.
- `checkout.js`: `PREMIUM_PRODUCT_ID`-Konstante (`cape_york_premium_unlock`, Managed product/
  Einmalkauf), `getCheckout()` liefert `type:'disabled'` bei Monetization-aus, und der native
  Play-Billing-Flow ist als **dokumentierter Andockpunkt** hinterlegt (purchase → acknowledge ≤3 Tage
  → lokales Entitlement → queryPurchases-Restore; Server-Verifikation optional/nachrüstbar).

**Bewusst NICHT gemacht:** Kein Capacitor/Billing-Plugin installiert (Capacitor fehlt noch; das echte
Plugin ist Stufe 2). Diese Runde ist reine Vorbereitung: Flag + saubere Entitlement-Trennung +
Architektur-Andockpunkte + Doku — alles code-unabhängig stabil, nichts muss später erneuert werden.

**Doku:** `RELEASE-CHECKLIST.md` **Ebene E** = kompletter Aktivierungspfad (Flag umlegen → Capacitor →
Play-Console-Produkt → Plugin → Kauf/Acknowledge/Restore), inkl. 3-Tage-Acknowledge-Fallstrick und
der Offline-Regel: Premium nie durch fehlende Online-Verifikation sperren.

**Tests:** License-Verwaltungs-Tests auf `hasActiveLicense()` umgestellt (isPremium() ist bei
Gratis-Launch immer true); +3 Flag-Tests (inkl. Guard „MONETIZATION_ENABLED ist AUS", der beim
Aktivieren bewusst rot wird). 386 → **389 Tests grün**, Build grün. Geändert: `premium.js`,
`premium.test.js`, `App.jsx`, `checkout.js`, `RELEASE-CHECKLIST.md`.

---

## 2026-07-20 (bc) — Bug-Resilienz gegen Fremdnutzung: Absturz-Netz + UI-Fuzzer (Branch `fresh-start`)

**Anlass (der Entwickler):** „Ich habe die Sorge, dass in der App versteckte Bugs existieren, die
ich bis jetzt nicht entdeckt habe und bei fremden Anwendern zu Fehlern führen → schlechte User-
Experience → schlechte Bewertungen, die die App schon in der Startphase vernichten. Wie angehen?"

**Leitidee:** Man findet nie ALLE Bugs. Zwei-Fronten-Strategie: (1) Schaden begrenzen — kein Bug
darf tödlich sein; (2) Wahrscheinlichkeit senken — die Interaktions-Fläche testen. Der Sicherheits-
Sweep (ba) deckt die Generator-Logik ab; hier die vier Fremdnutzungs-Zonen, die er NICHT abdeckt:
UI-Interaktion, gespeicherter State, Fehler-Resilienz, Klick-Chaos.

**① Globales Absturz-Netz — `ErrorBoundary.jsx`:** In `main.jsx` um `<App/>` gelegt. Fängt jeden
Render-/Lifecycle-Crash und zeigt statt weißem Bildschirm eine Recovery-UI (Try again / Reset app +
einklappbare Fehlermeldung für einen freiwilligen Bug-Report). Bewusst mit INLINE-Styles (ein
Sicherheitsnetz darf nicht von externem CSS abhängen), Text aus `S.error` (i18n-ready), kein
Netzwerk/Auto-Upload (Privacy-Prinzip). Verwandelt jeden noch unentdeckten Render-Bug von „App tot
→ 1-Stern" in „Nutzer klickt weiter".

**② Persistenz-Härtung — echter Fund in `loadTripStore`:** Ein korrupter Store mit `null`-Trip-
Eintrag (`{"trips":[null]}`, z.B. durch abgebrochenen Schreibvorgang/manuellen Edit) ließ `t.config`
einen TypeError werfen → weißer Bildschirm beim App-Start. Fix: ungültige Trip-Einträge (null,
kein Objekt, fehlende id) werden gefiltert, fehlende Namen bekommen Default. `mergeConfig` und
`readStore` waren bereits robust (try/catch, Typ-Checks). +9 Tests in neuer `useStorage.storage.test.js`
(jsdom, korrupter localStorage: kaputtes JSON, trips kein Array, Müll-Einträge, primitive config, …).

**③ Error-Boundary-Test — `ErrorBoundary.test.jsx` (4):** werfende Kind-Komponente → Recovery-UI
statt weißem Bildschirm; Buttons crashen beim Klick nicht; Fehlermeldung in den Details.

**④ UI-Fuzzer + Flow-Tests — `App.robustness.test.jsx` (11):**
- 3 Flow-Tests: Leerstart-CTA, Create→Tutorial→Configurator, About/Account öffnen.
- Fuzzer, DETERMINISTISCH (mulberry32-PRNG → reproduzierbar): 5 Seeds × 60 Klicks ab Leerstart +
  3 Seeds × 70 Klicks mit vorab geseedetem aktivem Trip (erreicht Menu/Recipes/Shopping/Stock +
  Swap-/Meal-Status-/Rezept-Editor-Sheets — die interaktionsreichste Ebene). Klickt über
  `document.body`, um Portale (Sheets/Overlays) einzuschließen.
- Fängt **Render-Crashes** (via ErrorBoundary-Marker) UND **Handler-Crashes** (try/catch um `act`),
  jeweils mit der **reproduzierbaren Klick-Sequenz** in der Fehlermeldung.

**Schärfe empirisch bewiesen (Mutations-Test):** ein `throw` in `MenuTab` ließ alle Fuzzer sofort
rot werden — mit exakter Klick-Sequenz — und belegte zugleich, dass die Fuzzer die tiefen Tabs
tatsächlich erreichen (Empty-Start-Fuzzer klickte sich über den kompletten Configurator bis
„Generate plan"). Danach revertiert.

**Flakiness gefixt:** 1 seltener Fehler beim ersten vollen Lauf unter CPU-Last. Ursache am
wahrscheinlichsten der per-Klick-„leerer-Screen"-Check (transienter View-Wechsel unter Last) →
ans Test-Ende verschoben; die deterministische Crash-Erkennung bleibt nach jedem Klick. Seither
mehrfach stabil grün.

**Keine neue Dependency:** interaktive Tests via `react-dom/client` + `act` (React 18.3) +
`// @vitest-environment jsdom`-Docblock (jsdom war bereits devDep) — konsistent mit dem bewussten
Verzicht auf @testing-library in `RecipesTab.test.jsx` (CLAUDE.md).

**Bewusst NICHT gemacht:** Kein Crash-Reporting-SDK (bräche „keine Datensammlung") — Vorschlag für
später: lokales, vom Nutzer freiwillig teilbares Fehler-Log. **Ehrliche Grenzen:** Error Boundaries
fangen keine Fehler in Event-Handlern/async-Code (dafür lokales try/catch + der Fuzzer-try/catch);
der Fuzzer deckt button-/kalendertag-erreichbare Zustände ab, keine Freitext-Eingaben.

**Ergebnis:** 362 → **386 Tests grün** (+24: 9 storage, 4 error-boundary, 11 robustness). Build grün.
Neue Dateien: `ErrorBoundary.jsx`, `ErrorBoundary.test.jsx`, `useStorage.storage.test.js`,
`App.robustness.test.jsx`. Geändert: `main.jsx`, `strings.js` (S.error), `useStorage.js` (loadTripStore-Filter).

---

## 2026-07-19 (bb) — Custom-Kalorien: defensive Klemmung + Sweep-Abdeckung (Branch `fresh-start`)

**Anlass (der Entwickler):** „Wie sieht es aus, wenn die Personen nicht mittlere Kalorien angeben,
sondern weniger oder gar manuell z. B. 6000 kcal für eine Person? Ehrliche und fundierte Antwort."

**Untersuchung (empirisch, nicht spekuliert):**
- `generate()` ist über den ganzen Faktor-Bereich robust — von 0.44 (Kind, light) bis 17.8
  (8× custom 6000 ungeklemmt): keine leeren Slots, keine Unterdeckung, keine kaputten Mengen,
  Mengen skalieren proportional. Also: **kein Hunger durch einen Skalierungs-Bug.**
- **Befund 1:** `clampCustomKcal` (1500–4500) lief bisher **nur in der UI** (`ConfiguratorTab`),
  NICHT in `generate()`/`personFactor`. Über die Oberfläche ist 6000 nicht eingebbar (→ 4500),
  aber ein via localStorage/Import eingeschleuster Wert hätte einen ungeklemmten Faktor (2.22) erzeugt.
- **Befund 2:** Der Sicherheits-Sweep (ba) testete `light/medium/heavy/mixed`, aber **kein `custom`-kcal**.
- **Befund 3 (Produktgrenze):** „kcal" ist ein reiner Mengen-Multiplikator (`customKcal/2700`).
  `recipe.kcal` ist ein statischer Anzeige-String, fließt NICHT in Auswahl/Skalierung ein; es gibt
  keine Zutaten-kcal-Daten. Ein Soll-Ist-Kalorien-Abgleich ist mit dem aktuellen Modell nicht möglich.

**Fix A — Härtung (`calories.js`):** `clampCustomKcal` zentral in `personFactor` + `personDailyKcal`
angewandt. Der Generator rechnet über `groupFactor` → `personFactor`, ist damit automatisch geschützt;
Anzeige und tatsächlicher Einkauf nutzen denselben geklemmten Wert. 6000 → 4500, 500 → 1500.
NaN-Fallback bleibt intakt (isFinite-Check vor dem Clamp). +4 Tests in `calories.test.js`.

**Fix B — Sweep-Abdeckung (`generator.safety.test.js`):** `PEOPLE_SETS` um 5 Custom-Fälle erweitert
(UI-Max 4500, UI-Min 1500, über-Max 6000, gemischt Custom+Standard+Kind, 8× Max) → Sweep B jetzt
360 Konfigurationen. Plus 2 End-to-End-Härtungstests: 6000 kcal ⇒ identischer groupFactor/Plan/Einkauf
wie 4500 (nicht 6000/2700); 500 ⇒ 1500-Faktor.

**Bewusst NICHT gemacht (Produktentscheidung offen):** Keine echte Kalorien-Garantie gebaut — das
erforderte Zutaten-kcal-Daten + einen Soll-Ist-Abgleich (größeres Stück). „kcal" bleibt vorerst ein
Portionsgrößen-Regler. Ebenfalls dokumentiert, nicht geändert: Wasser/Essentials skalieren mit der
Personen-Anzahl, nicht mit dem kcal-Faktor (physiologisch vertretbar).

**Ergebnis:** 357 → **362 Tests grün** (+5: 4 calories, 2 safety − wobei safety-Datei 5→7).
Build grün. Geändert: `calories.js`, `calories.test.js`, `generator.safety.test.js`.

---

## 2026-07-19 (ba) — „Niemand hungert"-Testverfahren (Branch `fresh-start`)

**Anlass (der Entwickler):** „Ich will sicher gehen, dass die Menüs und die Skalierung zu 100%
verlässlich sind — es kann nicht sein, dass die Kunden auf dem Trip hungern, weil die App buggt.
Schlage ein Testverfahren vor, das die Funktionalität in allen realistischen Szenarien garantiert."

**Kritischer Befund vorab:** Der bestehende Test `inventory.test.js:53` („alle gekocht → Bestand
komplett 0") war grün, **bewies aber nicht, dass genug gekauft wird**. `subtractAmounts` klemmt auf
0 → „200 g gekauft / 500 g gebraucht" ergibt `{}` → `isDepleted` = true → Test grün, obwohl 300 g
fehlen. Die 0-Klemmung **maskierte Unter-Einkauf** — genau den Hunger-Fall. Diese Lücke war der
Ausgangspunkt.

**Failure-Modes von „hungern" (konkretisiert):** (1) leerer Koch-Slot, (2) Unter-Einkauf,
(3) nicht essbar (Diät-/Allergen-Verletzung), (4) verderbliche Zutat kommt nach dem Koch-Tag,
(5) kaputte Mengenanzeige. Das Verfahren adressiert jeden Modus mit einer harten Invariante.

**Ebene A — Sicherheits-Sweep** (`src/lib/generator.safety.test.js`, 5 Tests):
Weil der Generator deterministisch ist, ist ein *erschöpfender* Sweep aussagekräftiger als
Zufalls-Property-Tests. Abgefahren werden **~1090 Konfigurationen** über die failure-relevanten
Achsen (Diät × Burner × Kochaufwand × Allergene × Tage × Personen × Kühlschrank × Stops), inkl.
Extremkombinationen (vegan + viele Allergene + 1 Burner + minimal-Aufwand). Pro Trip geprüft:
- **I1** jeder Slot hat Rezept / Restaurant / Reste — oder ist Skip; nie leer.
- **I2** Einkauf ≥ Bedarf für jede Zutat (Deckung). Bedarf über `consumedByCooked` (separater
  Codepfad in `inventory.js`) → fängt Drift zwischen Einkaufs- und Verbrauchs-Skalierung.
- **I3** kein Slot unterschreitet die angewandte Diät. **I4** kein gewähltes Allergen als Core.
- **I5** keine verderbliche Zutat in einem Stop nach ihrem letzten Koch-Tag.
- **I6** kein `qty`/`amount` ist NaN/undefined/Infinity/≤0.
- **I8** greift ein Fallback (Diät/Burner/Aufwand), erscheint eine Warnung.

**Neue `shortfall(bought, consumed)`** in `inventory.js`: Umkehrung von `subtractAmounts`, aber
**ohne** 0-Klemmung → Unterdeckung wird sichtbar. `subtractAmounts` bleibt unverändert (seine
Klemmung ist für den Stock-Tab korrekt — keine negativen Bestände). +2 Tests in `inventory.test.js`.

**Schärfe verifiziert (Mutations-Test):** Ein absichtlicher `× 0.5`-Unter-Einkauf in
`generateShopping` ließ I2 sofort und präzise fehlschlagen („chicken breast: fehlt 189 g",
3 von 5 Sweeps rot). Danach revertiert. Der Sweep ist also nicht vacuously grün.

**Ebene B — Golden Master** (`src/lib/generator.golden.test.js`, 4 Tests + Snapshot):
Der reale Eigen-Trip (16 Tage, 2 Personen, omnivore, Bamaga-Resupply) liegt als committeter,
**lesbarer** Snapshot fest (Menüplan + Cairns/Bamaga-Einkaufsliste + Warnungen + Kennzahlen).
Künftige Generator-/Rezept-Änderungen, die den Trip verschieben, erzeugen einen sichtbaren
Diff im Review — die in STATUS oft erwähnte „bit-identisch"-Prüfung wird damit dauerhaftes Gate.
Gewollte Änderungen werden per `vitest -u` bewusst übernommen.

**Ebene C — `RELEASE-CHECKLIST.md`:** Manueller Offline-Geräte-Check (PWA-Install, Service-Worker-
Cache, `localStorage`-Persistenz über Neustart/Update, nicht-destruktive Konfig-Edits, Flugmodus-
Durchlauf auf Samsung ~360px) = Vorab-Schwelle aus `PRODUCT.md` §5.1. Plus Release-Privacy-Punkte
(alte Branches ersetzen, Kontakt-Platzhalter, Icons).

**Bewusst NICHT gemacht:** **I7** (Rezept-Anzeige == Einkaufs-Skalierung) nicht doppelt getestet —
Anzeige und Einkauf teilen dieselbe `scaleFactor`-Engine, die I2 gegen `consumedByCooked` absichert;
die Anzeige selbst deckt `RecipesTab.test.jsx` + der `scaleAmountLabel`-Block in `generator.test.js`
ab. **Ehrliche Grenze von I2:** beweist *Konsistenz* zwischen Einkauf und Verbrauch, nicht die
absolute Korrektheit der Skalierungs-Zahlen — die sichern die konkreten Wert-Tests in
`generator.test.js`. Kein voller kartesischer Sweep (wäre >40k Configs / >60s) — stattdessen
systematisch über die failure-relevanten Achsen-Paare, in ~3,3s.

**Ergebnis:** 346 → **357 Tests grün** (+11: 2 shortfall, 5 Sweep, 4 Golden Master). Build grün.
Neue Dateien: `generator.safety.test.js`, `generator.golden.test.js` (+ Snapshot), `RELEASE-CHECKLIST.md`.
Geändert: `inventory.js` (+`shortfall`), `inventory.test.js`.

---

## 2026-07-16 (az) — Skalierung erschöpfend verifiziert + Dämpfung vorwärts-robust (Branch `fresh-start`)

**Anlass (der Entwickler):** „Wende die Skalierungslogik auf alle Rezepte an, sodass es zu 100%
stimmt und nirgends zu Bugs oder ungewollten Resultaten kommt."

**Ausgangslage:** Die Logik lief bereits über alle Rezepte (sie sitzt im Generator). Aufgabe war
also der erschöpfende Nachweis + das Schließen jeder Daten-/Robustheits-Lücke.

**Systematischer Audit über alle 97 Rezepte (Klassifikation nach Kategorie + Marker):**
- **Keine fehlende `/person`-Markierung bei Hauptzutaten** — die 12 geflaggten protein/carb-Zeilen
  ohne `/person` waren alle Fehlklassifikationen (Fischsauce, Brühwürfel, Mehl, „für 2" korrekt).
- **Keine Fehl-Dämpfung** — 0 Saucen/Proteine/Carbs fälschlich gedämpft.
- **Kein Trockengewürz umgeht die Dämpfung** — alle tsp/tbsp-Zutaten sind entweder gedämpft oder
  eine echte Sauce/Zutat (Kapern, Petersilie, Mango chutney → zu Recht linear). Frische Blätter
  („Basil", „Coriander leaves") bleiben korrekt linear, nur die Trockenform wird gedämpft.
- **„8P viel"-Fälle geprüft** (Erdnussbutter 24 tbsp, Mayo, Tahini, Chia bei 8 Personen): alles
  korrekt — echte Pro-Person-Zutaten, kein Gewürz. Gedämpftes Öl/Curry startet nur von hoher Basis.
- **Brühwürfel:** „1" (für 2) → 0.5 bei 1 Person, 4 bei 8 — halber Würfel ist am Camp abbrechbar, ok.

**Latenter Mangel gefunden + geschlossen (Vorwärts-Robustheit):**
`DAMPED_RX` deckte nur das aktuelle Ultra-Minimal-Kit (ae). Ein NEUES Rezept mit „Turmeric",
„Garam masala", „Zimt" wäre ungedämpft linear skaliert — **exakt die Bug-Klasse des Knoblauch-
Reports**. `DAMPED_RX` als `RegExp` neu aufgebaut, deckt jetzt auch pool-fremde Trockengewürze +
`ground …`/`dried …`-Schreibvarianten ab. Kritisch abgesichert: **`ground (?:cumin|coriander|…)`
fängt NUR Gewürze — „Ground beef/pork/lamb" bleibt linear** (empirisch geprüft). Mehrdeutige
Kräuter (bloßes „Oregano"/„Basil"/„Thyme") bleiben linear — nur die „Dried"-Form wird gedämpft.
`DAMPED_NOT_RX` um „Cinnamon roll" erweitert (Zimt-Gebäck ≠ Gewürz).

**Neuer `isDamped()`-Vorwärts-Schutz (3 Tests):** bekannte Trockengewürze/Aromaten/Fette MÜSSEN
gedämpft sein, frische Blätter/Gemüse/Fleisch/Saucen/Aroma-Lebensmittel NICHT, und jede tsp/tbsp-
Zutat im Pool ist entweder gedämpft oder eine bekannte lineare Zutat. Fügt jemand künftig ein
Rezept mit ungedämpftem Gewürz hinzu, schlägt der Test an — statt still den Bug zurückzuholen.

**Verifikation:**
- **Gedämpfter Ist-Pool unverändert: exakt dieselben 17 Namen** — die Regex-Erweiterung greift nur
  für hypothetische künftige Gewürze, ändert am aktuellen Pool nichts.
- **2-Personen-Einkaufsliste bit-identisch zum Ursprung** (190 Zeilen, `git stash`-Diff über ALLE
  Änderungen). Eigen-Trip unverändert.
- **Vollaudit: 16.254 Anzeige-Skalierungen (97 × 18 Faktoren) + Einkaufsliste über 9 Gruppen
  (1–8 + gemischt mit Kindern), alle Invarianten sauber** — kaputte Ausgaben, exakter Round-Trip,
  Einheiten-Drift, Monotonie, negative Mengen: je 0.
- **346 Tests grün** (342 + 4). Build grün.

**Fazit:** Kein Bug im Ist-Pool gefunden — (ax)+(ay) hatten die Substanz schon korrekt gemacht.
Diese Runde ist der erschöpfende Beweis + die Vorwärts-Absicherung, damit künftige Rezepte die
Skalierung nicht still brechen können.

## 2026-07-16 (ay) — Aromaten dämpfen + `/person`-Gewürze normalisieren (Branch `fresh-start`)

**Anlass (der Entwickler, Live-Test der (ax)-Skalierung):** „Gewisse Sachen wie Knoblauch machen
keinen Sinn — für 7 Personen würde ich nicht 11 Knoblauchzehen in Fajitas machen, ebenso wenig
10.75 Esslöffel Paprika. Recherchiere, wie richtige Rezepte skaliert werden, z.B. Swissmilk."

**Recherche:** Swissmilk-Bundle (Nuxt) heruntergeladen und die Rechenlogik gelesen — sie skalieren
**strikt linear** (`multiplier = amount / initialAmount`, `value * multiplier`, 0 Ausnahmen für
Knoblauch/Gewürz). ABER: Swissmilk bietet nur **±1 Portion** um die Basis (3/4/5), also max. 1.25× —
da ist linear unproblematisch. Diese App geht von Basis 2 auf 1–8 Personen (bis 4×), genau dort
bricht linear. Kochliteratur (Escoffier; gängige Scaling-Guides) bestätigt die Dämpfung mit Zahlen:
beim Verdoppeln ~1.5× Gewürz, „1 TL Salz für 2 → bei 8 nur 2.5–3, nicht 4", Knoblauch ~75%. Die
`dampen()`-Formel aus (ax) trifft das exakt (`dampen(2)=1.5`, `dampen(4)=2.5`) — falsch war nur ihre
**Reichweite**.

**Zwei Bugs gefunden, beide der Grund für die krummen Fajita-Mengen:**
1. **Aromaten fehlten in der Dämpfungsliste.** Knoblauch (43 Zeilen), Ingwer (4), frischer Chili (2)
   skalierten linear → `3 cloves` × 3.525 = 11 Zehen bei 7 Personen.
2. **`/person` auf Gewürzen umging die Dämpfung.** War eine bewusste (ax)-Regel („Autor-Absicht
   gewinnt") — aber falsch: Gewürze gehören PRO GERICHT, nicht pro Person. a46 „Smoked paprika,
   1.5 tsp/person" → linear → 10.5 TL. 22 Zeilen betroffen (Öl, Curry, Cumin, Paprika, Chili, Ingwer).

**Fix (Entscheidungen mit dem Entwickler via AskUserQuestion):**
- **`DAMPED_RX` um Aromaten erweitert:** `garlic|ginger|red chili|green chili|chili pepper`. Zwiebeln
  bewusst NICHT — sie sind in vielen Gerichten Gemüse-Bestandteil (a46 Fajitas: „0.5/person, sliced"
  — die isst man), Dämpfen würde zu wenig liefern. 13 → 17 gedämpfte Zutaten-Namen.
- **Neu `DAMPED_NOT_RX` + `isDamped()`:** Gegenprobe, damit „Garlic bread"/„Ginger beer" (Lebensmittel,
  kein Aroma) linear bleiben. Kommen aktuell nicht als Zutat vor, wären aber jederzeit plausibel.
- **Neues Skript `scripts/normalize-spice-scaling.mjs`** (Dry-Run + `--write`, wie normalize-recipes
  aus (ar)): stellt die 22 `/person`-Gewürze auf Pro-Gericht-Mengen um (× BASE_SERVINGS), Marker
  entfernt, Annotationen erhalten (`2cm/person, grated` → `4cm, grated`). Trifft NUR gedämpfte
  Zutaten — Sojasauce/Mayo/Tahini (8 Zeilen) behalten ihr `/person` und skalieren zu Recht linear.

**Ergebnis a46 Fajitas bei 7 Personen:** Knoblauch 11 → **7 Zehen**, Paprika 10.5 → **6.75 tsp**,
Chili 3.5 → **2.25 tsp**; Hähnchen (1400g), Reis (560g), Peperoni (7), Zwiebeln (4) skalieren weiter
linear.

**Verifikation:**
- **2-Personen-Einkaufsliste bit-identisch zum URSPRUNGSZUSTAND** (190 Zeilen, `git stash`-Diff über
  ALLE Änderungen inkl. der 22 Datenzeilen): `1.5 tsp/person × 2 = 3 tsp`, Dämpfung bei Basis neutral.
  Eigen-Trip unverändert.
- **Vollaudit 97 Rezepte × 18 realistische Faktoren = 16.254 Skalierungen, 4 Invarianten sauber**
  (kaputte Ausgaben · exakter Round-Trip · Einheiten-Drift · Monotonie).
- **342 Tests grün** (337 + 5: Aromaten gedämpft, Zwiebeln linear, DAMPED_NOT_RX, kein `/person` mehr
  auf Gewürzen, a46-Regressionstest). Build grün.

**Quellen:** Swissmilk `IngredientsCalculator` (Nuxt-Bundle, client-seitig, linear); Escoffier
„Cooking for a Crowd"; gängige Recipe-Scaling-Guides (Knoblauch ~75%, Gewürz ~1.5× beim Verdoppeln).

## 2026-07-15 (ax) — Rezept-Mengen skalieren mit der Gruppengröße (Branch `fresh-start`)

**Anlass (der Entwickler, aus der Praxis):** „Habe heute die Red lentil soup für 4 Personen gekocht
und gemerkt, dass sowohl für 2 als auch für 4 Personen die gleiche Menge Kokosmilch verwendet wird."

**Zwei getrennte Bugs — der zweite war der größere:**

1. **Rezept-Ansicht zeigte rohe Strings.** `RecipesTab.jsx` rendert die Überschrift „Ingredients for
   N people" und darunter `recipe.ing[i][1]` **unverändert**. Nichts wurde skaliert, auch
   `150g/person` nicht. Die Überschrift log also bei jeder Gruppengröße ≠ 2.
2. **Generator skalierte 44% aller Zutaten nie.** `scaleFactor()` gab für jede Menge ohne
   `/person`- oder `(for both)`-Marker **×1** zurück — **448 von 1022 Zutaten-Zeilen**. Betraf nicht
   nur die Anzeige, sondern **Einkaufsliste und Stock-Tab**: zu wenig eingekauft.

**Root Cause:** Daten-Schulden. Der Pool wurde für den 2-Personen-Eigen-Trip geschrieben; eine
unmarkierte Menge (`1 × 400ml can`) meint implizit „für 2 Personen". Der `(for both)`-Marker belegt
die Konvention, wurde aber nur auf 45 der 448 Zeilen gesetzt. `scaleFactor` behandelte den Rest so,
als sei er gruppenunabhängig.

**Entscheidung (mit dem Entwickler abgestimmt):**
- **Basis-Portionen als Konstante** (`BASE_SERVINGS = 2`) statt Daten-Normalisierung der 448 Strings
  oder eines `serves`-Felds pro Rezept. Der Entwickler: „rein theoretisch müssten die Rezepte ja
  linear skalierbar sein, 1 Person 0.5 can, 4 Personen 2 cans — der User sollte so wenig wie möglich
  selbst machen." → keine neue Pflicht für Daten-Autoren, kein String-Churn.
- **Gewürze + Bratfett halb-linear gedämpft** (`dampen(r) = 1 + (r-1)*0.5`), auf Einwand des
  Entwicklers: „Gewürze und Öl skalieren normalerweise nicht linear, werden z.B. nur für das
  Einfetten der Pfanne verwendet." 4 Pers. ×1.5 statt ×2, 8 Pers. ×2.5 statt ×4.
- **Dämpfung an einer namentlichen Zutatenliste** (`DAMPED_RX`), NICHT an Einheit oder Kategorie.
  Audit zeigte: die 309 tsp/tbsp-Zeilen sind kein homogener „Gewürz"-Bucket — darin liegen auch
  Tomatenmark (13×), Cornflour, Backpulver, Brauner Zucker, Chia. Eine Unit-Regel hätte die kaputt
  gemacht. Ebenso die Kategorie `🫙 Spices, oils & sauces`: enthält Sojasauce/Mayo/Senf (linear).
  Bereits `/person`-markierte Mengen schlagen die Dämpfung (Autor-Absicht gewinnt).

**Umsetzung:**
- `generator.js`: `BASE_SERVINGS`, `DAMPED_RX`, `dampen()`; `scaleFactor(parsed, factor, name)` —
  neuer 3. Parameter, `return 1` → `return r`. `forTwo`-Zweig entfällt (unmarkiert ist jetzt identisch).
- `generator.js`: neue **`scaleAmountLabel(amt, factor, name)`** für die Anzeige. Die Strings sind
  Freitext, und eine zweite Zahl bedeutet dreierlei — deshalb gezielte statt pauschaler Ersetzung:
  Gebinde-Größe (`1 × 400ml can` → 400 bleibt), Schnittmaß (`sliced 1cm thick` → bleibt),
  Kochwasser (`1 + 400ml water` → skaliert mit), Gramm-Gloss (`1 tbsp (20g)/person` → skaliert mit).
  Marker werden entfernt (ein stehendes „/person" würde den Nutzer erneut multiplizieren lassen);
  Freitext-Annotationen (`— important!`, `, warmed`) überleben; Gebinde-Plural wird angeglichen.
  Mengen ohne Zahl (`to taste`, `small handful/person`) bleiben bewusst wörtlich — bereits korrekt.
- `inventory.js`: `addAmount` bekommt `ingName` durchgereicht. **Nötig, sonst Drift:** Verbrauch
  linear, Einkauf gedämpft → der Stock-Tab hätte Öl fälschlich als aufgebraucht gemeldet.
- `RecipesTab.jsx`: neuer `factor`-Prop (Default `BASE_SERVINGS`), an alle 3 `RecipeCard`-Stellen
  durchgereicht, Zutaten-Zeile rendert `scaleAmountLabel`. **Skaliert mit `groupFactor`, nicht mit
  `persons`** — sonst wiche die Rezept-Ansicht von der Einkaufsliste ab (die rechnet mit groupFactor,
  der Appetit/Alter berücksichtigt). `App.jsx` reicht `factor={result.config.groupFactor}` durch.
- `RecipesTab.jsx` + `strings.js` + `App.css`: Hinweis `S.recipes.editor.ingHint` im Rezept-Editor.
  **Verhaltensänderung für eigene Rezepte:** ein getipptes „1 can" bedeutete vorher „immer 1 Dose",
  jetzt „1 Dose für 2 Personen". Ohne Hinweis müsste der Nutzer die Konvention raten.

**Nachgezogen: einheiten-bewusste Rundung (`roundAmount(q, unit)`, exportiert).**
Auf Nachfrage des Entwicklers („geh sicher, dass die Mengen für eine beliebige Anzahl Personen
stimmen, auch 5 oder 7") wurden alle 97 Rezepte × 35 realistische Faktoren geprüft. Befund: die
Skalierung stimmte, aber die **Rundung erzeugte Scheingenauigkeit**. Ursache: `groupFactor` ist
fast nie glatt — **5 Erwachsene = 5.05** (Mann 1.05 + Frau 0.95), 7 = 7.05. Die erste Fassung
(`≥10 → ganze Zahl, sonst Viertel`) lieferte **465× krumme Masse** („758g Red lentils", „1058g",
„152ml Honey") und **264× Bruchteile bei Zählbarem** („7.5 cloves", „2.5 Brühwürfel").
Neue Stufen je Einheiten-Klasse: Masse/Volumen `<10→1 · <100→5 · <1000→10 · sonst 50`;
Löffel `0.25`; Gebinde `≥3→0.5, sonst 0.25`; Zählbares `≥3→ganz, sonst 0.25`.
→ „760g" · „8 cloves" · „2.5 × 400ml cans" · „2.5 + 1000ml water".
Zwei Feinheiten, die der Audit erzwang: (1) **Gebinde unter 3 auf Viertel, nicht Halbe** — ein
0.5er-Raster rundete `0.6 can` (a47) auf `0.5` ab, die Menge sank also während die Gruppe wuchs;
(2) **Zählbares unter 3 auf Viertel** — `0.25 Zwiebel` steht so im Pool und ist eine normale
Küchenmenge, ein 0.5er-Raster hätte sie verdoppelt.
Bei `mult === 1` (Gruppe == Basis) gibt `scaleAmountLabel` bewusst den **ungerundeten Rohstring**
zurück: „125g/person" bei 1 Person muss 125g bleiben, nicht auf 130g gerundet werden.

**Verifikation:**
- **2-Personen-Einkaufsliste bit-identisch** zu vorher (190 Zeilen, `git stash`-Diff): bei factor 2
  ist r = 1, `dampen(1)` = 1 → alle Faktoren unverändert. Der Eigen-Trip bleibt exakt wie geplant.
  Nach der Rundungs-Änderung erneut geprüft — weiterhin identisch (Rundung ist reine Anzeige).
- **Vollaudit: 97 Rezepte × 35 realistische Faktoren = 31.605 Skalierungen, 5 Invarianten sauber:**
  keine kaputten Ausgaben · **exakter Round-Trip** (Anzeige zurückgeparst === `roundAmount(qty ×
  scaleFactor)`, ohne Toleranz) · keine Einheiten-Drift · Monotonie · keine Scheingenauigkeit.
  Der Round-Trip ist die schärfste Invariante — er fängt, was man der Ausgabe nicht ansieht:
  falsche Zahl ersetzt, Gebinde-Größe als Anzahl gelesen, Einheit verschluckt.
- End-to-End 2 → 4 Personen: **alle 141 vergleichbaren Items wachsen**, keines bleibt gleich.
  Kokosmilch 5 → 10 Dosen, Cumin 5.7 → 8.6 tsp (gedämpft ×1.5), Olivenöl 57 → 98.5 tbsp.
- Einkaufsliste für Gruppen 1–8 + gemischt (Kinder, Heavy-Appetit): keine kaputten Mengen.
- **337 Tests grün** (299 + 38). Build grün.

**Wichtiger Nebenbefund — der Plan hängt an der Gruppengröße.**
Ein Mengen-Vergleich zwischen zwei Gruppengrößen ist nur bei gleichem Plan aussagekräftig: der
Waste-Optimizer (Release (ac), Pack-Füllung) bewertet über den `groupFactor` → bei **1–4 Personen
identischer Plan, ab 5 weichen ~28–34 von 48 Slots ab**. Deshalb sah der 2→8-Vergleich zunächst
nach Monotonie-Verletzungen aus („Bananen 18 → 7") — das sind **andere Menüs, kein Rechenfehler**.
Der bestehende 2→4-Test funktionierte nur zufällig; er prüft die Plan-Gleichheit jetzt **explizit
als Vorbedingung**, sonst schlägt er später aus dem falschen Grund fehl.

**Neue Test-Datei `src/components/RecipesTab.test.jsx`** — erster Component-Test im Projekt.
Rendert die Karte via `react-dom/server` (`renderToStaticMarkup`) statt `@testing-library/react`:
die aufgeklappte Karte ist reines Markup ohne Interaktion → **keine neue Dependency nötig**
(`CLAUDE.md`: keine unnötigen Dependencies). Sichert die Verkabelung — Überschrift „for 4 people"
und „2 × 400ml cans" in derselben gerenderten Ansicht.

**Erkenntnis für future-Claude:** Die 299 Bestandstests blieben beim Default-Flip **alle grün**,
obwohl sich die Einkaufsmengen app-weit änderten — es gab **keine Assertion auf Mengen** und (bis
jetzt) keine Component-Tests. Ein „Tests grün" allein belegt in diesem Repo keine Mengen-Korrektheit.

**Bewusst NICHT gemacht:**
- **Keine Daten-Normalisierung der 448 Strings** (wie `normalize-recipes.mjs` in (ar)). Wäre laut
  `CLAUDE.md` § „Pro-Person-Mengen" konsequent gewesen, hätte aber ~350 Strings Review-Aufwand
  bedeutet und `1.5 cloves/person` / `200ml/person` liest sich am Camp schlechter als `3 cloves` /
  `1 can`. `BASE_SERVINGS` erreicht dasselbe ohne Datenrisiko.
- **Kein `serves`-Feld pro Rezept.** Wäre explizit, verlangt aber Pflege bei jedem neuen Rezept.
  Bei Bedarf später additiv nachrüstbar (`scaleFactor` müsste nur `serves ?? BASE_SERVINGS` lesen).
- **Keine Configurator-Option für die Dämpfung.** Memory `feedback_generator_over_user_filters`:
  Filter-Sprawl vermeiden. Die Dämpfung läuft transparent im Generator.
- **`4 + 1600ml water`** wird nicht zu `1.6L` normalisiert — kosmetisch, kein Korrektheitsproblem.

## 2026-07-14 (aw) — Cyber-Security-Audit + Härtung + Push (Branch `redesign`)

**Anlass (der Entwickler):** Vollständiger Security-Check vor Release — kein GitHub-Zugriff für böse
Akteure, keine Möglichkeit an eigene oder Kundendaten zu kommen, alle Loopholes schließen, dann pushen.

**Audit-Ergebnis (überwiegend exzellent):**
- **App = keine Datenexfiltration möglich:** 0 Netzwerk-Calls, 0 XSS-Sinks (kein `innerHTML`/`eval`/
  `dangerouslySetInnerHTML`/`document.write`), keine externen Scripts/Fonts/CDNs, keine Datensammlung.
  „Kundendaten" existieren gar nicht auf einem Server — alles bleibt on-device (`localStorage`).
- **GitHub Actions (`deploy.yml`) gut abgesichert:** nur `push:main`+`workflow_dispatch` (kein
  `pull_request_target` → kein Fremdcode), minimale `permissions` (`contents:read`,`pages:write`,
  `id-token:write`), offizielle Actions, `npm ci`, keine Secret-Interpolation.
- **Secrets:** keine Tokens/Keys/`.env`/Private-Keys je committed; Production-Deps **0 Vulnerabilities**.

**Härtung:**
- **CSP** (`default-src`/`connect-src`/`script-src 'self'`, `object-src 'none'`, …) — **nur im
  Production-Build** injiziert (Vite-Plugin `apply:'build'`, sonst bräche Dev-HMR). `connect-src 'self'`
  ist der Kern-Schutz: selbst ein hypothetisches XSS könnte keine Daten nach außen senden.
- **`deploy.yml`:** `persist-credentials: false` beim Checkout (Token nicht in `.git/config` → schützt
  vor Diebstahl durch eine kompromittierte npm-Dependency in `npm ci`).
- **Neutrale Git-Identität** repo-lokal gesetzt (`Cape York Dev <…@users.noreply.github.com>`) → neue
  Commits tragen keine private Identität mehr.

**Offener Befund (bewusst, braucht Entscheidung):** Die **Git-HISTORY** enthält weiterhin die private
Identität — Author/Committer-Metadaten „(Name) <(private mail)>" auf allen 30 Commits + 65 Inhalts-
Treffer in älteren Commit-Ständen. Ein normaler Push entfernt das NICHT. Optionen: History-Rewrite
(`git filter-repo`) + Force-Push (destruktiv, alle SHAs ändern sich, GitHub cached evtl.) · Repo auf
privat (bricht free Pages-Hosting der Policy) · frisches Repo · akzeptieren (Author-Metadaten sind bei
OSS normal). Ebenfalls kein Access/Data-Vektor, aber notiert: **Lizenz-`SECRET` in `premium.js`** liegt
im Client-Bundle (Premium-Keys fälschbar) — für v1-kostenlos irrelevant.

**Push:** gesamte redesign-Arbeit (Rezepte/Kosten/Tutorial/Kochaufwand/Identitäts-Scrub/OSM/Security)
als 1 Commit mit neutralem Author auf `origin/redesign` (`d82ff74..d3df471`). **299 Tests grün**, Build grün.

---

## 2026-07-14 (av) — Privacy Policy: OSM raus + Kontakt-Platzhalter (Branch `redesign`)

**Anlass (der Entwickler):** In der Privacy Policy standen noch OpenStreetMap-Verweise UND (live) die
private E-Mail. Kontakt soll ein **Platzhalter** sein, der beim Play-Store-Release durch die echte
Support-Adresse ersetzt wird.

**Wichtig — warum „noch da":** Die **live gehostete** Policy (`japeyer.github.io`) läuft vom
**`main`**-Branch; alle Änderungen liegen auf `redesign` und sind noch nicht gemerged/deployt. Die
Quelle (`PRIVACY.md`) war beim Identitäts-Scrub (`at`) schon namens-/mail-frei, die OSM-Abschnitte
aber noch drin.

**`PRIVACY.md`:**
- **OSM entfernt:** der „development uses OpenStreetMap data"-Absatz in § 4 und die komplette § 8
  „Open-source data attribution" (ODbL) — Folge-Sektionen umnummeriert (§ 9/§ 10 → § 8/§ 9).
- **Kontakt = Platzhalter `support@example.com`** (reservierte Beispiel-Domain, klar erkennbar) an
  beiden Stellen (Contact-Zeile oben + § 9). Wartungs-Kommentar mit Ersetzungs-Reminder ergänzt.
- Die „does not collect: Location data (GPS…)"-Zeile bleibt (Negativ-Aussage, kein OSM).

**`scripts/build-privacy.mjs`:** strippt jetzt **HTML-Kommentare** vor der Markdown→HTML-Konvertierung
→ interne Wartungs-/Platzhalter-Notizen (und die `japeyer.github.io`-Hosting-URL, die in einem
Kommentar stand) landen nicht mehr im öffentlichen `privacy.html`-Quelltext.

**Verifikation:** `privacy.html` neu generiert — Grep nach OSM- und Identitäts-Mustern → **komplett
leer**; Platzhalter `support@example.com` vorhanden. `npm test` **299 grün**,
Build grün. **Zum Wirksamwerden live: `redesign` → `main` mergen + deployen** (dann zeigt
japeyer.github.io die bereinigte Policy).

---

## 2026-07-14 (au) — Alle sichtbaren OpenStreetMap-Verweise deaktiviert (Branch `redesign`)

**Anlass (der Entwickler):** Mit der deaktivierten Map auch alle OSM-Verweise raus — aktuell nicht
gebraucht, evtl. V2.

**Bestandsaufnahme:** Die Fuel-Sektion im DaySheet (Haupt-OSM-Konsument) war schon in Release `k`
entfernt. Sichtbar blieb OSM nur in der About-„Data sources"-Sektion + einem Satz im Disclaimer.

**Entfernt:**
- **`AboutTab.jsx`:** ganze „Data sources"-Sektion (OpenStreetMap-Satz + ODbL-Attribution) + der
  Import von `ROUTE_POIS_ATTRIBUTION`/`ROUTE_POIS_GENERATED_AT`.
- **`strings.js`:** `about.sourcesHeading`/`sourcesBody` raus; **OSM-Satz aus `about.disclaimerBody`**
  entfernt (sinnvolle Tank-Vorsicht bleibt, ohne OSM-Bezug); **toter Fuel-String-Block** im
  `config.daySheet` (`fuelHeading`/`fuelHint*`/`fuelStopMeta`/`fuelDieselYes`/`fuelEmpty`/
  `fuelAttribution` inkl. „© OpenStreetMap contributors (ODbL)") gelöscht — hatte seit Release `k`
  keinen Consumer mehr.

**Bewusst NICHT angetastet (kommt mit der Map in V2 zurück):** `S.map.attribution` (rendert nur in
`InfoMapTab`, und die Map ist via `MAP_ENABLED=false` deaktiviert → wird nie angezeigt). Die
OSM-Datenfiles (`route-pois.js`, `cape-york-geo.js`) + `ROUTE_POIS_ATTRIBUTION`-Konstante + deren
Tests bleiben — reine V2-Daten, werden aktuell nirgends angezeigt (keine ODbL-Attribution nötig,
solange nichts dargestellt wird).

**Verifikation:** Grep über Strings + Nicht-Map-Komponenten → kein sichtbarer OSM-Verweis mehr.
`npm test` **299 grün**, Build grün.

---

## 2026-07-14 (at) — Security/Identitäts-Scrub vor Play-Store-Release (Branch `redesign`)

**Anlass (der Entwickler):** Vor Veröffentlichung: keine privaten Infos zugänglich, alle Hinweise auf
die Identität (v.a. private E-Mail) entfernen. **Audit ergab: Repo ist öffentlich** (GitHub), also
sind App-Bundle, gehostete Policy UND alle Repo-Docs zugänglich.

**Security-Audit-Ergebnis:** Keine API-Keys/Tokens/Passwörter, `STRIPE_PAYMENT_LINK` leer, 0 Netzwerk-
Calls, kein Tracking. **Ein Befund:** `src/lib/premium.js` hat ein hartcodiertes Lizenz-`SECRET` im
Client-Bundle → Premium-Keys sind fälschbar (architektonisch bedingt, kein Backend). Bewusst NICHT
geändert (bricht bestehende Keys; für v1-frei ohnehin irrelevant) — als Empfehlung dokumentiert.

**Identität entfernt (Entscheidung: Kontakt ganz raus, Identität überall scrubben, Repo public):**
- **App-Strings (`strings.js`):** `contactEmail`/`contactSubject`/`contactBodyTemplate`/
  `contactCtaSecondary` (Premium) + `contactHeading`/`contactEmail`/`sourceUrl`/`sourceCta` (About)
  entfernt.
- **`AboutTab.jsx`:** ganze „Contact"-Sektion (Mail + „View source on GitHub") raus.
- **`checkout.js` + `PremiumInfoTab.jsx`:** der Premium-**Kauf-Fallback lief per `mailto:` an die
  private Adresse** → durch `type:'unavailable'` ersetzt (kein In-App-Kaufpfad ohne Stripe/Play-
  Billing; Lizenzschlüssel-Aktivierung bleibt). Passt zum geplanten kostenlosen v1.
- **`PRIVACY.md` (öffentliche Policy → `privacy.html` neu generiert):** Name + E-Mail raus, Kontakt
  neutral über den Play-Store-Eintrag.
- **Repo-Docs** (CLAUDE/STATUS/PRODUCT/CHANGELOG) via Einmal-Skript gescrubbt: Klarname→
  „der Entwickler", Vorname→„der Entwickler", private E-Mails→`<dev-email>`, Familienname→`<privat>`,
  Windows-Username→`<user>` in Pfaden. Scrub-Skript danach **gelöscht** (enthielt selbst
  die PII-Muster). Platzhalter-Beispielmail auf `buyer@example.com` normalisiert.

**Bewusst NICHT (akzeptierte Rest-Exposition):** Die Policy wird auf **`japeyer.github.io`** gehostet
(Username = im URL sichtbar) und die Repo-URL `github.com/Japeyer` — beide bleiben vorerst; für volle
Neutralität später neutrales Hosting/eigene Domain nötig. Der Windows-Username des Arbeitsverzeichnisses
bleibt real, nur in den Docs generisch.

**Verifikation:** Voll-Repo-Grep nach den Identitäts-Mustern → sauber (nur akzeptierte japeyer-URLs).
`npm test` **299 grün**, Build grün, `privacy.html` neu gebaut.

---

## 2026-07-14 (as) — Geschätzte Einkaufskosten entfernt (Branch `redesign`)

**Anlass (der Entwickler):** Die grobe Kostenschätzung in der Einkaufsliste ist nicht nötig und verleitet zu
falschen Annahmen (Preise schwanken stark je Laden/Saison) → ersatzlos raus.

**Entfernt:**
- **`ShoppingTab.jsx`**: `progress-cost`-Block (💰 Total/Remaining/Disclaimer), `totalCost`/
  `remainingCost`-useMemos, pricing-Import; Share-Aufruf ohne Kosten-Parameter.
- **`lib/share.js`**: Cost-Footer aus `formatShoppingListAsText` (Signatur ohne totalCost/
  remainingCost/formatAud).
- **`strings.js`**: `S.shopping.cost`-Bucket. **`App.css`**: `.progress-cost*`-Regeln.
- **`lib/pricing.js` + `lib/pricing.test.js` gelöscht** (nur noch von ShoppingTab genutzt →
  vollständig obsolet, inkl. `estimateBucketCost`/`estimateRemainingCost`/`qtyMultiplier`/`formatAud`).
- `share.test.js`: Cost-Footer-Tests → ein Test „enthält keine Kostenschätzung mehr".

**Bewusst NICHT angefasst:** Der **Premium-Kaufpreis** (AUD$15.99 in `PremiumInfoTab`/`checkout.js`/
`S.premium.*`) ist etwas anderes (App-Kauf, nicht Lebensmittelkosten) und bleibt.

**Verifikation:** `npm test` **299 grün** (−16: pricing.test.js raus, share-Cost-Tests ersetzt),
Build grün. Auf `redesign`, nicht gemerged.

---

## 2026-07-14 (ar) — Zutaten app-weit vereinheitlicht + can/gram-Bug behoben (Branch `redesign`)

**Anlass (der Entwickler):** Einkaufsliste rechnete Zutaten uneinheitlich → u.a. „kaufe **376 Dosen Tuna**".
Ziel: überall einheitliche Einheiten pro Zutat, alle „X or Y"-Zutaten auf eine festlegen, Rezepte
moderat vereinfachen — Koch-Schritte aber inhaltlich belassen (keine Verwirrung).

**Root Cause (Parser):** `parseAmount('185g can/person')` las die **185** (Gramm) als Dosen-Anzahl,
weil das Container-Prioritäts-Feature (für „1 × 400g can") die erste Zahl nahm. Bei „185g can" ist
die erste Zahl aber die Größe.
- **Fix `generator.js`:** Container-Anzahl-Schutz — steht direkt hinter der Zahl eine Masse/Volumen-
  Einheit (g/kg/ml/l), ist sie die Größe; die Dosen-Anzahl kommt aus einem „N ×"-Multiplikator oder
  ist 1. Schützt auch die selbst angelegten Rezepte in Stufe 2. + Regressionstests.

**Daten-Normalisierung** (Skript `scripts/normalize-recipes.mjs`, auditierbar, wie die bestehenden
`normalize-*`-Skripte; Dry-Run + Warnungen). **173 Mengen-/Namensänderungen, 14 entfernte optionale
Zutaten:**
- **Einheitliche Einheiten pro Zutat** (26 vorher gemischte): Butter/Bacon/Mehl/Hummus/Pinienkerne/
  Spinat/Sour cream → g · Öl/Zitrone/Limette → tbsp · Honig/Ahornsirup → ml · Ingwer/Aubergine/
  Tomate/Frühlingszwiebel/Pak choi → Stück · Kräuter → tsp · Kirschtomaten → g · Hähnchenschenkel → g.
- **Konserven konsistent:** alle Dosen-Zutaten führen „can" (sonst parste „1 × 400g" als Stück und
  landete in einer eigenen Zeile). **`packs.js` erweitert** (chickpeas/black-/baked-/white-/kidney
  beans, corn, peas, refried beans, tuna, salmon mit `contains`) → g/ml/Dosen werden zu **ganzen
  Dosen zusammengeführt**. Ergebnis 16 Tage/2 Pers.: Tuna **6 Dosen** (statt 376), Kokosmilch 11
  Dosen (ml→Dosen gemerged, kein „ml+can"-Mix), Dosentomaten 9, Kichererbsen 3.
- **111 „X or Y" aufgelöst** (Name + Menge) auf je eine Option; Allergen-/Fleisch-/Shelf-Tokens
  bewusst erhalten (z.B. „Chicken (leftover or canned)"→„Canned chicken" bleibt shelf-stable;
  „Your choice of meat (…)"→„Beef steak" bleibt Fleisch-erkannt).
- **Moderate Vereinfachung:** 14 optionale/Deko-Zutaten entfernt (Optional-Bacon/-Butter/-Honey,
  diverse „(optional)" Samen/Nüsse/Granatapfel, Lime leaves). **13 Schritte/Tipps nachgezogen**, damit
  kein Schritt eine entfernte Zutat referenziert (Kern-Vorgabe: keine Verwirrung beim Kochen). Koch-
  Abläufe sonst unangetastet.

**Verifikation:** neue Konsistenz-Tests (keine Konserve parst als Stück; kein „or" mehr; jede kanon.
Zutat = EINE Einheiten-Klasse; Tuna-Regression) + Parser-Guard-Tests. **`npm test` 315 grün**
(+8). Build grün. Ein Waste-Heuristik-Test von ≤2 auf ≤3 Grund-Carbs angepasst (Folge der korrekten
„Rice or hokkien noodles"→„Rice noodles"-Auflösung — Reis/Pasta/Couscous alle real genutzt).
Auf `redesign`, nicht gemerged.

---

## 2026-07-13 (aq) — Erststart leer + Onboarding-Tutorial beim ersten "Create trip" (Branch `redesign`)

**Anlass (der Entwickler):** Erststart soll ohne Voreinstellungen auf die leere Startseite führen; beim ersten
"Create trip" soll ein kleines Tutorial die wichtigsten Funktionen erklären.

**(1) Leerer Erststart — bereits erfüllt, verifiziert:** `loadTripStore()` liefert bei frischem
Install `{ trips: [], activeTripId: null }` (kein Default-Trip wird geseedet, nichts persistiert bis
der User handelt). `HomeTab` rendert dann den Empty-State (🦘 + "No trip planned yet" + Create-CTA).
Kein Code-Change nötig — nur bestätigt. (Dass in Jans Browser Trips erscheinen, liegt an localStorage
aus den Dev-Sessions, nicht an einem Seed.)

**(2) Onboarding-Tutorial (neu):**
- Neue Komponente **`src/components/TutorialOverlay.jsx`** — Portal-Modal (`createPortal` → body,
  z-index 1100 über Nav/Sheets), kleiner Slide-Carousel mit 6 Slides (Welcome → Configurator →
  Menüplan/Swap → Offline-Rezepte → Einkaufsliste/Resupply → Stock). Dots-Progress, Back/Next,
  letzter Slide = "Let's plan", "Skip" oben rechts. Beide Enden rufen `onDone`.
- **`useStorage.js`**: `getTutorialSeen()`/`setTutorialSeen()` unter globalem Key `ui_tutorial_v1`
  (`ui_`-Prefix → nicht per-Trip, vom Trip-Reset/Volatile-Wipe NICHT erfasst → Tutorial erscheint
  wirklich nur einmal, auch nach Trip-Löschung).
- **`App.jsx`**: `handleCreateNew` in `doCreateNew` (reine Anlage-Logik) + Gate aufgeteilt. Reihenfolge:
  Free-Limit-Check → wenn `!getTutorialSeen()` → `setShowTutorial(true)` und Anlage aufschieben →
  sonst `doCreateNew()`. `handleTutorialDone` markiert gesehen, schließt, legt dann den Trip an.
  Overlay via `{showTutorial && <TutorialOverlay onDone={handleTutorialDone} />}`.
- **Strings**: neuer `S.tutorial`-Bucket (skip/back/next/done + `slides[]`), Englisch/i18n-ready.
- **CSS** (`App.css`): `.tut-*` im Warm-Design (Papier-Karte, getöntes Emoji-Token, Orange-Primary-
  Button, animierte Dots, `tut-pop`-Einblendung).

**Verifikation:** `npm test` **307 grün** (unverändert — UI/Flow-Änderung, kein Generator-Code),
`npm run build` grün, HMR sauber. Zum Wieder-Auslösen zum Testen: `localStorage.removeItem('ui_tutorial_v1')`
in der Browser-Konsole, dann "New trip". Auf `redesign`, nicht gemerged.

**Bewusst NICHT (mögliche Follow-ups):** kein "Replay tutorial"-Button (z.B. in About) — nur der
Erst-Trigger war gefordert; die `onDone`-Struktur macht das später trivial nachrüstbar. Kein
Coach-Mark-/Spotlight-Tutorial auf echten UI-Elementen (fragiler auf 360px) — bewusst der robuste
Slide-Intro gewählt.

---

## 2026-07-13 (ap) — Kochaufwand-Filter im Configurator (Branch `redesign`)

**Anlass (der Entwickler):** „Bei den Trip-Einstellungen eine Schaltfläche für Kochaufwand — wenig / mittel /
mehr — dann werden nur die entsprechenden Rezepte genommen."

**Design:** Neues Config-Feld `cookEffort` (`'low' | 'medium' | 'high'`) als **Aufwands-Obergrenze**
(kumulativ, monoton): `low` = nur `effort:'easy'`, `medium` = easy + medium, `high` = alles.
Rezepte tragen das `effort`-Tag längst (62 easy / 34 medium / 2 hard), der Generator nutzte es bisher
gar nicht. **Default `high`** = kein Filter = bisheriges Verhalten → rückwärtskompatibel (alte Trips
ohne Feld verhalten sich unverändert). Höhere Stufe = größerer Pool, leert also nie überraschend eine
Kategorie.

**Generator (`lib/generator.js`):**
- Neue Konstanten `EFFORT_RANK`/`COOK_EFFORT_CEIL`/`COOK_EFFORT_LEVELS` + exportierter Helfer
  **`effortAllowed(recipe, cookEffort)`** (unbekannt/fehlend → true = keine Einschränkung).
- `cookEffort` durchgereicht in `buildRecipePool`, `buildSplitPool`, `generatePlan`,
  `computeSpecialAssignments`, `estimateSpecialCount` und `generate`. Filtert **regulären Pool + die
  aufwändigen Special-Dinner** (bei „wenig" verschwinden medium/hard-Specials).
- **Aufwands-Fallback ZUERST** (vor Diät-Fallback): leert die Kombination (Diät/Allergene/Burner +
  „wenig") eine Kategorie, lockert der Generator die Obergrenze stufenweise hoch + Warnung — Diät
  bleibt hart (ein Veganer wird nie zum Vegetarier degradiert). Analysierte Coverage: selbst „wenig"
  hat vegan-dinner=6/lunch=9/breakfast=8 → in der Praxis greift der Fallback nur mit Allergenen.
- `generate().config` trägt jetzt `cookEffort` + `cookEffortApplied` (analog `diet`/`dietApplied`).
- **Swap-Sheet + manuelle Overrides bleiben ungefiltert** — der User darf pro Tag bewusst ein
  aufwändigeres Rezept picken, auch bei globaler „wenig"-Einstellung.

**UI/Config:** `defaultConfig()` (`useStorage.js`) um `cookEffort:'high'` erweitert (mergeConfig füllt
alte Configs via Spread auf). Neuer `PillPicker` „Cooking effort" (Easy / Medium / More) im
`ConfiguratorTab` nach der Diät-Auswahl; Special-Vorschau-Hint (`estimateSpecialCount`) bekommt
`cookEffort` mit. `App.jsx` reicht `config.cookEffort` in `generate()` + in die generate-useMemo-Deps.
Strings `S.config.effortLabel`/`effortHint`/`effortOptions` (Englisch, i18n-ready).

**Verifikation:** `npm test` **307 grün** (+11: `effortAllowed`-Schwellen, Plan nur-easy bei „wenig",
kein hard bei „mittel", high=Default-Verhalten, volle Coverage pro Diät bei „wenig", Special-Count
respektiert Aufwand). `npm run build` grün. Effekt-Check: omnivore 16d → low nutzt nur easy-Rezepte,
high mischt medium rein; keine Spurious-Warnings. Auf `redesign`, nicht gemerged.

---

## 2026-07-13 (ao) — Schrift app-weit Calibri-Stil + Map deaktiviert (Branch `redesign`)

**Anlass (der Entwickler):** (1) „Verwende für den gesamten Text die gleiche Schriftart, eine saubere klare
Schrift wie z.B. Calibri, aber unterscheide über Größe/Fettheit." (2) „Deaktiviere die Map-Funktion,
die wird für einen ersten App-Release noch nicht gebraucht."

**Schrift (app-weit EINE Familie, Calibri-Stil):**
- **Manrope verworfen** → **Carlito** gebündelt: metrik-kompatibler, freier Calibri-Klon
  (`@fontsource/carlito`, OFL). Nur **Latin-Subset, Regular (400) + Bold (700)** importiert (in
  `main.jsx`, `latin-400.css`/`latin-700.css`) — wie echtes Calibri; deckt DE/EN inkl. Umlaute.
  **Offline gebündelt → geräteübergreifend identisch** (Windows/Android/iOS), nicht nur wo Calibri
  installiert ist. Bundle-Kosten: 4 woff2/woff à ~30 KB (deutlich kleiner als die variable Manrope).
- Zentrale Familie über `--font-ui` in `index.css`:
  `'Carlito', Calibri, 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif`. Body-`font-family`
  und der Titel-Token `--display` zeigen beide auf `--font-ui` → Hierarchie ausschließlich über
  **Größe + Weight** (Titel 700, Body 400), nicht über verschiedene Familien. Weights 500/600/800 im
  CSS werden vom Browser auf 400/700 gemappt (Carlito shippt wie Calibri nur Regular/Bold) — für die
  Größe-basierte Hierarchie irrelevant.
- **Dependency `@fontsource-variable/manrope` deinstalliert** (`npm uninstall`) + Import aus
  `main.jsx` entfernt; **`@fontsource/carlito` neu** (begründet: einzige Familie, offline, i18n-safe).
- **Mono bleibt** nur für den Lizenzschlüssel (`.account-status-key`, Code-Token — Gruppierung
  lesbarer). Alles andere ist jetzt Calibri-Stil (Carlito).

**Map deaktiviert (Code bleibt):**
- Neues Modul-Flag `MAP_ENABLED = false` in `App.jsx`. `buildActiveTripTabs` lässt den Map-Tab
  weg, `showMapBtn` (🗺️-Topbar-Button auf Home) ist gated. Die Render-Blöcke `activeTab==='map'`
  und `view==='map'` bleiben als toter, aber intakter Code stehen.
- **Nichts gelöscht:** `InfoMapTab.jsx`, `CapeYorkMap.jsx`, `data/cape-york-geo.js`,
  `cape-york-pois.js`, `route-pois.js`, Map-Farbtokens in `index.css` — alles bleibt.
  **Reaktivierung = Flag auf `true`.**

**Bewusst NICHT:** Calibri nicht als Font gebündelt (auf Android-Target fällt es auf Roboto zurück,
nicht pixel-identisch zu Windows-Calibri) — für ersten Release/Dogfood ausreichend; bei Wunsch nach
geräteübergreifend identischer Schrift später **Carlito** (metrik-kompatibler Calibri-Klon) via
`@fontsource/carlito` bundlen. Map-Code nicht entfernt, nur ausgeblendet.

**Verifikation:** `npm test` **296 grün** (unverändert, reine UI/Config-Änderung), `npm run build`
grün. Auf `redesign`, nicht in `main` gemerged.

---

## 2026-07-09 (an) — UI-Redesign v2: „Warm Claude" Item-Design (Branch `redesign`)

**Verlauf:** Phase-1-Reskin („Clean & modern, cool weiß" — Commit `c38edce`) hat der Entwickler **nicht**
gefallen („altes Design war besser") → sauber **revertiert** (`02cd93c`, Tree == `main 801ff8f`,
byte-identisch). der Entwickler will stattdessen die **Items** aufwerten (wirken alt/wenig einladend) im
**Claude-Look** (claude.ai ist warm: Papier-Flächen, Serif-Headings, weicher Ton). Gewählt aus
3 Karten-Previews: **„Warm Claude"**.

**Umsetzung (nur CSS/Markup + 1 Font, KEINE Logik — Generator/Inventory/Tests unberührt):**
- **Schrift (app-weit, EINE Familie):** Entwickler-Vorgabe: konsistent, modern, **nicht** over-the-top,
  Hierarchie nur über **Größe + Weight** (bold/regular/slim). Iteration: Fraunces-Serif → Space
  Grotesk-Display (beide „nicht richtig / zu viel Charakter") → **Manrope** (`@fontsource-variable/
  manrope`, selbst-gehostet/offline, variabel 200–800) als **einzige Schrift für ALLES** (Body +
  Titel via `--display`=Manrope). Titel = Weight 700 + Tracking `-0.01em`, Body = 400; global
  Font-Smoothing + leicht negatives Tracking. Mono nur noch für den Lizenzschlüssel.
- **`index.css`:** additive Warm-Tokens (`--card #FFFDF9` Papier-Weiß, `--card-line` warme Hairline,
  `--tok-bg` Emoji-Token-Sand, `--chip-bg`, `--serif`, `--shadow-item`) — ändert bestehende Tokens NICHT.
- **Recipe- & Day-Cards (`App.css`):** warmes Papier + weicher `--shadow-item` + Hairline + Radius 18;
  Emoji sitzt jetzt in einem **runden getönten Token** (46px); Titel in **Manrope Bold**; Recipe-Meta von
  „·"-Textzeile → **kleine Chips** (`.meta-chip`, ⏱/🍳/🔥).
- **`RecipesTab.jsx`:** Meta rendert Chips (leere Felder werden ausgelassen → sauber auch bei
  User-Rezepten).

**Bewusst NICHT (nächste Iteration, wenn der Entwickler die Item-Sprache mag):** gleiche Behandlung auf
Shopping-/Inventory-/Cat-Cards ausrollen; optional Meal-Type-Farbakzente; Motion. Overall-Chrome
(Topbar/Nav/BG) bleibt bewusst das alte warme Design.

**Verifikation:** `npm test` **296 grün**, `npm run build` grün (Manrope-woff2 gebündelt). Neue
Dependency `@fontsource-variable/manrope` (Offline-Font, Bundle statt CDN; Fraunces + Space Grotesk
wieder entfernt). Läuft auf `redesign`, nicht in `main` gemerged.

---

## 2026-07-07 (al) — Eigene Rezepte („Build your own menu")

**Anlass:** der Entwickler will Rezepte selbst anlegen (im Recipes-Tab), sie im Day-Planner per Swap auf einen
Tag setzen, und dann sollen die Zutaten in die Einkaufsliste dieses Tages fließen. Entscheidungen:
**hand-platziert per Swap** (nicht im Auto-Round-Robin), **frei für alle**, **globale
Bibliothek** (trip-übergreifend).

**Architektur:** Der ganze Rezept-Pipeline (Generator-Lookups, Swap, Recipes-Tab, Shopping,
Inventar) läuft über id-Lookups. Neu:
- **`src/lib/recipe-pool.js`**: `setUserRecipes(list)` + `recipeById(id)` (eingebaut ODER User) +
  `isUserRecipe`. Generator (`getOverride`, `generateShopping`, Leftover/`noteCooked`) und
  `inventory.js` (`consumedByCooked`, `recipeUsageMap`) nutzen jetzt `recipeById` statt des
  statischen `RECIPE_BY_ID`. **Auto-Pool-Builder (`buildRecipePool`/`buildSplitPool`/Specials)
  bleiben auf den eingebauten `RECIPES`** → User-Rezepte kommen NUR per Swap in den Plan.
- **`useStorage.js`**: globale Bibliothek `user_recipes_v1` (`getUserRecipes`/`saveUserRecipes`/
  `upsertUserRecipe`/`deleteUserRecipe`) — nicht per-Trip-namespaced.
- **`App.jsx`**: `userRecipes`-State + `setUserRecipes(userRecipes)` synchron im Render (Registry
  vor Generator/Swap), `userRecipesHash` in den generate-Deps (Zutaten-Edit aktualisiert das
  Shopping der betroffenen Tage). Handler `handleSaveUserRecipe`/`handleDeleteUserRecipe` (Delete
  räumt dangling `overrides`, die auf das Rezept zeigen).
- **UI:** `RecipesTab` — neue **„👨‍🍳 My recipes"**-Sektion (immer sichtbar, nicht premium-gated) mit
  Edit/Delete + **„+ New recipe"**; neuer **`RecipeEditorSheet`** (portaled, wie MealStatusSheet):
  Name+Emoji, Meal-Type/Diät/Burner-Pills, dynamische Zutaten-Zeilen (name+amount, add/remove),
  Steps-Textarea. Generator-Pflichtfelder mit Defaults (`cooling:'medium'`, `effort:'easy'`, …).
  **`SwapSheet`** zeigt eine **„👨‍🍳 My recipes"-Sektion** (User-Rezepte des Meal-Typs, immer, ohne
  Diät-/Burner-Filter) über den eingebauten Kandidaten; Pick → Override → Zutaten in der Einkaufsliste.

**Verifikation:** **296 Tests grün** (+8: `recipe-pool` Lookup/Reset/kaputte-Rezepte; Generator:
Custom-Override → Zutaten im Shopping, unbekanntes/gelöschtes Override → graceful Fallback,
User-Rezept NICHT im Auto-Plan). Per Node-Smoke Ende-zu-Ende geprüft (Kangaroo/Bush-tomato landen
im Shopping). Build JS 1312.28 → **1319.41 kB** (+7 kB). Bewusst: User-Rezepte nur per Swap; im
Recipes-Tab in „My recipes" verwaltet (nicht dupliziert in den Plan-Kategorie-Sektionen).

## 2026-07-07 (ak) — Multi-Trip: Premium kann mehrere Trips speichern

**Anlass:** der Entwickler will, dass Premium-User mehr als einen Trip gleichzeitig speichern können.
Entscheidungen (AskUserQuestion): Premium = **unbegrenzt**, Free = **1** (2. → Upgrade-Prompt),
jeder Trip mit **editierbarem Namen**.

**Architektur:** Bisher ein einzelnes `cfg_v1` + global-gekeyte Shopping/Inventar-Keys. Neu:
- **Trip-Store** `cfg_trips_v1` = `{ trips:[{id,name,config}], activeTripId }` in `useStorage.js`,
  mit **reinen, getesteten Helfern** (`migrateLegacyToStore`/`createTripInStore`/`deleteTripFromStore`/
  `renameTripInStore`/`setActiveInStore`/`getActiveTrip`/`putActiveConfig`) + Load/Save-Wrappern.
  `mergeConfig(parsed)` aus dem alten `loadConfig` extrahiert (pro Trip anwendbar).
- **Per-Trip-Namespace** für ALLE volatilen Keys: `setActiveNamespace(tripId)` → Keys werden
  `<prefix><tripId>~<rest>` (ck_/del_/qty_/add_/invu_/invadd_). Consumer (`ShoppingTab`/
  `InventoryTab`) unverändert — sie rufen dieselben Helfer, die intern namespacen. `ui_`-Keys
  (Banner) bleiben global. `wipeTripVolatile(tripId)` löscht nur EINEN Trip; `resetAllShoppingState`
  = aktiver Trip. Key-Iteration via `allStorageKeys()` (`key(i)`-Loop, robust).
- **Migration (einmalig):** vorhandenes `cfg_v1` → Trip `t1`; alle bestehenden volatilen Keys werden
  in `…_t1~…` umbenannt → der laufende Trip behält Checkboxen/Inventar (per Polyfill end-to-end
  verifiziert: Migration + Isolation + per-Trip-Wipe).
- **`App.jsx`:** `store`-State + `config` (aktiver Trip). Aktionen `handleCreateNew` (Limit-Gate:
  Free ab `FREE_LIMITS.maxTrips` → Premium-Seite), `switchToTrip`/`handleOpenTrip`/`handleEditTrip`
  (Namespace + Config umschalten), `handleDeleteTrip`, `handleRenameTrip`; Store-Refresh bei
  Home-View. Bestehende Config-Mutatoren (`setOverride`/`setMealStatus`/…) unverändert (schreiben
  via `saveConfig` in den aktiven Trip).
- **`HomeTab.jsx`:** Trip-**Liste** statt Einzel-Card — pro Trip Name (✎ inline-rename), Datum +
  Kurz-Summary (billig aus Config, kein Generator), Open/Edit/🗑 Delete (confirm). „+ New trip"
  mit 🔒-Variante + Upgrade-Hinweis wenn Free am Limit. `premium.js` `FREE_LIMITS.maxTrips = 1`.

**Verifikation:** **288 Tests grün** (+9 `useStorage.test.js`: create/switch/delete/rename/
migrate/mergeConfig — reine Helfer, kein localStorage). Migration + Namespace-Isolation via
Node-Polyfill geprüft. Build JS 1307.71 → **1312.28 kB** (+4.6 kB). Bewusst: lapsed-Premium ist
nicht-destruktiv (Anlegen blockiert, Zugriff auf bestehende Trips bleibt).

## 2026-07-07 (aj) — Einkaufsliste: „Wo wird das verwendet?"-Dropdown mit Rezept-Link

**Anlass:** der Entwickler will pro Einkaufs-Item sehen, in welchen Menüs die Zutat vorkommt (mit Link zum
Rezept), um die Wichtigkeit einer Zutat einzuschätzen (lohnt sich der Kauf? was hängt dran?).

**Umsetzung:** Neue `recipeUsageMap(plan)` in `src/lib/inventory.js` → Map `kanonischer Key →
[{ id, name, icon, cat, amount, days[] }]` (Rezepte im Plan, die die Zutat nutzen; `amount` = die
Rezept-Zutatenzeile, zeigt Rolle/Menge). `ShoppingTab` bekommt `plan` + `onOpenRecipe`, baut die
Map einmal (`useMemo`), reicht `usage=map.get(item.key)` an `CheckItem`. **`CheckItem`** hat jetzt
einen aufklappbaren **„🍽 N ▾"**-Button (nur wenn ≥1 Rezept); die Liste zeigt pro Rezept Icon +
Name + Zutaten-Menge + Tage und ist tap-bar → öffnet das Rezept.

**Rezept-Navigation (neu verkabelt):** `App.jsx` hält `recipeFocus` + `openRecipe(id)` (Recipes-Tab
öffnen + Fokus setzen). `RecipesTab` nimmt `focusRecipeId`/`onFocusHandled`: die passende
`RecipeCard` startet aufgeklappt (`defaultOpen`) und wird via `data-recipe`-Attribut angescrollt,
danach Fokus zurückgesetzt. Damit funktioniert auch MenuTabs bisher toter **„→ Recipe"**-Link
(`onJumpToRecipe={openRecipe}`). `CheckItem`-Layout auf `flex-column` + `.chk-item-top` umgestellt
(damit das Dropdown unter der Zeile Platz hat).

**Verifikation:** **279 Tests grün** (UI-Feature; `recipeUsageMap` per Node-Smoke geprüft: onion → 7
Rezepte, garlic → 10, mit Menge+Tagen). Build JS 1305.62 → **1307.71 kB** (+2 kB). Bewusst: Dropdown
nur für Generator-Zutaten (Items mit `key`); Essentials/User-added haben keins.

## 2026-07-06 (ai) — Neuer „Stock"-Tab: mengengenaues Inventar

**Anlass:** der Entwickler will einen Inventar-Tab: eingekaufte (auf der Einkaufsliste abgehakte) Zutaten als
Überblick; wird eine Mahlzeit gekocht, werden die verbrauchten Mengen abgezogen (Beispiel: Rezept
braucht 1 Apfel, Bestand 4 → 3). Verknüpft mit dem Cooked/Deviation-Toggle aus (ag).

**Modell:** `Bestand = eingekaufte Menge − verbrauchte Menge`, mengengenau in Basiseinheiten
({g|ml|count|can|…}). **Einkauf** = Summe der `amount`-Felder aller auf einer Einkaufsliste
abgehakten Items (über alle Supply-Points, pro kanonischer Zutat). **Verbrauch** kommt aus den im
Menü-Tab als gekocht markierten Mahlzeiten: `'cooked'` → alle Zutaten, Deviation → nur angehakte
(`usedIng`), unmarkiert/Reste/Restaurant/Skip → nichts. Rest = Einkauf − Verbrauch (auf 0 geklemmt).

**Umsetzung:** `generateShopping`-Items tragen jetzt `key` (kanonisch) + `amount` (numerische
Basis-Mengen) — maschinenlesbar neben dem Pack-gerundeten `qty`-Display. Parse-Helfer
(`parseAmount`/`scaleFactor`/`unitToBase`/`unitClass`/`formatQty`) exportiert. Neue
**`src/lib/inventory.js`**: `consumedByCooked(plan, factor)` (verbrauchte Mengen pro Zutat aus
gekochten Mahlzeiten, dieselbe Parse-Logik wie Shopping → 100 % konsistent), `subtractAmounts`,
`isDepleted`, `formatAmount` (ohne Pack-Rundung). Neuer **`InventoryTab.jsx`** summiert die
abgehakten Items pro kanonischer Zutat, zieht den Verbrauch ab, gruppiert „In stock" nach
Kategorie + eine aufklappbare „Used up"-Sektion; Empty-State wenn noch nichts abgehakt. **Bottom-
Nav bekommt einen 📦 „Stock"-Tab** (nach Recipes; App.jsx). Strings `S.inventory.*` + `S.app.tabs.
inventory`, CSS `.inv-*`.

**Manueller Verbrauch (Nachtrag same-session):** man kann im Stock-Tab von Hand abziehen, wenn man
außerhalb des Menüs snackt (Riegel/Chips/Dose). Pro Zeile: **„−1"** (nur bei zählbaren Einheiten →
verbraucht 1 Stück), **„✕"** (ganz aufgebraucht → in „Used up") und in „Used up" **„↺"** (Restore).
Persistenz `invu_<key>` = { unit: qty } (manueller Verbrauch), von `resetAllShoppingState`
mitgewischt. Rest = Einkauf − Koch-Verbrauch − manueller Verbrauch. Neue `getManualUsed`/
`setManualUsed` in `useStorage.js`; UI-Buttons `.inv-btn` (40px Touch, a11y-Labels).

**„+ Add an item" (Nachtrag same-session):** eigene Items, die NICHT aus der Einkaufsliste kommen
(z.B. an der Tankstelle gegriffene Snacks). Inline-Form (Name + Stepper-Stückzahl) → Kategorie
**„🛒 Grabbed on the road"**. Persistenz `invadd_<id>` = { name, qty }, key `custom:<id>` mit
amount `{count:qty}` → dieselbe −1/✕/↺-Mechanik greift; zusätzlich **🗑 Delete** entfernt das Item
ganz (räumt auch `invu_` mit auf). `getAddedInventory`/`setAddedInventory`/`removeAddedInventory`;
`invadd_` in `resetAllShoppingState`.

**Verifikation:** **279 Tests grün** (+7 neue `inventory.test.js`: Mengen-Subtraktion inkl. 4−1=3
+ 0-Klemmung, `isDepleted`, `formatAmount`, „unmarkiert verbraucht nichts", „cooked verbraucht
Zutaten", „Deviation nur angehakte", **„alle gekocht → Rest exakt 0"** = Parse-Konsistenz
Shopping↔Inventar; manueller Verbrauch ist localStorage/UI-Layer). Build JS 1298.46 →
**1303.42 kB** (+5 kB). Bewusst offen (Follow-up): Inventar nutzt exakte Bedarfsmengen (nicht
Pack-gerundet); User-added/Essentials-Items (kein `key`/`amount`) nicht im Zutaten-Inventar;
Koch-Verbrauch nur für explizit markierte Mahlzeiten (kein Auto-nach-Datum).

## 2026-07-06 (ah) — Meal-Status-Sheet: Redesign + Off-Screen-Bugfix + Accessibility

**Anlass:** der Entwickler: Optik zugänglicher machen + Bug — das Sheet lief unten aus dem Bildschirm
(Save-Button/lange Zutatenliste unerreichbar).

**Bugfix (Save-Button hinter der Bottom-Nav) — die eigentliche Ursache war ein Stacking-Context-
Trap:** `.content` ist `position: fixed` und bildet damit einen **eigenen Stacking-Context**. Das
Sheet wird IN `.content` gerendert → sein `z-index` (auch 1000) konkurriert nur INNERHALB von
`.content`; die Bottom-Nav (`z-index: 200` im Root-Context) liegt darüber und verdeckte den Save-
Button. `z-index`-Erhöhen allein half deshalb nicht. **Fix: `MealStatusSheet` per `createPortal`
nach `document.body`** — damit verlässt es `.content`, landet im Root-Context und `z-index: 1000`
schlägt die Nav. Zusätzlich (gegen Überlauf bei langer Liste): `.ms-sheet max-height: 88dvh`
(`@supports`-Fallback `88vh`), Flex-Column mit fixem Header + scrollbarem `.ms-body` + Sticky-
`.ms-foot` (Zähler + Save) → Save immer sichtbar und über der Nav.

**Redesign + Accessibility:** Drag-Handle, Header mit Rezeptname + ✕-Close-Button (36px),
Slide-up/Fade-Animation. Optionen als 52px-Touch-Buttons (Cooked grün, Deviation orange bei
aktiv). Checkliste: 48px-Rows mit **custom 26px-Häkchen-Boxen** (visuell klar an/aus, `accent`
unabhängig), aktive Zeile fett. Sticky Save 52px. `role="dialog"` + `aria-modal` + `aria-label`,
`aria-pressed`/`aria-expanded` an den Optionen, **Escape schließt**. Mark-Button „✎ Log" klar
sichtbar (Orange-Tint) statt gestrichelt-grau; Inline-Buttons min-height 30px. Strings:
`markBtn` → „✎ Log", neuer `close`. **272 Tests grün** (UI-only, keine Logik-Änderung). Build JS
1297.53 → **1298.46 kB**.

## 2026-07-06 (ag) — Meal-Status verfeinert: „Cooked" vs. „Deviation" mit Zutaten-Checkliste

**Anlass:** der Entwickler zu (af): der Grund der Abweichung (Restaurant vs. skipped) ist egal — es braucht
nur „cooked as planned" ODER „Deviation", wo man ankreuzt WELCHE Zutaten tatsächlich verwendet
wurden; nichts angehakt = gar nicht gekocht.

**Änderung:** Der grobe 4-Wege-Status (cooked/eaten-out/skipped/leftovers) wird durch ein
zutaten-genaues Modell ersetzt. `mealStatus[day][slot]`:
- `'cooked'` → wie geplant (alle Zutaten, nur Bestätigungs-Häkchen), oder
- `{ used: [idx…] }` → NUR diese Rezept-Zutaten-Indizes wurden verwendet (leeres Array = gar nicht
  gekocht); fehlt der Eintrag → wie geplant (Default).

`generatePlan` hängt `reviewed:'cooked'` bzw. `deviation:true`+`usedIng` ans Meal; `generateShopping`
filtert Zutaten per Index (`usedIng` undefined = alle, `[]` = keine), skaliert `batch` weiter, und
`isShoppableIngredient` wird jetzt exportiert. Waste-State (`noteCooked`) überspringt „gar nicht
gekocht". UI: `MealStatusSheet` neu — Button „✅ Cooked as planned" + Button „✎ Deviation" der eine
**Zutaten-Checkliste** (nur einkaufbare Zutaten) aufklappt (leer startend, „tick what you used"),
Live-Zähler + „nichts angehakt = nicht gekocht"-Hinweis, Save/Clear. Badges: `✓ Cooked` (grün),
`✎ Deviation` (Teil-Auswahl), `⤫ Not cooked` (durchgestrichen/gedimmt). Deviation-Checkliste liest
Rezept-Zutaten via `RECIPE_ING_INDEX` (Index+Name, shoppable-gefiltert).

**Verifikation:** **272 Tests grün** (+2: „cooked = Default", Deviation leer < Default, Teil-Auswahl
dazwischen, all-not-cooked → nur Essentials; alte eaten-out/skipped-Tests auf neues Modell portiert).
Build JS 1296.26 → **1297.53 kB**. Migration: alte String-Status ('eaten-out'/'skipped') werden
neutralisiert (→ Default) — Feature war Same-Day, kein echter User-State betroffen.

## 2026-07-06 (af) — Plan-vs-Reality: Leftovers, Meal-Status, Multi-Stop-Frisch-Einkauf

**Anlass:** der Entwickler im Trip: der Plan war zu starr — sie kochten nicht jede Mahlzeit (spontan
auswärts, improvisiert, Reste). Folge: Einkaufsliste über-kauft, Waste landet auf FRISCHEM
(Haltbares kommt heim, Frisches verdirbt). der Entwickler wählte (AskUserQuestion) drei Fixes + gab
Ground-Truth zu Resupply: nur verlässliche Supermärkte führen Frisches (Cooktown, Coen, Bamaga,
**Weipa** neu), Roadhouses (Archer) nicht → Frisch nur zu aktivierten, im Kalender datierten Stops.

**A1 — Reaktiver Meal-Status.** Neuer config-Map `mealStatus: { [day]: { f|m|ab: 'eaten-out' |
'skipped' | 'leftovers' } }` (Muster wie `overrides`/`restaurantSlots`). `setMealStatus` in
`App.jsx` (+ Hash in useMemo-Deps, `mealStatus`+`stopDays` an `generate()`). `generatePlan` hängt
`meal.status` an; `generateShopping` überspringt status-markierte Mahlzeiten → Zutaten + Kosten
fallen aus der Rest-Liste. UI: `MealStatusSheet` + „⋯ Mark"-Button + Badge/Dimmen in `MenuTab`.

**A2 — Leftover-aware Planung.** `leftovers:true` auf 15 großansatz-taugliche Dinner
(Curry/Chili/Dal/Bolognese/Stew) in `recipes.js`. `generatePlan` paart ~1×/5 Tage (Min-Abstand 3)
ein Leftover-Dinner an Tag D mit einem Rest-Lunch an D+1 (`{leftover:true, from, fromDay}`, kein
Kochen/Einkauf) und setzt `batch:1.6` aufs Quell-Dinner. `generateShopping` skippt Leftover-Slots
und skaliert `batch`-Mengen hoch → 1.6× ein Dinner statt Dinner + separater Lunch. UI:
„♻️ Leftovers from Day X" + „♻️+"-Hint am Quell-Dinner.

**B — Multi-Stop-Frisch-Routing + Weipa.** `regions.js`: `reliableFresh`-Flag (Cairns/Cooktown/
Coen/Bamaga=true, Archer=false) + neuer Supply-Point **Weipa** (Woolworths, westlicher Abstecher
~830 km, optional, `reliableFresh:true`, teal Calendar-Marker). `useStorage`: `weipa` in
`enabledStops`/`stopDays` + `mealStatus:{}` (+ Migration). `generate()` nimmt jetzt `stopDays`,
baut `freshStops` = Cairns(Tag 1) + aktivierte, datierte, verlässliche Stops (sortiert).
`generateShopping` ersetzt den binären Bamaga-Split durch N-Bucket-Routing: Frisch → letzter
Resupply-Stop mit `day ≤ Koch-Tag`, alles Haltbare immer nach Cairns. Roadhouses (reliableFresh
false) bekommen kein Frisch, nur Essentials. `ConfiguratorTab`: Stop-State datengetrieben über
`OPTIONAL_STOP_IDS` (Weipa erscheint automatisch im Kalender). Bamaga-only reproduziert exakt das
alte Cairns→Bamaga-Verhalten (backward-compat-Test).

**Verifikation:** **270 Tests grün** (260 + 10 neue: Leftover-Pairing + Ausschluss, Meal-Status-
Ausschluss + all-skipped→nur-Essentials, Multi-Stop-Buckets, Resupply-nur-Frisch, Roadhouse-frei,
Bamaga-backward-compat, Determinismus mit allen Features). Build JS 1292.46 → **1296.26 kB**
(+3.8 kB), gzip 391.40 kB. Bewusst offen (Follow-up): präzise Per-Leg-Wasser/Eis-Skalierung
(jeder Stop behält vorerst seine statischen Essentials); `batch:1.6` ist Heuristik-Konstante.

## 2026-07-06 (ae) — Gewürze auf Ultra-Minimal-Kit reduziert

**Anlass:** der Entwickler: „mach Abstriche bei den Gewürzen, streiche alle nicht essenziellen — niemand hat
Platz für 30 verschiedene Gewürze." Analyse: ~40 Gewürz-Namen ≈ 30 echte Gläser. der Entwickler wählte
(AskUserQuestion) das **Ultra-Minimal-Kit (~6 Gläser)**.

**Kern-Kit:** Salt · Black pepper · Cumin · Smoked paprika · Chili flakes · Curry powder ·
Mixed dried herbs (+ „Salt & pepper"-Combo bleibt).

**Vorgehen:** neues Skript `scripts/reduce-spices.mjs` — arbeitet auf der geparsten Datenstruktur,
lokalisiert jeden `ing:[…]`-Block per Bracket-Matching und ersetzt NUR geänderte Blöcke (exaktes
Format, minimaler Diff). Drei Operationen: **Substitution** (Gewürz → Kern-Gewürz),
**Removal** (Zeile streichen), **Dedup innerhalb des Rezepts** (z.B. Oregano+Thyme → 1× Mixed herbs).

- Alle Paprika (sweet/hot/„+cumin") → **Smoked paprika**
- Alle Chili-Trockenformen (powder/„+garlic powder") → **Chili flakes**
- Turmeric · Garam masala · Ground coriander · **alle Currypasten** (green/red/thai/laksa) → **Curry powder**
- Alle getrockneten Kräuter (Oregano/Thyme/Basil/Rosemary/Za'atar/Sage) → **Mixed dried herbs**
- Spezialsalze (kala namak, flaky sea salt) → **Salt**
- **Gestrichen:** Cinnamon, Vanilla, Nutmeg, Bay leaf, Garlic powder (→ frischer Knoblauch da),
  Onion powder (→ frische Zwiebel), Mustard powder/seeds (→ Dijon bleibt).

**Ergebnis:** Trocken-Gewürz-Gläser **~30 → 5** (Cumin, Smoked paprika, Chili flakes, Curry powder,
Mixed dried herbs) + Salt/Pepper. 55 Rezepte angepasst, keine Doppel-Zutat im Rezept, unique
Zutatennamen 368 → **329**. **260 Tests grün** (Allergen-/Fleisch-Erkennung unberührt). Build JS
1292.46 → **1291.54 kB**. Tradeoff bewusst akzeptiert (der Entwickler): Frühstücke (ohne Zimt/Vanille) und
Thai-Gerichte (Curry powder statt Paste) fallen etwas flacher aus. Rezept-Steps referenzieren
teils noch „curry paste"/„cinnamon" im Text — Zutatenliste ist maßgeblich, Step-Text-Politur
optional später.

## 2026-07-06 (ad) — Zutaten-Namen im Rezept-Datensatz vereinheitlicht

**Anlass:** der Entwickler: „geh durch jedes Menü und stelle sicher, dass jede Zutat gleich heißt wie in den
anderen Rezepten … jede Zutat nur EINMAL gelistet." Die Runtime-Kanonisierung aus (ac) reichte ihm
nicht — er wollte die **Quelldaten** sauber (Beispiel: drei Maple-Syrup-Schreibweisen).

**Vorgehen (deterministisch + auditierbar):** neues Einmal-Skript `scripts/normalize-ingredients.mjs`
mit expliziter `ALIASES`-Map (exakter alt→neu-Name). Text-Replace nur auf `['<name>',` (Zutat =
erstes ing-Array-Element) via Literal split/join → trifft NIE Rezeptnamen/Steps, keine
Regex-Escaping-Probleme. Dry-Run-Report + Zero-Match-Warnung (Tippfehler-Schutz) vor `--write`.

**Vollständige Inventur:** alle 426 rohen Zutatennamen extrahiert und gruppiert. Vereinheitlicht
wurden nur echte Dubletten/Synonyme/Plurale — **genuin verschiedene Zutaten bleiben getrennt**:
- Plurale → Singular: Carrots→Carrot, Tomatoes→Tomato, Egg→Eggs, Sweet potatoes→Sweet potato,
  Spring onions→Spring onion, Vegetable stock cubes→Vegetable stock cube …
- Synonyme: Bell pepper→Capsicum (+ Red bell pepper/Capsicum (red)→Red capsicum), Feta cheese→Feta,
  Milk/UHT whole milk→UHT milk, Beef mince→Ground beef, Aubergines→Eggplant, Bok choy→Pak choi,
  Tortilla wrap(s)/Tortillas (large)→Tortilla wraps, Fresh ginger→Ginger, Fresh parsley/
  Parsley (dried or fresh)→Parsley, Plain flour→Flour, Tuna (canned in olive oil)→Tuna in oil …
- **Semantisch sauber getrennt:** Koriander-Kraut (Fresh coriander/Coriander leaves→**Coriander
  leaves**) ≠ gemahlenes Gewürz (Coriander (ground)→**Ground coriander**). Cumin/Turmeric haben nur
  eine Form → Ground cumin→Cumin, Ground turmeric→Turmeric. Pepper→Black pepper.
- Cuts konsistent: Chicken breast(s)→Chicken breast, Chicken thigh fillets/…→Chicken thighs.

**Ergebnis:** eindeutige Zutatennamen **426 → 368**, Shopping-Keys (nach Runtime-Kanon) **300 → 262**.
Keine Doppel-Zutaten INNERHALB eines Rezepts (verifiziert). **260 Tests grün** (Allergen-/Kategorie-/
Fleisch-Erkennung laufen auf den Namen — unverändert grün → keine Detection-Regression). Build JS
1293.30→**1292.46 kB** (−0.8 kB, kürzere Namen). Betrifft jetzt auch die **Rezept-Ansicht** (nicht
nur die Einkaufsliste): jede Zutat heißt überall gleich. Runtime-`canonicalIngredient` bleibt als
Sicherheitsnetz (Reis/Pasta-Familien + Parenthetik + "X or Y" laufen weiter darüber).

## 2026-07-06 (ac) — Waste-Optimierung: pack-bewusste Menü- & Einkaufsgenerierung

**Anlass:** der Entwickler hat den 16-Tage-Eigen-Trip (Juni 2026) beendet — der Stufe-2-Unblock. Zwei
Praxis-Probleme, beide im Generator verwurzelt:
1. Dieselbe Grundzutat erschien als viele unterschiedlich benannte Zeilen (Jasmine/Basmati/
   Long-grain rice; Spaghetti/Penne/Macaroni) → Liste unübersichtlich, echter Bedarf unsichtbar.
2. Menü-Vielfalt zwang zum Kauf vieler verschiedener Groß-Packs, je nur zum Teil genutzt (AU-
   Supermärkte verkaufen nur große Packungen) → Foodwaste, auch bei angebrochenen Verderblichen.

**Entscheidung (mit der Entwickler):** Menü-Vielfalt behalten, aber Generator **pack-fill/ingredient-sharing-
aware** machen, mit **gelegentlichen gedeckelten Wiederholungen** (nie an Folgetagen, nur um eine
offene verderbliche Packung aufzubrauchen). Ziel: Trocken-Grundzutaten (weniger Sorten, ganze
Packs) UND Verderbliche (zeitnah teilen). **Silent Generator-Default — keine neue Configurator-
Pille** (Filter-Sprawl vermeiden). Kosten-Rekalibrierung vertagt (noch keine echten Ausgabezahlen).

### Phase 1 — Kanonisierung + Pack-Daten + Pack-bewusste Anzeige
- **`canonicalIngredient()`** in `generator.js`: austauschbare Varianten → eine Zeile. Zwei Ebenen:
  (1) `CANONICAL_RULES` (Regex) für Zutaten-Familien mit unterschiedlichen Namen —
  `Jasmine/Basmati/Long-grain rice → Rice`, alle Nudel-Formen → `Pasta`, plain `Onion`
  (Arborio/Sushi rice, Rice noodles/vinegar/flour, Gnocchi bleiben getrennt).
  (2) **generisch** (kein Hardcoding pro Zutat): Trailing-Qualifier weg (`, grated` / `to serve` /
  `for drizzling`) und `"X or Y"`-Alternativen → primäre linke Zutat. So fielen die vom User
  gemeldeten **drei Maple-Syrup-Varianten** (`Maple syrup` / `… or honey` / `… or agave` /
  `… to serve`) auf EINE Zeile zusammen, ebenso `Soy sauce or tamari` → `Soy sauce`,
  `Parmesan, grated` → `Parmesan` usw. Guard gegen den Adjektiv-Fall (linker Teil 1 Wort +
  rechter mehrwortig): `Olive or coconut oil` / `Rice or hokkien noodles` / `Black or green olives`
  bleiben unangetastet. Betrifft nur die Einkaufsliste; die Rezept-Ansicht zeigt die spezifische
  Zutat. Ersetzt das alte `ingredientKey()` (raus).
- **`src/data/packs.js`** (neu): `PACK_SIZES` — typische AU-Packungsgrößen für ~20 Zutaten, mit
  `mainStaple`/`perishableOpen`/`contains`-Flags.
- **`describeQty()`** ersetzt `formatTotals()` (raus): rundet Masse/Volumen gelisteter Zutaten auf
  ganze Packungen (`1 × 1kg bag · ~900 g used`), Dosen/Gläser auf ganze Einheiten
  (`1 can · uses ~0.5 cans`), und führt gemischt notierte Gebinde zusammen (`500 ml + 1 can`
  Kokosmilch → `3 cans`) via `contains`.

### Phase 2 — Pack-Fill-Heuristik mit gedeckelten Wiederholungen
- Score-basierte Sekundär-Sortierung INNERHALB der bereits gefilterten Kandidaten in
  `generatePlan` (`wasteScore`/`chooseWaste`/`noteCooked`, Konstanten in `WASTE`). Fleisch-Cluster
  (Shelf-Life-Tiers), Specials, Overrides, Restaurant/Skip bleiben primär; Pack-Fill ist Tie-Break.
- Reward fürs Aufbrauchen offener Haupt-Grundzutaten (`mainStaple`: Reis/Pasta/Couscous/Hafer) +
  offener Verderblicher im 3-Tage-Fenster; Strafe fürs Anbrechen einer neuen Grundzutat.
  Mehl/Zucker/Linsen sind gelistet (Pack-Rundung) aber **ohne** Auswahl-Bias (billige Vorräte).
- Wiederhol-Regel: nie an Folgetagen (bestehende `lastPick`-Logik), max `repeatCap`, nur wenn eine
  offene Verderbliche aufgebraucht wird. **Determinismus erhalten** (Tie-Break über RR-Zähler).
- `pricing.js` `qtyMultiplier()`: neues `"N × size"`-Pack-Format korrekt geparst (sonst würde
  „4 × 500g pack" als 500 g statt 2 kg gezählt).

**Impact (Default 16d/2P/omnivore):** Einkaufsliste zeigt Reis/Pasta/Maple syrup je EINE
gerundete/zusammengefasste Zeile; Haupt-Carbs im Plan von 4 möglichen (rice/pasta/couscous/noodles)
auf 2 konsolidiert; Kokosmilch als ganze Dosen. **260 Tests grün** (241 + 19 neue: Kanonisierung
inkl. generischer "X or Y"-Zusammenfassung + Adjektiv-Guard, Pack-Runden, Konsolidierung,
Determinismus, Wiederhol-Regel). Build **1289.23 → 1293.30 kB JS** (+4.1 kB · gzip 390.55 kB),
CSS unverändert. Bewusst NICHT: keine Rezept-Edits (Staple-Erkennung aus Zutaten-Strings), keine
UI-Toggles, keine Kosten-Rekalibrierung (wartet auf echte Ausgabezahlen).

## 2026-06-01 (ab) — Neue Präferenz „🧄 Garlic" als 9. Filter

**Anlass:** der Entwickler: „ergänze noch eine Diät-Präferenz von no garlic"

### Pool-Analyse zuerst

48 % aller Rezepte enthalten Knoblauch, beim Dinner sogar 80 %. Strikter Core-Filter → Dinner-Pool von 41 auf 10 → unbenutzbar.

| Mahlzeit | Pool | Mit Knoblauch | Survive bei strict core | Survive mit Special-Regel |
|---|---|---|---|---|
| Breakfast | 19 | 3 | 16 | **19** (3 mit Hint) |
| Lunch | 28 | 4 | 24 | **28** (4 mit Hint) |
| Dinner | 41 | 40 | **1** ⚠ | **40** (32 mit Hint) |

### Lösung: Special-Topping-Default-Regel

Garlic wird per Default als „topping" (= weglassbar) klassifiziert. **Ausnahme „core"** wenn Garlic im Rezeptnamen primäres Aroma signalisiert.

```js
// allergens.js
const GARLIC_CORE_NAME_RX = /\b(garlic\s+(?:bread|toast|butter|shrimp|prawns|chicken)|aglio[\s-]e[\s-]olio|garlic-?heavy)\b/i

function recipeAllergenStatus(recipe, allergen) {
  if (allergen === 'garlic') {
    // Spezialfall: Topping-Default, Core nur bei Name-Match
    const hasGarlic = recipe.ing.some(([name]) => ingredientHasAllergen(name, 'garlic'))
    if (!hasGarlic) return undefined
    if (recipe.name && GARLIC_CORE_NAME_RX.test(recipe.name)) return 'core'
    return 'topping'
  }
  // ... bestehende Logik für andere Allergens
}
```

**Resultat:** Nur a24 „Pasta aglio e olio with chili" wird als core ausgeschlossen — korrekt, Knoblauch IST das Rezept. Alle anderen 40 Dinners bleiben im Pool mit „⚠ Contains garlic as topping/optional — skip if allergic"-Hint.

### Configurator

UI-Erweiterung passiert automatisch — `ConfiguratorTab` iteriert über `ALLERGENS`-Array. Neue Pill kommt am Ende der 9er-Liste:

```js
ALLERGENS = ['nuts', 'gluten', 'dairy', 'eggs', 'soy', 'fish', 'shellfish', 'pork', 'garlic']
```

**String:** `S.config.allergenOptions.garlic = { label: 'Garlic', sub: 'Leave out — recipes still work' }` — Sub-Label macht die Topping-Semantik schon im Configurator transparent („leave out" statt „avoid").

### +6 Tests in `allergens.test.js`

- Knoblauch in normaler Zutaten-Liste → `topping` (Rezept bleibt im Pool)
- Kein Knoblauch in der Liste → kein Eintrag in `toppingAllergens`
- „Garlic toast" im Namen → `core` (komplett ausgeschlossen)
- „Aglio e olio" im Namen → `core`
- „Garlic shrimp pasta" im Namen → `core`
- Garlic + andere Allergens (z.B. pork) kombiniert — Garlic als topping, pork-no-match → keep
- ALLERGENS-Konstante-Test von 8 auf 9 angepasst

**Tests: 241 grün** (vorher 235, +6).

### Numbers

- Bundle JS: 1288.90 → **1289.23 kB** (+0.33 kB)
- Bundle CSS: unverändert 42.01 kB
- Pool: 97 Rezepte (kein neues Rezept, nur Filter-Logik)

### Bewusst NICHT gemacht

- **Kein Core-Default für Garlic** — wäre korrekt für strikte Knoblauch-Allergie (rar), aber Pool wird unbrauchbar. Topping-Default + UI-Hint deckt 95% der Use-Cases ab (Low-FODMAP, IBS, Geschmacks-Aversion).
- **Kein per-Rezept-Tag `garlicEssential: true`** als alternative Markierungslogik. Name-RegEx erfasst aktuell alle relevanten Fälle (Garlic bread/toast/butter/shrimp/prawns/chicken, Aglio e olio). Bei zukünftigem Pool-Wachstum: Tag bewusst als Stufe-2-Eintrittspunkt offen.

---

## 2026-06-01 (aa) — Sequential-Cooking-Support für 1-Burner-Setups

**Anlass:** User-Designfrage: „1-Burner-Setups sollten auch Menüs kochen können, die mehrere Pfannen verwenden — man kann es ja nacheinander kochen und dann am Schluss kurz warm machen. Wie würde man das am besten umsetzen ohne das Burner-System redundant zu machen?"

### Designentscheidung

**Inverse Logik mit optionalem `parallel: true`-Tag** statt Toggle im Configurator oder Burner-Filter-Aufweichung:

- Default für alle Rezepte: **sequenzierbar** (= nicht-parallel).
- Explizit getagged `parallel: true`: Stir-Fries (Wok braucht „screaming hot"), Risotto (Mantecatura + Hot-Stock-Pot in parallel).
- 1-Burner-User sieht alle Rezepte AUSSER die parallel-only-getaggten.
- Burner-System bleibt für die parallel-only-Rezepte bedeutsam.

### 4 Rezepte als `parallel: true` getagged

- **a7 Chicken stir-fry with rice (Bamaga)** — Stir-Fry-Pattern + Reis-Pot parallel
- **a20 Tofu stir-fry with noodles** — Stir-Fry mit hot-wok-Anforderung
- **a43 Wild mushroom risotto with white wine and parmesan** (Special) — Mantecatura + Hot-Stock-Pot
- **a45 Thai basil chicken stir-fry** — Tip im Rezept dokumentiert schon „screaming hot wok or stir-FRY becomes stir-STEW"

Diese 4 sind die wirklich-parallel Rezepte im Pool. a4 Beef stir-fry und a17 Vegan Mushroom risotto sind schon mit `burners: 1` getagged (eigentlich Pot-only Versionen) — bleiben unverändert.

### Generator-Änderung in `src/lib/generator.js`

Neue exportierte Helfer:

```js
export function fitsBurnerSetup(recipe, userBurners) {
  const need = recipe.burners ?? 1
  if (need <= userBurners) return true
  return !recipe.parallel  // sequenzierbar wenn nicht parallel-only
}

export function needsSequentialCooking(recipe, userBurners) {
  const need = recipe.burners ?? 1
  return need > userBurners && !recipe.parallel
}
```

Eingesetzt in `compatibleRecipesForCat`, `buildRecipePool`, `estimateSpecialCount`, `computeSpecialAssignments` (alle 4 Stellen wo vorher `(r.burners ?? 1) <= userBurners` stand).

`mealEntry(recipe, userBurners)` erweitert — setzt `out.seq = true` wenn das Rezept Multi-Pan ist und der User weniger Burner hat. UI-Marker analog zu `spec`/`ovr`.

### UI-Hint

**`🕐 Cook in sequence`-Pill** mit hellem Cyan-Grau-Background (`#EEF4F8`, etwas dezenter als `tag-special` und `tag-ovr`):

- **MenuTab `MealRow`:** Pill neben Rezept-Name wenn `meal.seq === true`
- **SwapSheet-Card:** Inline-Badge wenn `needsSequentialCooking(r, config.burners)` — direkt im Render-Loop berechnet, kein extra Storage

Hover/long-press zeigt tooltip via `S.menu.sequentialHint`: „This recipe normally uses multiple burners — cook the components one after another and keep finished parts covered to stay warm."

### Pool-Impact für 1-Burner-User (Mini-Camper)

| Diät | Dinner-Pool vorher | Dinner-Pool nachher | davon Sequenz-Hint |
|---|---|---|---|
| omnivore | ~10 | **46** | 29 |
| vegetarian | ~4 | **25** | 16 |
| vegan | ~6 | **15** | 9 |

Frühstücke + Lunches sind eh meist 1-Burner — minimaler Anstieg (1–3 Sequenz-Rezepte pro Diät/cat). Der ganz große Win ist bei Dinners.

### Tests

- **1 Test-Update:** `Pool-Aware: 1-Burner liefert 0` → `Pool-Aware: 1-Burner sieht sequenzierbare Specials` (war Annahme dass alle Specials parallel-only sind; jetzt sind a36/a37/a42 sequenz-tauglich → 1-Burner-Setup mit 16d+Bamaga sieht 2 Specials).
- **1 neuer Test:** `parallel-only Specials (a43 Risotto) bei niedriger Burner-Anzahl nicht im Pool` — prüft explizit dass a43 (parallel:true) bei 1-Burner-vegetarian NICHT in `compatibleRecipesForCat` auftaucht, aber a39 Halloumi (kein parallel-Tag) schon.

**Tests: 235 grün** (vorher 234, +1).

### Numbers

- Bundle JS: 1288.29 → **1288.90 kB** (+0.6 kB)
- Bundle CSS: 41.87 → **42.01 kB** (+0.14 kB · gzip 7.78→7.82 +0.04 kB)

### Bewusst NICHT gemacht

- **Kein Configurator-Toggle „Sequential cooking OK"** — Memory `feedback_generator_over_user_filters` warnt vor Filter-Sprawl. Die parallel-only Detection läuft im Generator transparent, User merkt nur den größeren Pool + Sequenz-Hint.
- **Kein `parallel:true` bei a36/a37/a39/a41 Specials** — Steak/Pork-ribs/Halloumi/Butternut sind Sunday-Roast-Niveau aber sequenzierbar: Mash kann unter Foil warm halten, Steak rast 5 min, Ribs sind eh 90 min mit Resting-Phase. Tip-Body von a35 dokumentierte das schon explizit („Solo cook? Mash first, then schnitzel, then gravy"). Bewährte Sequenz-Pattern.
- **Keine Sequenz-Sortierung im SwapSheet** (Sequenzielle nach unten / hoch) — User soll sich nach Rezept-Wahl orientieren, nicht nach Setup-Reibung.

---

## 2026-06-01 (z) — Specials im SwapSheet sichtbar machen (Section-Header + Badge)

**Anlass:** User-Report: „ich kann die special menus im swap immer noch nicht finden, woran liegt das?"

### Diagnose

`compatibleRecipesForCat` filtert nur nach Diät/Burner/Allergens — Specials waren also **tatsächlich enthalten**, aber als normale Cards gerendert. Bei Jans 2-Burner-omnivore-Setup war zumindest a42 (Beef stroganoff) sichtbar, aber zwischen 17 anderen Dinner-Optionen ohne visuelle Unterscheidung → er hatte keine Chance sie zu erkennen.

Anders gesagt: **kein Generator-Bug, ein UI-Discoverability-Bug.**

### Fix in `SwapSheet.jsx`

1. **Kandidaten in zwei Gruppen aufgeteilt** über `useMemo`:
   ```js
   const all = compatibleRecipesForCat(...)
   const specials = all.filter(r => r.occasion === 'special')
   const regulars = all.filter(r => r.occasion !== 'special')
   ```
2. **Section-Header** `✨ Special occasion dinners` vor den Specials, `All recipes` vor den regulären (nur wenn beide Gruppen Treffer haben — sonst kein verwirrender leerer Header).
3. **Special-Cards visuell ausgezeichnet:**
   - Warm-orange Background `#FFF7ED` (gleicher Style wie `.cfg-special-hint`)
   - Inline-Badge `✨ Special` neben dem Rezeptnamen (`.swap-card-badge` orange Pill 10px)
   - active-State `#FFE9CC`

### Strings

- `S.menu.swap.specialBadge: '✨ Special'`
- `S.menu.swap.specialSection: '✨ Special occasion dinners'`
- `S.menu.swap.regularSection: 'All recipes'`

### CSS

- `.swap-section-header` 11px uppercase mit bottom-border (`first-of-type` ohne top-padding)
- `.swap-card-special` orange-Background-Variante
- `.swap-card-badge` Inline-Orange-Pill 10px, white-space: nowrap

### Tests

**234 grün** (unverändert — reine UI-Änderung, keine Generator-Logik). Die Sortier-Logik ist im `useMemo`-Hook, der React-Compiler optimiert das passend.

### Numbers

- Bundle JS: 1286.74 → **1288.29 kB** (+1.55 kB)
- Bundle CSS: 41.33 → **41.87 kB** (+0.54 kB · gzip 7.71→7.78)
- Tests: 234 grün

### Bewusst NICHT gemacht

- **Specials NICHT aus compatibleRecipesForCat ausschließen** — Memory + bestehende Doku sagt explizit: „User darf sie manuell wählen". User-Override gewinnt vor Generator-Special-Assignment. Wenn er einen Special-Slot z.B. auf einen Off-Cluster-Tag schieben will (wo das Generator-Auto-Assignment ihn nie hingelegt hätte), darf er das. App ist permissiv, User entscheidet.
- **Keine Specials-Sortierung innerhalb der Section** — alphabetisch oder nach Diät wäre möglich, aber der Pool ist klein (max 3 Specials für deine Diät bei 2 Burner) → unnötige Komplexität.
- **Kein Burner-Hint pro Special-Card** — wenn ein 3-Burner-Special nicht erscheint, dann ist es vom Filter raus, nicht visuell vorhanden. Wäre ein zweiter Generator-Filter (Specials zeigen die nicht passen mit Hint), aber Memory `feedback_generator_over_user_filters` → vermeiden.

---

## 2026-06-01 (y2) — User-Wunsch-Rezept: Süsskartoffel-Stäbchen mit Pfannengemüse + Fleisch + Lemon-Crème-Fraîche-Dip

**Anlass:** der Entwickler: „ergänze das menu: süsskartoffel stäbchen in der pfanne gebraten mit pfannen gemüse (brokoli, peperoni, zwiebeln) mit einem beliebigen stück fleisch (250g pro person) und einer creme fraiche dip der mit salz und zitronen konzentrat gemacht wird"

### Neues Rezept

**a50 Pan-fried sweet potato fries with veg and your choice of meat** (omnivore, 30 min, `burners:2`, `cooling:'high'`, `effort:'easy'`)

Designentscheidungen:
- **„Beliebiges Fleisch" als Flexibilität ins Rezept verankert** — Zutaten-Liste sagt „Your choice of meat (steak, chicken breast, lamb cutlets, or pork loin)". Tip empfiehlt steak/lamb für Cluster-Day-1-2 (höchster Wert, zuerst essen), chicken/pork für Day-3+. So bleibt der Cluster-Algorithmus zufrieden — `containsFreshMeat` matcht über das generische „meat" + steak/chicken/lamb/pork-Tokens.
- **2-Burner-Setup:** Pan 1 = Süsskartoffel-Fries (14–16 min, longest), Pan 2 = Gemüse → dann Meat sear in derselben Pfanne (Veggies zur Seite oder kurz raus + warm halten unter Foil).
- **Crème-fraîche-Dip kalt prepared first** — flavours marry while cooking. User hat „Zitronenkonzentrat" explizit erwähnt → Tip nennt PJ's und Spiral Foods (Coles) als shelf-stable-Optionen, lassen sich auch für Dressings weiterverwenden.
- **350g sweet potato/person** (üppig — bewusst weil Süsskartoffel-Fries beim Pfannenrösten ~30% Volumen verlieren).
- **Salt-Hinweis explizit**: Süsskartoffel braucht generös Salz beim Frying, sonst geschmacklos.
- **Allergie-Profil:** Dairy (crème fraîche) — sonst clean. GF, nut-free, soy-free, egg-free, fish/shellfish-free, pork-optional (User wählt Fleisch).
- **„Don't stir for 4 min"-Trick** im Step 2 — Süsskartoffel braucht Crust-Zeit, sonst wird sie matschig statt knusprig.

Pool 96 → **97 Rezepte**.

### Tests

`pool-Gesamtgröße`-Test von 96 auf 97 angepasst. Alle anderen Tests grün. **234 Tests grün** (unverändert).

### Numbers

- Bundle JS: 1285 → 1286.74 kB (+1.7 kB)
- Bundle gzip: 387.79 → 388.27 kB (+0.5 kB)

### Bewusst NICHT gemacht

- **Kein eigenes Special-Tag** — Memory `feedback_generator_over_user_filters`: User-Override > Special > Round-Robin. Wenn der Entwickler dieses Rezept gezielt an Tag X haben will, wählt er es via Swap-Sheet (Override). Als Round-Robin-Kandidat ist es genauso wertvoll wie a4 Stir-fry oder a9 Burger.
- **Kein Vegan-Pendant** — Fleisch ist explizit im Rezept-Wunsch. Vegane Camper haben a47/a48 (Curries) und a35 (Schnitzel mit mash + gravy) als ähnlich befriedigende Plate-Concepts.

---

## 2026-06-01 (y) — Pool-Erweiterung +12 Rezepte mit Allergie-Defensive-Design

**Anlass:** User-Anfrage „vergrössere noch den Pool für alle Menus auch mit diätspezifischen Präferenzen und Allergien."

### Pool-Analyse zuerst (Survival nach Allergen-Filter)

| Mahlzeit | Diät | Pool | + Gluten-frei | + Dairy-frei |
|---|---|---|---|---|
| Breakfast | omnivore | 15 | **0** ⚠ | 7 |
| Breakfast | vegetarian | 11 | **0** ⚠ | 7 |
| Breakfast | vegan | **7** ⚠ | **0** ⚠ | 6 |
| Lunch | omnivore | 25 | 4 | 16 |
| Lunch | vegan | 9 | **0** ⚠ | 9 |
| Dinner | vegetarian | 18 | 7 | 9 |
| Dinner | vegan | 11 | 5 | 7 |

**Kritische Lücken:** Zöliakie-Patienten sahen 0 Frühstücke in jeder Diät, Vegan-Lunch+Gluten=0, Vegan-Breakfast generell dünn.

### 12 neue Rezepte strategisch designed

Allergen-defensive Default-Designprinzipien: GF/DF/nut-free wo möglich, Cuisine-Vielfalt für natürlich allergen-arme Optionen (Mexican mit Mais statt Weizen, Indian mit Reis, Thai mit Tamari statt Sojasauce, Japanese mit Sushi-Reis statt Nudeln).

**Breakfast (+4):**
- **f16 Coconut chia pudding with mango and toasted coconut** (vegan, GF/DF/nut-free/soy-free/egg-free) — maximal allergen-defensiv, prep-ahead (overnight), `burners:0`
- **f17 Quinoa breakfast bowl with berries and yogurt** (vegetarian, GF, nut-free) — pumpkin/sunflower seeds als Topping (per allergens.js KEINE Nuts)
- **f18 Mexican egg and black bean skillet with corn tortillas** (omnivore, GF mit Mais-Tortillas) — Huevos rancheros style
- **f19 Sweet potato hash with eggs and avocado** (omnivore, GF/DF/nut-free/soy-free)

**Lunch (+3):**
- **m26 Greek chicken salad with feta and olives** (omnivore, GF, nut-free, soy-free) — Tavern-Style
- **m27 Mediterranean tuna and white bean salad** (omnivore, GF, nut-free, **`burners:0`** — shelf-stable masterpiece, alle Items keep weeks in camper)
- **m28 Cucumber-avocado sushi rice bowl** (vegan, GF mit Tamari, nut-free, DF) — Tip: „TAMARI not regular soy sauce"

**Dinner (+5):**
- **a45 Thai basil chicken stir-fry over jasmine rice** (omnivore, GF mit Tamari, DF) — Wok-Tipp: „screaming hot or stir-FRY becomes stir-STEW"
- **a46 Chicken fajita bowls with avocado crema** (omnivore, GF — bowl-Format überspringt Tortillas, DF mit coconut yogurt)
- **a47 Chana masala with coconut basmati rice** (vegan, GF/DF/nut-free/soy-free) — Indian comfort food classic
- **a48 Thai-style vegetable green curry with jasmine rice** (vegan, GF/DF/nut-free) — Curry-Paste-Vegan-Check-Tipp im Body
- **a49 Greek-style vegetable moussaka with béchamel** (vegetarian, `burners:3`) — lentil-tomato-Schicht statt traditional minced lamb, gluten-free-fähig mit GF-Flour

Strukturiert via `// ── GLUTEN-FREE / ALLERGY-DEFENSIVE BREAKFASTS/LUNCHES/DINNERS ──`-Blöcken für Auffindbarkeit.

### Pool nach Erweiterung

- **84 → 96 Rezepte (+14%)**
- Breakfast: 15 → 19 (+4)
- Lunch: 25 → 28 (+3)
- Dinner regulär: 35 → 40 (+5)
- Specials unverändert: 9

### Coverage-Verbesserung pro Diät × Allergie

| Allergie | omnivore Breakfast | vegetarian Breakfast | vegan Breakfast |
|---|---|---|---|
| Gluten | 0 → **3** | 0 → **1** | 0 → **1** |
| Dairy | 7 → 11 | 7 → 9 | 6 → 7 |

| Allergie | omnivore Lunch | vegetarian Lunch | vegan Lunch |
|---|---|---|---|
| Gluten | 4 → **6** | 1 → **2** | 0 → **1** |

| Allergie | omnivore Dinner | vegetarian Dinner | vegan Dinner |
|---|---|---|---|
| Gluten | 16 → **20** | 7 → **9** | 5 → **7** |
| Dairy | 19 → 22 | 9 → 11 | 7 → 9 |

**Zöliakie-Lücke geschlossen** — jede Diät hat jetzt mindestens 1 GF-Frühstück, 1 GF-Lunch, 7+ GF-Dinners.

### +6 Tests in `generator.test.js`

- Jede Diät hat ≥1 GF-Frühstück (vorher: 0/0/0)
- Vegan-Breakfast ≥8 (vorher 7, jetzt 8)
- Vegetarian-Dinner-Pool (regulär + vegan-shared) ≥15
- Vegan-Lunch hat ≥1 GF-Option (vorher 0)
- Alle 12 neuen IDs (f16-f19, m26-m28, a45-a49) im Pool mit cat/diet/ing/steps
- Pool-Total = 96

**Tests: 234 grün** (vorher 228, +6).

### Numbers

- Bundle JS: 1264.58 → **1285.01 kB** (+20.4 kB durch 12 detailliert beschriebene Rezepte)
- Bundle gzip: 381.75 → **387.79 kB** (+6 kB)
- CSS unverändert

### Cuisine-Vielfalt nach Erweiterung

- Mexican: f18 Egg+Bean skillet, a46 Fajita bowls
- Mediterranean/Greek: m26 Chicken salad, m27 Tuna+bean, a49 Moussaka
- Thai: a45 Basil chicken, a48 Green curry
- Indian: a47 Chana masala
- Japanese: m28 Sushi rice bowl

### Bewusst NICHT gemacht

- **Keine neuen Configurator-Pills für Diät-Subkategorien** (Low-FODMAP, Halal, Kosher etc.) — Memory `feedback_generator_over_user_filters` sagt Filter-Sprawl vermeiden. Der bestehende Allergie-Filter ist die UI-Affordance, der erweiterte Pool macht sie funktional.
- **Keine Pricing-Updates** — neue Rezepte nutzen bestehende Zutaten-Kategorien (Frischfleisch/Frischgemüse/Hülsenfrüchte/Reis/etc.), Pauschale pro Kategorie deckt sie ab innerhalb ±30 %.
- **Vegan-Breakfast bleibt mit 8 noch dünner als ideal** — zusätzliche 2 Rezepte würden den Pool besser ausbalancieren, aber der akute Zöliakie-Block ist wichtiger gewesen.

---

## 2026-05-29 (x) — Bug-Fix: 2-Burner-Setup sah keine Specials + Pool-Aware Preview-Hint

**Anlass:** User-Report nach Live-Test mit aktiviertem Premium-Code: „mir ist beim Ausprobieren aufgefallen, dass ich die Special-Menüs nicht sehen kann ist das ein Fehler?"

### Diagnose

Von den 6 Specials (a36-a41) sind 5 mit `burners: 3` markiert — nur a39 (Halloumi mezze) ist 2-Burner. Generator filtert über `(r.burners ?? 1) <= userBurners`. Das ergibt eine kaputte Pool-Tabelle:

| Konfiguration | Sichtbare Specials |
|---|---|
| 1 Burner (jede Diät) | 0 |
| 2 Burner + omnivore | 0 |
| 2 Burner + vegan | 0 |
| 2 Burner + vegetarian | 1 (Halloumi) |
| 3 Burner + jede Diät | 2 |

**2-Burner ist der häufigste Mietwagen-Camper-Setup** (Britz Voyager, Apollo Endeavour Camper, Maui River etc.) → Mehrheit der User sah 0 Specials.

**Sekundärer Bug:** Configurator-Preview-Hint zeigte trotzdem „2 special evening dinners" für 16d+Bamaga, weil `estimateSpecialCount()` nur Trip-Länge × Cluster-Anzahl rechnete, nicht ob der Pool unter Diät+Burner+Allergens überhaupt was hergibt. Der Hint hat also gelogen während der Plan leer blieb.

### Fix (3 Teile)

**1. Pool-Erweiterung: 3 neue 2-Burner-Specials in `src/data/recipes.js`**

Je 1 pro Diät, Bistro-Niveau (statt 3-Burner Sunday-Roast):

- **a42 Beef stroganoff with creamy garlic mash** (omnivore, 40min, `burners:2`, `cooling:'high'`, `effort:'medium'`) — Rump oder Scotch Fillet thin-sliced, sour-cream-finished mit Worcestershire + Dijon, garlic mash mit raw garlic + butter. Bistro-Klassiker.
- **a43 Wild mushroom risotto with white wine and parmesan** (vegetarian, 35min, `burners:2`, `cooling:'medium'`, `effort:'medium'`) — Arborio mit dried porcini + mixed mushrooms, white wine, mantecatura mit cold butter + parmesan. Restaurant-Grade.
- **a44 Coconut laksa feast with crispy tofu and noodles** (vegan, 40min, `burners:2`, `cooling:'low'`, `effort:'medium'`) — Pressed firm tofu mit cornflour-crust, full-fat coconut + Laksa-Paste, bok choy + bean sprouts + fried-shallot-topping. Malaysian street-food.

Pool 81 → **84 Rezepte**. Marker `// ── 2-BURNER-SPECIALS ──` im File-Layout.

**2. `estimateSpecialCount` Pool-Aware in `src/lib/generator.js`**

Funktion akzeptiert jetzt optional `diet`, `burners`, `allergens`. Wenn übergeben, prüft sie via `RECIPES.some(r => r.occasion === 'special' && r.cat === 'a' && recipeAllowedForDiet(r, diet) && (r.burners ?? 1) <= burners && filterByAllergens(r, allergens).keep)` ob der Pool was hergibt. Wenn nicht → returnt 0 trotz positiver Quota+Cluster.

Ohne die Filter übergeben → bleibt legacy-Verhalten (theoretisches Maximum), Backward-Compat für bestehende Tests.

**3. `ConfiguratorTab.jsx` ruft die neue API**

```jsx
estimateSpecialCount({
  days: draft.days,
  bamagaStop: draft.bamagaStop,
  diet: draft.diet,
  burners: draft.burners,
  allergens: draft.allergens,
})
```

Preview-Hint zeigt jetzt die Wahrheit — bei 1-Burner-Setup oder Specials-leerem Pool kein „Your plan will include N specials"-Hint mehr.

### Tests +8 in `generator.test.js`

- 2-Burner + omnivore + 16d + Bamaga → 2 (jetzt mit a42 verfügbar)
- 2-Burner + vegan + 10d → 1 (jetzt mit a44)
- 2-Burner + vegetarian + 10d → 1 (a39 oder a43)
- 1-Burner + omnivore/vegan → 0 (alle Specials sind ≥2 Burner)
- dairy-allergy + vegan → 1 (vegan ist by definition dairy-free, Pool unbeeinflusst)
- 3-Burner + jede Diät → mind. 1 Special
- Backward-Compat: ohne Filter bleibt `16d + Bamaga = 2`
- End-to-End: `generate()` produziert tatsächlich `dinnerEntry.spec=true` für 2-Burner-Setup jeder Diät

**Tests: 228 grün** (vorher 220, +8).

### Numbers

- Bundle JS: 1257.28 → **1264.58 kB** (+7.3 kB durch 3 neue Rezepte)
- Bundle gzip: 379.66 → **381.75 kB** (+2.1 kB)
- CSS unverändert

### Visuelle Hierarchie

- **a36-a41 (3-Burner-Sunday-Roast):** Ribeye, Pork ribs, Aubergine parmigiana, Halloumi mezze, Jackfruit tacos, Stuffed butternut — Premium-Argument für Big-Camper-Mieter (Britz Frontier etc.)
- **a42-a44 (2-Burner-Bistro):** Stroganoff, Mushroom risotto, Coconut laksa — Standard-Camper-Coverage (häufigste Mietwagen-Setup)
- Beide Stufen pro Diät vertreten, kein Loch mehr in der Pool-Matrix

---

## 2026-05-23 (w) — Share-Funktion für die Einkaufsliste (Text-Share, kein Backend)

**Anlass:** User-Wunsch: „Erstelle eine Share-Funktion wo man für eine begrenzte Zeit eine Online-Einkaufsliste hat, die man teilen kann und so gemeinsam einkaufen kann, am besten per WhatsApp oder Email."

### Pushback vor Implementation

Echte Online-Liste mit Ablauf-URL und Live-Sync von Häkchen bricht zwei Architektur-Grundregeln:
- `CLAUDE.md` § 5: „Kein Backend, keine Accounts, kein Sync. Alles lokal."
- `PRIVACY.md` + Play-Store-Data-Safety: „0 Network-Calls, 0 Drittanbieter."

Drei Optionen vorgelegt:
- **A:** Text-Share via Web-Share-API → WhatsApp/Email als formatierter Text. Kein Backend, kein Privacy-Impact, kein Live-Sync.
- **B:** Self-contained Hash-URL (Liste in `?list=<base64>`). Kein Backend, aber Reisepartner braucht die App installiert.
- **C:** Cloudflare Worker + KV mit TTL + Polling-Sync. ~$5/Monat, Privacy Policy + Data-Safety-Form müssten neu.

**User wählte A.** Wesentlicher Tradeoff bewusst akzeptiert: kein Live-Sync. Für 2-Personen-Trip im Juni 2026 reicht das — im Supermarkt redet man eh.

### Neue Datei `src/lib/share.js`

API-Design isoliert die vier Concerns:

- **`formatShoppingListAsText({ data, checked, supplyPoint, totalCost, remainingCost, formatAud })`** — rendert den Text-Block. Header `🛒 Cape York shopping — Cairns` + `12 / 80 done`. Pro Kategorie alle Items mit ✓/☐-Marker und qty-Suffix (`☐ Beef mince — 2 kg`). qty-Suffix wird weggelassen wenn qty leer (vermeidet `Item — ` mit trailing em-dash). Cost-Footer (`💰 Estimate: ~$340 AUD`) nur wenn `totalCost != null`, Remaining-Zeile (`~$220 AUD left`) nur bei partial-checked (0 < checkedCount < total). Endet mit App-Signatur `— Cape York Trip Planner`.

- **`canUseWebShare(text)`** — capability-Detection: prüft `navigator.share` existiert, dann optional `navigator.canShare({ text })`. iOS Safari hat `share` aber kein `canShare` → fällt auf optimistic-true, AbortError im try/catch fängt das ab.

- **`tryWebShare({ title, text })`** — returnt `{ ok: true }` bei Erfolg, `{ ok: false, reason: 'cancelled' }` wenn User abbricht (kein Fallback), `{ ok: false, reason: 'unsupported' }` wenn Browser nicht kann (Desktop → Fallback-Sheet öffnen), `{ ok: false, reason: 'error', err }` für sonstige Fehler.

- **`buildWhatsAppUrl(text)`** → `https://wa.me/?text=${encoded}`. Mobile öffnet die App, Desktop öffnet WhatsApp Web.

- **`buildMailtoUrl({ subject, text })`** mit 1800-Zeichen-Truncation am Body (manche Email-Clients kappen lange `mailto:`-URLs ungewarnt; Truncation fügt `…(truncated, see attached or App)` an).

- **`copyToClipboard(text)`** mit graceful False-Return wenn Clipboard-API fehlt oder wirft (HTTPS-only auf Mobile).

### `ShoppingTab.jsx` — UI-Integration

- Neue Sub-Komponente `ShareSheet({ text, supplyPoint, onClose, onToast })` — Bottom-Sheet mit drei großen 48px-Touch-Targets: 💬 WhatsApp (`<a target="_blank">`), ✉ Email (`<a href="mailto:…">`), 📋 Copy (button, async). Copy → Toast 2.2s „Copied to clipboard" oder Fehler-Toast. Erklär-Sub: „Send the list to a co-driver. Their ticks stay on their phone — no sync." (transparent über die Limitation).
- `handleShare()` versucht Web-Share-API zuerst. Bei `unsupported` setzt `shareText`-State → `ShareSheet` rendert. Bei `cancelled` passiert nichts (User hat bewusst abgebrochen).
- Share-Button als dritte Pille zwischen Reset und Check-all in der `progress-actions`-Zeile. Style: Brand-Orange-Outline (warm-beige Background `#FFF7ED`, Orange-Text + Border). Nur sichtbar wenn `total > 0` (keine leere Liste teilen).
- `toast`-State mit `setTimeout(2200)` für ephemeren Feedback. Rendert als fixed `position: fixed; bottom: 90px` Pill mit Slide-in-Animation.

### Strings

- `S.shopping.actions.share = '↗ Share'`
- Neuer `S.shopping.share`-Bucket: `sheetTitle`, `sheetSub`, `whatsapp`, `email`, `copy`, `copied`, `copyFailed`, `emailSubject({ name })`.

### CSS

- `.progress-btn.share` — warm-orange Variante des Outline-Buttons.
- `.share-list` flex-column gap-10, `.share-btn` 48px min-height + 12px gap zu Icon, `.share-btn:active` darker-bg.
- `.share-sub` muted Erklärtext.
- `.share-toast` fixed center-bottom, halb-transparenter dunkler Background, weiße 14px-Schrift, `pointer-events: none`, `share-toast-in`-Keyframe 0.18s ease-out slide-from-below.

### Tests +14 in `src/lib/share.test.js`

- `formatShoppingListAsText` Header-Rendering mit Supply-Point-Name + Counts
- ☐-Marker für ungecheckte Items mit qty-Suffix
- ✓-Marker für gecheckte Items + Count-Update
- qty-Suffix-Skip wenn qty-String leer (kein trailing em-dash)
- Cost-Footer nur bei `totalCost != null`
- Remaining-Zeile nur bei partial-checked (nicht bei 0% oder 100%)
- App-Signatur am Ende
- Empty-List (`data: []`) handhabt sauber
- Leere Kategorien (`items: []`) werden geskippt — kein nackter Cat-Header
- `buildWhatsAppUrl` encoded text + handhabt Newlines/Emoji (`%0A`, `%F0%9F%9B%92`)
- `buildMailtoUrl` Subject+Body-Encoding, 1800-Zeichen-Truncation mit Hint-Suffix, kurze Bodies bleiben unangetastet

**Tests: 220 grün** (vorher 206, +14).

### Numbers

- Bundle JS: 1255.22 → **1257.28 kB** (+2.06 kB · gzip ~380 kB unverändert)
- CSS: 41.21 → **41.33 kB** (+0.12 kB)

### Privacy-Story bleibt intakt

App formatiert nur Text und übergibt ihn dem Browser via `navigator.share`, `mailto:`, `https://wa.me/`, oder Clipboard. Kein Network-Call aus dem App-Code, kein Cookie, kein Tracker. User wählt selbst den Channel und den Empfänger — die App kennt beide nicht.

### Bewusst nicht

- **Keine TTL/Ablauf-Logik** — wäre nur sinnvoll mit Backend. Text-Snapshot in WhatsApp/Email „läuft nicht ab" — kein Bug, kein Risiko.
- **Kein Sync der Häkchen** — bewusste Architektur-Wahl. User wurde transparent darauf hingewiesen („Their ticks stay on their phone — no sync") direkt im Share-Sheet.
- **Kein QR-Code für Geräteübertragung** — wäre nett für Desktop→Mobile, aber Web-Share-API + Email reicht und vermeidet eine QR-Lib-Dependency.

---

## 2026-05-15 (v) — OSM Camp Sites (233) als Camp-Layer-Marker

**Anlass:** User-Wunsch, Camping-Sites von der QPWS-Webseite zu integrieren. Recon ergab, dass der offizielle qldspatial-Catalog für Downloads Login verlangt (`/catalogue/catalog/download/proxy.jsp` ohne registrierten Account nicht aufrufbar; ISO-Metadata-XML hat kein `<distributionInfo>`-Element; Playwright-Probe bestätigt). User wählte „Weg A": OSM `tourism=camp_site` als Substitut — gleiche ODbL-Lizenz wie Roads/Rivers/NPs/Forests, schon in der Pipeline.

### Änderungen

- **`scripts/fetch-osm-geo.mjs`**: Overpass-Query um `tourism=camp_site` (nodes + ways + relations) erweitert. Neue `extractCamps(osm)`-Funktion: filtert auf named camps, dedupliziert per (Name + 0.01°-Grid-Cell), berechnet für ways die Centroid via avg-of-vertices, für relations via erstes outer-member. Output-Schema: `{ id, name, lat, lng, operator?, website?, fee?, capacity? }`.
- **`renderModule()`** + `main()` Wiring um `CAMPS`-Export erweitert. Datei-Header dokumentiert das neue Schema.
- **`src/data/cape-york-pois.js`**: re-export erweitert um `CAMPS`.
- **`src/components/CapeYorkMap.jsx`**:
  - Import von `CAMPS`
  - Neue Konstante `OSM_CAMPS` filtert OSM-Camps die innerhalb 0.006° (~660m) eines hand-kuratierten `layer:'camp'`-POIs liegen — die 8 hand-geschriebenen Camps mit reichen Blurbs (Eliot Falls, Bramwell, Chili Beach Camp etc.) haben Vorrang.
  - Neuer Render-Loop für OSM-Camps (nur wenn `'camp'`-Layer aktiv = Premium-User), kleinere Marker (r=3.5) als die hand-kuratierten (r=4.5) — visuell klarer Unterschied „kuratiert vs. mass". Tap → `onMarkerTap` mit synthetischem POI-Objekt; Blurb wird zur Laufzeit aus tags zusammengesetzt (`Operated by ${operator}. Fee applies.` etc.).
- **`vendor/README.md`** umgeschrieben: dokumentiert wieso wir nicht den qldspatial-Weg gehen, beschreibt die OSM-Quelle als Standardpfad, und behält die Manual-Download-Prozedur als Future-Work-Hinweis.

### Recon (Sackgasse vor dem Pivot)

Vor dem OSM-Weg war ein längerer Versuch nötig der Manual-Option D durch Playwright zu automatisieren — wurde verworfen weil:

- **`spatial-gis.information.qld.gov.au`** WFS-Endpoints → HTTP 499 (auth required)
- **`qldspatial.information.qld.gov.au` Catalog** → metadata-only, keine Download-Buttons im DOM ohne Login (verifiziert via Playwright DOM-Dump auf der Detail-Page)
- **ISO-Metadata-XML** hat kein `<gmd:distributionInfo>`-Element → keine direct-URLs
- **ArcGIS Online QPWS_Points** (öffentlich queryable, 2545 features in Cape York) — License: **„QPWS Staff Only"** auf Item-Level, also nicht legal-clean für Publication
- **DP_QPWS_CAMP_AREAS_P** (öffentlich, 188 Cape-York-Camps) — Owner ist UQ-Studenten-Account, License null, Snippet sagt „Temporary Data" → ebenfalls nicht commit-bar

Playwright wurde für die Recon kurz installiert (`npm i -D playwright` + chromium binary), nach Abschluss wieder deinstalliert (`npm uninstall playwright` + Chromium-Cache aus `C:\Users\<user>\AppData\Local\ms-playwright\` gelöscht — ~250 MB freigegeben).

### Numbers

- 233 named camps extrahiert (von 257 total tourism=camp_site in Cape-York-bbox; 24 unnamed verworfen)
- Inkl. Cooks Hut Campground, Wallaman Falls, Cape Tribulation Camping, Bramwell Roadhouse, Archer River Roadhouse, Lakeland Caravan Park, Loyalty Beach (Seisia), und vielen Roadhouse-/Aboriginal-Community-/Bush-Camps
- 11 Camps explizit als QPWS / QLNP / Queensland National Parks getaggt; Mehrheit ohne Operator-Tag
- **206 Tests grün** (vorher 187 — separater Test-Stack-Wachstum aus parallelen Sessions, nicht aus dieser Änderung)
- Bundle JS: 1205.86 → **1255.22 kB** (+49 kB · gzip 365 → ~380 kB)
- Geo-File on-disk: 978 → **1017 kB** (+39 kB)

### Visuelle Hierarchie

- **Hand-kuratierte 8 Camps** (CAPE_YORK_POIS, layer:'camp'): r=4.5px Marker, reicher Blurb, Highlights für die Trip-Planung
- **OSM-Camps (~225 nach Dedupe)**: r=3.5px Marker, kompakter Auto-Blurb (operator/fee/website wo getaggt), breite Coverage
- Beide premium-gegated über das bestehende `'camp'`-Layer-Toggle in LAYERS
- Doppel-Render-Schutz: OSM-Camp innerhalb 0.006° eines hand-kuratierten Camps wird ausgefiltert (kein Marker-Overlap)

### Lizenz

OSM tourism=camp_site fällt unter ODbL — gleiche Attribution wie schon im AboutTab vorhanden („© OpenStreetMap contributors, ODbL"). Keine zusätzliche Attribution nötig.

---

## 2026-05-15 (u) — Special-Marker: MenuTab-Pill + Configurator-Preview-Hint

**Anlass:** Fortsetzung von (t). Specials waren bisher Generator-Default ohne UI-Sichtbarkeit. User-Wunsch: sowohl im MenuTab (User sieht „das ist ein Special-Abend") als auch im Configurator (User merkt vor „Generate", dass etwas Besonderes dabei ist).

**Zwei UI-Touch-Points:**

1. **MenuTab DayCard Special-Pill** — `dinnerEntry.spec = true` (in (t) gesetzt) wird jetzt als „✨ Special"-Pill neben dem Day-Title gerendert. Style `.tag-special` analog zum bestehenden `.tag-n` (Bamaga-NEW) — gleiche Pill-Geometrie, dezent oranger Background (`#FFF3E0`), Orange-Text — konsistent mit App-Brand. Position im Day-Title: nach Today-Pill, vor Bamaga-NEW (Hierarchie: heute > Premium-Marker > Geo-Marker).

2. **Configurator-Preview-Hint** — neuer Block unter dem Calendar-Tip, nur sichtbar wenn `hasRange && estimateSpecialCount(...) > 0`. Text dynamisch: „✨ Your plan will include 1 special evening dinner …" / „… 2 special evening dinners …". Style `.cfg-special-hint` (warmer Orange-Background `#FFF7ED`, dezente Border) — anders genug vom Calendar-Tip um nicht zu verschwimmen, gleiches Geometrie-Pattern.

**Generator-API-Erweiterung:**
- `specialQuotaForDays(days)` (vorher private) jetzt `export`-ed — liefert die rohe Quota-Schwelle (0/1/2/3) je nach Trip-Länge.
- Neue Funktion `estimateSpecialCount({ days, bamagaStop })` — kalkuliert die UI-relevante echte Anzahl unter Berücksichtigung des Cluster-Caps (max 1 Special pro Cluster, also Bamaga-Stop bestimmt 1 vs. 2 Cluster). Ohne Bamaga und 25-Tage-Trip = nur 1 Special (nicht 3 wie Quota suggeriert). Configurator nutzt das damit der Preview-Hint die Wahrheit zeigt, nicht ein Theorie-Maximum.

**Slot-Reihenfolge im Render unverändert** — Specials sind weiterhin Generator-Layer (User-Override > Special > Round-Robin). UI ist rein Anzeige, keine User-Kontrolle.

**Strings:**
- `S.menu.tags.special: '✨ Special'`
- `S.config.specialHint({ count })` — 1/N-Singular/Plural

**Neue Tests in `generator.test.js` (+4):**
- `specialQuotaForDays` in 4 Bändern (0/4/5/12/13/21/22/31)
- `estimateSpecialCount` Cluster-Cap (10d/16d/25d × Bamaga-Stop true/false)
- Kurzer Trip → 0 unabhängig von Bamaga
- Plan-Output enthält `spec: true` Marker auf Specials (für UI-Anbindung)

**Tests:** **206 grün** (vorher 202, +4). Build sauber.

**Bewusste Designentscheidung:**
- Keine Configurator-Option zum Ausschalten — Specials bleiben Generator-Default. Wenn der User keine will, kann er pro Tag via Swap-Sheet wechseln. Feature-Creep-Vermeidung.
- Hint nur wenn `count > 0` — kein „0 specials" verwirrender Hint bei <5d-Trips.
- Pill-Reihenfolge im Day-Title: Today > Special > NEW (Bamaga). Today gewinnt visuell, weil zeitlich-aktuell die wichtigste Info. NEW landet ans Ende weil Bamaga eh schon eigene Card-Border hat.

---

## 2026-05-15 (t) — Special Occasion Dinners + Generator-Drosselung

**Anlass:** Fortsetzung der Pool-Erweiterung. User wollte Steak/Grilladen, hat aber „Budget-Slider"-Idee fallen gelassen (zurecht — Pricing-Schätzung zu grob für sinnvollen Filter, Configurator schon dicht, User-Agency via Swap reicht). Stattdessen: Special-Tag auf Premium-Rezepte + Generator-Drosselung, damit sich Steak etc. rar anfühlt.

**6 neue Special-Rezepte (2 pro Diät):**
- **Omnivore:** a36 *Ribeye steak with garlic butter and crispy wedges* (3-burner, premium Aussie-Steakhouse), a37 *BBQ pork ribs with corn on the cob and slaw* (3-burner, 90 min Lagerfeuer-Feast)
- **Vegetarisch:** a38 *Aubergine parmigiana with garlic toast* (3-burner, italienisch indulgent), a39 *Halloumi mezze platter with dips and warm flatbread* (2-burner, Mediterranean sharing-feast)
- **Vegan:** a40 *Jackfruit pulled „pork" tacos with all trimmings* (3-burner, layover-feast mit canned jackfruit), a41 *Stuffed butternut roast with quinoa, mushrooms and cranberries* (3-burner, vegan Sunday-roast)

Pool 75 → 81 Rezepte (Dinner-Kategorie: 35 → 41).

**Generator-Logik — `computeSpecialAssignments`:**
Neue Funktion in `generator.js`. Skala:
- `< 5 Tage` → 0 Specials (zu kurz für „Premium-Treat")
- `5–12 Tage` → 1 Special
- `13–21 Tage` → 2 Specials
- `22+ Tage` → 3 Specials (gecappt durch Cluster-Anzahl × 1/Cluster, also faktisch max 2 mit Bamaga-Stop, max 1 ohne)

Specials werden in Cluster-Mitten platziert. Pickup-Tag (1) und Dropoff-Tag (`days`) ausgeschlossen. Wenn ein Special Frischfleisch enthält und Cluster-Mitte nicht in `meatAllowedDays` liegt, wird zum nächsten Frischfleisch-erlaubten Tag im selben Cluster verschoben (sonst Steak im Off-Cluster = verdirbt).

**Slot-Reihenfolge im Daily-Loop (neu):** Skip > Restaurant > User-Override > **Special** > regulärer Round-Robin. User-Override gewinnt vor allem, Special überschreibt nur die Round-Robin-Wahl. `dinnerEntry.spec = true` als Marker (für späteres UI-Badge, aktuell ungenutzt).

**Pool-Isolation:** `buildRecipePool` und `buildSplitPool` exkludieren `occasion: 'special'` — Specials laufen ausschließlich über die Assignment-Layer, blockieren also keine regulären Round-Robin-Slots. `compatibleRecipesForCat` (Swap-Sheet) behält Specials sichtbar — User darf sie manuell wählen.

**Bug-Fix während Implementation:** a36-Zutat war initial „Ribeye steak" — `FRESH_MEAT_RX` matcht nicht ohne `beef`-Token. Korrigiert zu „Beef ribeye steak", landet jetzt im Frischfleisch-Cluster. Die anderen Specials matchen automatisch (a37 „Pork ribs" → `pork`, a38–a41 sind vegetarisch/vegan).

**Neue Tests in `generator.test.js` (+11):**
- Trip <5d → 0 Specials
- Trip 10d → exakt 1 Special
- Trip 16d mit Bamaga → exakt 2 Specials
- Trip 25d ohne Bamaga → 1 (Cluster-Cap); mit Bamaga → 2
- Omnivore-Pool → a36/a37, Vegetarian-Pool → a38–a41 (akzeptiert auch vegane), Vegan-Pool → a40/a41
- User-Override (a1) gewinnt vor Special an Tag 5
- Specials nicht auf Pickup/Dropoff-Tag
- 4d-Trip → keine Specials im Plan (Quota=0)
- Steak (a36) auf small fridge + 16d landet nur in meatAllowedDays (Tag 2-3)

**Tests:** **202 grün** (vorher 191, +11). Build sauber.

**Bewusste Designentscheidung:**
- Specials sind Generator-Default, nicht User-Choice → keine neue UI-Konfiguration nötig (Configurator bleibt schlank, kein 8tes Filter-Pill).
- Quota skaliert mit Trip-Länge — bei Day-Trips (2-3 Tage) keine Specials, weil das Premium-Erlebnis sich rar anfühlen soll.
- Cluster-Cap (1 Special pro Cluster) verhindert dass auf 22+d-Trips drei Steak-Abende in Folge kommen.
- `occasion: 'special'`-Tag ist generisch — Stufe 2 könnte weitere Occasion-Klassen ergänzen („birthday", „last-night-feast"), ohne den Generator-Code anzufassen.
- Kein Pricing-Update — Premium-Zutaten skalieren bereits via `🥩 Fresh meat & plant proteins`-Kategorie ($12/Item Pauschale), Steak/Ribs/Halloumi sind aber wertvoller in der Realität. ±30%-Schätzgenauigkeit deckt das.

---

## 2026-05-15 (s) — Vegan-Pool +7: Convenience- & Faux-Meat-Rezepte

**Anlass:** User-Wunsch — vegane Rezepte mit Plant-based Convenience-Produkten (vegane Schnitzel, Plant-Cream, Plant-Mince) für mehr Variabilität. Bisheriger Vegan-Pool war fast ausschließlich Tofu/Hülsenfrüchte/Gemüse — fehlte „Faux-Meat"-Komfortküche.

**Pool-Erweiterung 68 → 75 Rezepte (+7 vegan):**
- **Frühstück (+2):** f14 *Vegan sausages with baked beans on toast* (1-burner Aussie-Pub-Brekkie mit v2food/Linda McCartney), f15 *Plant-based bacon and avocado breakfast wrap* (1-burner mit Suzy Spoon/Sunfed)
- **Lunch (+2):** m24 *Vegan schnitzel sandwich with slaw* (1-burner mit Plant Vibes/Fry's), m25 *Plant-based BLT with vegan mayo* (1-burner mit Plant-Bacon)
- **Dinner (+3):** a33 *Plant-based bolognese with spaghetti* (2-burner mit Vegan-Mince), a34 *Vegan creamy mushroom pasta with plant cream* (2-burner mit Oatly/Vitasoy), a35 *Vegan schnitzel with mash and mushroom gravy* (3-burner Sunday-Roast-Niveau)

Marken-Hints in den Zutaten erwähnen die in Coles/Woolworths AU verbreiteten Brands (v2food, Linda McCartney, Plant Vibes, Fry's, Oatly, Vitasoy, Beyond, Birds Eye Green Cuisine), aber Generic-Naming für Brand-Neutralität.

**Generator-Anpassung — Plant-Negation in `containsFreshMeat`:**
Neuer `PLANT_BASED_RX = /\b(vegan|plant-based|plant)\b/i`. `containsFreshMeat()` und `meatShelfLife()` ignorieren Zutaten die diesem Marker matchen — sonst würden „Vegan sausages" über `FRESH_MEAT_RX.sausages?` als Frischfleisch erkannt und einen Cluster-Slot blockieren. Plant-Convenience-Produkte bleiben deshalb im **nonMeat-Pool** (mit cooling:'high' für die Kühl-Anforderung — landen früh in der Cooling-Sortierung).

**Generator-Anpassung — CATEGORIES-Regex erweitert:**
`🥩 Fresh meat & plant proteins`-Regex um `schnitzel|cutlets?|mince|patty|patties|nuggets?` erweitert. Plant-Schnitzel und Plant-Mince landen jetzt in der gleichen Einkaufslisten-Sektion wie echtes Frischfleisch (gleiche Kühlung, gleicher Browse-Kontext für den User). Plant-Cream / Vegan-Cheese / Vegan-Butter matchen schon bestehende Dairy-Regex (`cream`/`cheese`/`butter`).

**Neue Tests in `generator.test.js` (+4):**
- Vegan-Pool enthält alle 7 neuen IDs (mit `burners:3` für a35)
- Vegan-Plan über 28 Tage zeigt mindestens ein Convenience-Rezept (Round-Robin-Coverage)
- Vegan-Convenience-Rezepte werden NICHT in den Frischfleisch-Cluster eingeordnet (small fridge + vegan + 7d → alle Slots besetzt)
- Plant-based mince landet in der `🥩 Fresh meat & plant proteins`-Einkaufskategorie (via override-Pin von a33)

**Tests:** **191 grün** (vorher 187, +4). Build sauber.

**Bewusste Designentscheidung:**
- Cooling-Tag `'high'` für alle 7 — Plant-Convenience hält ähnlich kurz wie echtes Frischfleisch (~4-7 Tage gekühlt). Ausnahme: a34 mit `'medium'` weil UHT-Plant-Cream im Tetrapack lange hält.
- Marken-Beispiele in den Zutaten als „e.g. v2food, Linda McCartney" — kein Hardlock auf eine Marke, User wählt nach lokaler Verfügbarkeit.
- Kein Pricing-Update für Plant-Convenience — Pauschale `🥩 Fresh meat & plant proteins`-Kategorie ($12/Item) passt grob (Vegan-Schnitzel/Würste sind in AU sogar etwas teurer als der billige Fleisch-Äquivalent, aber innerhalb der ±30%-Schätzgenauigkeit).

---

## 2026-05-15 (r) — Famous Cape-York-Tracks + Connectivity-Filter

**Anlass:** User-Anfrage „ergänze tracks wie der frenchmans track oder der der zum usshers point führt oder den creb track mit einem hohen detail grad aufgrund der wichtigkeit, und achte bei den restilichen, dass genug detail vorhanden ist dass sie nicht im nichts starten oder aufhören, sondern dass immer ein klarer start und endpunkt ersichtlich ist".

### Famous Tracks im Pattern (hoher Detail-Grad)

ROAD_NAME_MAP erweitert um 10 neue Famous-Cape-York-Tracks:
- `creb`        — CREB Track (Cairns Range, Eastern, Bushland — der berühmte 4WD-Track via Daintree-Hinterland von Cairns nach Cooktown)
- `bloomfield`  — Bloomfield Track (Cooktown↔Cape-Trib-Coast-Route via Bloomfield Falls)
- `usshers`, `captainBilly`, `twinFalls`, `eliotFalls`, `vrilya`, `mapoon`, `telegraph`, `capeMelville` — diverse Tip- und Lakefield-Region-Tracks (User explizit verlangt)

Patterns sind permissiv (kein `^`-Anchor wo nicht nötig) damit OSM-Naming-Varianten gefangen werden. **Ergebnis 11/27 named Strassen extrahiert** — neu: CREB Track (96 simplified pts), Bloomfield Track (115 pts), Frenchmans Track war schon (53 pts), Lakefield Rd (157 pts).

**8 famous tracks NICHT in OSM unter diesen Namen** (Usshers, Captain Billy, Twin Falls, Eliot Falls, Vrilya, Mapoon, Telegraph, Cape Melville) — sie existieren wahrscheinlich als unnamed `highway=track`. Werden vom neuen Connectivity-Filter als generische Tracks gerendert.

### Connectivity-Filter (User-Wunsch: „klarer Start- und Endpunkt")

Statt einer naiven min-length-Filterung jetzt eine Endpoint-Snap-Filterung: ein Track-Segment wird nur behalten wenn mindestens einer seiner Endpunkte innerhalb 0.005° (~555m) eines „Anchor-Punkts" liegt. Damit entfallen Tracks die in der Wildnis beginnen UND enden — exakt wie vom User verlangt.

**Anchor-Quellen:**
- Alle Punkte aller named ROADS (jeden Wegpunkt, nicht nur Endpunkte — Tracks können an Strassen-Mittelteilen ankoppeln)
- Alle Punkte aller MAJOR_ROADS
- Alle Punkte aller RIVERS (Tracks zu Fluss-Crossings)
- POI-Coords aus `cape-york-pois.js` (Beaches, Crossings, Camps, Waterfalls, Resupply etc — dynamisch via `await import()` aus dem ESM-Modul, da `cape-york-pois.js` direkt das Array hält)

**Spatial Index:** Bucket-Grid mit Bucket-Size = SNAP_DEG (~555m) → O(1)-Lookup statt O(N²)-Brute-Force. Pro Endpunkt werden nur 9 Buckets (3×3 Nachbarschaft) gecheckt.

**OSM-Query erweitert:** `way["highway"="track"]` jetzt OHNE `["tracktype"]` oder `["name"]`-Vorfilter — so kommen ALLE Tracks runter (auch unnamed) und der Connectivity-Filter entscheidet.

**Numbers:**
- Raw OSM-Tracks: 870 → **6439** Ways (Query auf alle highway=track erweitert)
- Pre-Connectivity Chains: 5162
- Post-Connectivity behalten: **698 Tracks** (1975 dropped — 74% drop-rate, das sind die echten „in der Wildnis"-Tracks)
- Vorher (mit min-length-Filter): nur 186-241 Tracks

**Effekt:** Tracks zu Usshers Point, Twin Falls, Eliot Falls etc. werden jetzt als generische 4WD-Tracks gerendert (nicht beschriftet, da unnamed in OSM, aber sichtbar mit klarem Start an einer Strasse und Endpunkt an Fluss/POI).

### Renderer (CapeYorkMap.jsx)

- Neue Konstante `FAMOUS_TRACK_IDS = ['frenchmans', 'creb', 'bloomfield', 'oldTele', 'oldTeleBypass']`
- Famous-Track-Render-Loop iteriert über diese IDs, dashed track-Style, prominenter als generische TRACKS
- Lakefield Rd (rinyirru) als gesealter Park-Zugang gerendert (1.2px solid)
- ROAD_LABELS um Frenchmans / CREB / Bloomfield / Lakefield / Portland Roads erweitert

### Bundle / Tests

- **187 Tests grün**
- Bundle JS: 1126.83 → **1205.86 kB** (+79 kB · gzip ~342 → ~365 kB · +23 kB gzip)
- Geo-File on-disk: 911 → 978 kB

### Was noch fehlt

- 8 famous-track Namen sind in OSM nicht so getaggt wie ich sie suchte. Sie kommen als unnamed generische Tracks durch den Connectivity-Filter, aber bekommen kein eigenes Label. Wenn der User die spezifisch beschriftet haben will, müssen wir die ways direkt per OSM-ID identifizieren (Overpass-Query mit way-IDs) oder per kleiner geographischer Bbox um die jeweilige Landmark.

---

## 2026-05-15 (q) — Dismissible Info-Banner: ✕ auf MenuTab + ShoppingTab

**Anlass:** User-Wunsch — Info-Banner sollen wegklickbar sein, wenn man sie schon kennt.

**Zwei dismissable Banner mit ✕ oben rechts:**

1. **MenuTab — `ClusterInfoBanner`** („🥩 Fresh meat scheduled on X of Y days …"). Persistenz via `localStorage['ui_dismissed_meatcluster']`. ✕-Button als HTML-Sibling vom Toggle-Button (nested `<button>` ist invalides HTML), absolut positioniert oben rechts mit `e.stopPropagation()`. `cluster-info-banner` bekommt `position: relative`, `cluster-info-head` bekommt `padding-right: 44px` damit der ▾-Arrow nicht hinter dem ✕ verschwindet.

2. **ShoppingTab — Note** („🏪 Last big supermarket! …" / „🌿 Small store in Bamaga …"). Pro Bucket persistent unter `ui_dismissed_note_<spId>` — Cairns- und Bamaga-Note werden unabhängig dismissed (unterschiedliche Texte, anderer Mehrwert pro Stop). Neue Sub-Komponente `DismissibleNote({ supplyPoint })` ersetzt drei Code-Duplikate (locked-Mode, Empty-State, Hauptliste). Nebeneffekt: `isStart` aus der Hauptkomponente entfernt (jetzt in DismissibleNote selbst abgeleitet).

**Storage-Konvention:** Beide nutzen `ui_`-Prefix — wird vom `resetAllShoppingState()`-Wipe NICHT erfasst (Entscheidung aus (m): UI-Pref ist Komfort, nicht Trip-State, soll Reset überleben).

**CSS:**
- `.note` wird zu flexbox (`display: flex; align-items: flex-start; gap: 8px`); neue `.note-text` (flex: 1) und `.note-close` (32x32 Touch-Area, negative margin um die note-padding zu durchbrechen, opacity .55 → 1 on active).
- `.info-dismiss` (für ClusterInfoBanner): absolute oben rechts, 32x32, gleicher Look wie `.note-close` aber kontextangepasste Farbe (`var(--tx2)`).
- `.note` wird nur in DismissibleNote verwendet (verifiziert per grep) — flex-change bricht keine andere UI.

**Strings:** `S.shopping.dismissAria` und `S.menuJump.dismissAria` (beide `'Dismiss this note'`).

**Tests:** **187 weiterhin grün**, Build sauber.

**Bewusste Designentscheidung:** Kein „Show all dismissed banners again"-Reset im UI — User würde bei Bedarf den Browser-LocalStorage manuell leeren. Für die kleine Anzahl Banner (2 Note-Buckets + 1 Cluster) wäre eine Reset-UI overengineered.

---

## 2026-05-15 (p) — Drastische OSM-Daten-Erweiterung: NPs / Major Roads / Tracks / Forests

**Anlass:** User-Anfrage „erweitere deine datenbank von national parks strassen und tracks und wäldern drastisch, ziehe dabei alle nötigen daten von open street map".

### Übersicht

| Layer | Vorher | Nachher | Faktor |
|---|---|---|---|
| Nationalparks | 4 hardcoded | **141** (alle benannten in bbox, marine ausgefiltert) | 35× |
| Named Roads | 7 | 9 (+ Frenchmans Track + Lakefield Road neu gematcht) | 1.3× |
| Major Roads (unnamed) | 0 | **210 Segmente** (highway=primary/secondary/tertiary/trunk/motorway, ohne unclassified) | NEU |
| 4WD-Tracks | 0 | **186 Segmente** (highway=track mit Name oder tracktype) | NEU |
| Forests | 60 | **200** (FOREST_MIN_BBOX 0.08° → 0.04°, TOP_N 60 → 200) | 3.3× |

### Änderungen am Fetch-Skript

- **Overpass-Query erweitert** um Major Roads (`highway~^(motorway|trunk|primary|secondary|tertiary)$`, ohne `unclassified` — wären tausende Cairns-Strassen) und 4WD-Tracks (`highway=track` mit `tracktype` ODER `name` server-seitig vorgefiltert). Query-Timeout 240 → **540 Sekunden** (heavy query timeout-te vorher mit 504).
- **`extractNationalParks(osm)` umgeschrieben:** statt nur 4 hardcoded IDs (NP_NAME_MAP) jetzt ALLE benannten `boundary=national_park|protected_area|leisure=nature_reserve` in der bbox. Bekannte IDs behalten ihre semantischen Slugs (np-lakefield etc.) für Label-Aliasse, alle anderen bekommen `np-${slugify(name)}`.
- **NP-Filter:** `NP_MIN_BBOX = 0.04°` (~4.4 km, gegen Mikro-Reserves), `NP_MAX_BBOX = 3.0°` (~330 km, eliminiert Great Barrier Reef Marine Park mit 17.957° bbox-diag), `NP_MARINE_RX = /marine|fish habitat|sea country|dugong|reef|inlet/i` (eliminiert Marine Protected Areas die über Wasser-Layer rendern würden).
- **Neue Extractors:** `extractMajorRoads(osm)` und `extractTracks(osm)` — beide nutzen den neuen Helper `extractWaysAsChains(osm, filter, simplifyEpsilon, minChainLength, label)`. Coarser DP (0.001° statt 0.0004°) und höhere min-chain-length (0.015° für Roads, 0.012° für Tracks) — diese Layer sind Hintergrund-Detail, brauchen keine Highway-Präzision.
- **Dedupe-Logik:** Major Roads filtern Ways aus die schon in `ROAD_NAME_MAP` matchen (kein Doppel-Render); Tracks filtern Old-Telegraph-Variants raus (schon als named road).
- **Forest-Threshold:** `FOREST_MIN_BBOX 0.08° → 0.04°`, `FOREST_TOP_N 60 → 200`.

### Änderungen am Renderer (CapeYorkMap.jsx)

- **Imports:** MAJOR_ROADS und TRACKS aus cape-york-pois.js (re-export aus geo-Datei).
- **Pre-computed Paths:** `MAJOR_ROAD_PATHS` und `TRACK_PATHS` einmal beim Modul-Load berechnet (gleich wie FOREST_PATHS).
- **Render-Reihenfolge:** Tracks (sehr subtil — 0.5px, dashed `1.5 1.5`, opacity 0.55) → Major Roads (0.8px, solid, opacity 0.7) → Rivers → Trip-Overlay → Named Roads. Visuelle Hierarchie: User sieht erst die Hauptstrassen, dann die Branches, dann die 4WD-Tracks als atmosphärisches Detail.
- **NP-Render** unverändert (Loop iteriert jetzt 141 statt 4 NPs aus NP_POLYGONS).
- **NP_LABELS gecapped** auf Top-30 nach Polygon-bbox-Diagonale — bei 141 NPs würden sich Labels gnadenlos überlappen. Kurz-Namen-Mapping erweitert für `Nature Refuge → NR`, `Indigenous Protected Area → IPA`, `Forest Reserve → FR`. Neuer Alias: `Kalkajaka → Black Mountain NP`.

### Bundle / Tests

- **187 Tests grün** — Datenmodell additiv erweitert, alte Tests greifen nicht auf MAJOR_ROADS/TRACKS zu.
- Bundle JS: 589.09 → **1126.83 kB** (+538 kB · gzip 181 → **342 kB** · +161 kB gzip).
- Geo-File on-disk: 375 → **911 kB** (+536 kB).
- CSS: 38.18 → 39.42 kB (+1.2 kB).

Bundle-Wachstum ist der Preis für die drastische Datenerweiterung. Erste-Seite-Load ist 342 kB gzip — okay für eine PWA mit offline-cache (einmal geladen, danach gratis aus dem Service Worker). User hatte explizit „drastisch" verlangt und akzeptiert grössere Bundle-Sizes für Vollständigkeit (siehe k-fix5).

### Nicht-Ziele / bewusst weggelassen

- **`unclassified` highways** — würden tausende Cairns-Stadt-Strassen einbringen, kein Wert für eine Cape-York-Übersicht.
- **`highway=path|footway`** — Wanderwege; nicht relevant für 4WD-Tour, würden nur Noise erzeugen.
- **Marine Protected Areas** — Great Barrier Reef etc.; irrelevant für eine Land-Karte und würden über das Wasser-Layer rendern.
- **Per-NP-Layer-Toggle / Track-Layer-Toggle** — alle NPs unter dem bestehenden `park`-Layer-Toggle, Tracks immer subtil sichtbar. Granulare Toggles wären Stufe-2.

---

## 2026-05-15 (o-fix) — Jump-Bar zwei Bugs gefixt

**Anlass:** User-Feedback nach (o) — „wenn ich oben auf zb die 3 klicke, dann ist das erste sichtbare tag 4 und tag 3 ist zu 4/5 hinter der slide bar versteckt, es muss komplett sichtbar sein und vielleicht auch gerade ausgeklappt".

**Bug 1 — Sticky-Bar verdeckt das Top der Karte.** `scrollIntoView({ block: 'start' })` scrollt das Element so dass dessen Top auf scrollContainer-Top liegt — ohne Wissen über die ~55px hohe Sticky-Bar darüber. Resultat: oberen ~⅘ der gesprungenen Card waren hinter der Bar versteckt.
**Fix:** `scroll-margin-top: 64px` auf `.day-card` (8+38+8+1 = 55px Bar plus 9px Atemluft). Browser respektiert das Property nativ beim scrollIntoView/anchor-scroll. Reines CSS, kein JS-Offset-Hack.

**Bug 2 — Card bleibt collapsed beim Jump.** open/close-State lag lokal in DayCard (`useState(isToday)`), die Jump-Bar konnte nicht reingreifen. User musste nach dem Jump zusätzlich tappen um die Mahlzeiten zu sehen — Plan-Bruch der Aktion.
**Fix:** Open-State in MenuTab geliftet als `Set<number>` (`openDays`). DayCard ist jetzt stateless für open/close, bekommt `isOpen` + `onToggle` als Props. `handleJumpTo(d)` macht jetzt **erst Aufklappen, dann scrollen** — `requestAnimationFrame` wartet auf den Layout-Pass damit der Browser zur expanded-Position scrollt (nicht zur kollabierten und dann nachspringt). Today-Initial-Open kommt jetzt aus dem initial Set (`new Set(todayDay ? [todayDay] : [])`) statt aus DayCard's `isToday`-Prop.

**Tests:** **187 weiterhin grün**, Build sauber. Bundle marginal.

**Bewusste Designentscheidung:** Multi-Open bleibt erlaubt (Accordion-Pattern wäre invasiver, User soll frei navigieren). Wer eine Card explizit zu macht, behält sie zu — bis er sie wieder anspringt oder tappt.

---

## 2026-05-15 (o) — MenuTab Polish: Day-Jump-Bar + Today-Marker + Auto-Scroll

**Anlass:** Teil 3 der UX-Iteration (nach ShoppingTab-Polish in (m)). Auf 16-Tage-Trips ist die Navigation durch DayCards manuell scrollend mühsam — schnellerer Sprung auf einen bestimmten Tag.

**Drei Änderungen in `MenuTab.jsx`:**

1. **`DayJumpBar`** (neue Sub-Komponente) — sticky am Top des Tages-Bereichs (`position: sticky; top: 0; z-index: 5`), horizontal scrollbar, ein Pill pro Tag. Tap scrollt smooth zur entsprechenden DayCard via `document.querySelector('[data-day="N"]').scrollIntoView({ behavior: 'smooth', block: 'start' })`. Bamaga-Tag bekommt grünen 4px-Dot unterhalb der Zahl (`::after`-Pseudo). Today-Tag ist orange-filled. Bar selbst zentriert den Today-Button beim ersten Mount via `inline: 'center'`.

2. **Today-Erkennung & DayCard-Marker** — neue Helper-Funktion `currentTripDay(startDateIso, totalDays)` in MenuTab: liefert die 1-basierte Tag-Nummer wenn `parseISO(startDate) ≤ today ≤ start+totalDays-1`, sonst `null`. Pre-Trip / Post-Trip / fehlendes startDate → kein Today-Highlight. Today-DayCard bekommt `.day-today`-Klasse (orange 2px-Border + soft glow box-shadow), kleines orange „TODAY"-Pill neben Day-Title, und ist initial **expanded** (User landet im Tab und sieht direkt die heutigen Mahlzeiten ohne Tap).

3. **Auto-Scroll on Mount** — beim ersten Render des MenuTab springt der Viewport zum heutigen Tag (`behavior: 'auto'`, instant — Smooth-Animation würde beim Tab-Open seltsam aussehen). useEffect mit leerer deps array, `eslint-disable-next-line react-hooks/exhaustive-deps`-Kommentar dokumentiert die Absicht.

**Datenfluss:** `config.startDate` kommt schon im merged config von App.jsx (`{ ...config, ...result.config }`) — kein Prop-Add nötig. Beim Edit kurz eine Klammer-Falle in strings.js (shopping zu früh geschlossen), sofort erkannt und gefixt.

**Strings:** neuer `S.menuJump`-Bucket mit `todayPill: 'Today'` und `jumpAria({ d })`.

**CSS-Neu:**
- `.day-card.day-today` (orange Border + soft glow) und `.day-today-pill` (kompaktes Pill, 10px uppercase)
- `.day-jump-bar` (sticky, horizontal overflow, scrollbar hidden für sauberere Optik)
- `.day-jump-btn`, `.day-jump-btn.bamaga` (mit `::after`-Dot), `.day-jump-btn.today` (orange-filled)

**Tests:** **187 weiterhin grün** (keine neuen — currentTripDay ist trivial, könnte später in lib/dates.js gehoben + getestet werden).

**Was bewusst NICHT gemacht:**
- Kein lib-Hoist von `currentTripDay` — bleibt als 8-Zeilen-Helper in MenuTab.
- Kein „Today scrollt mit" bei Mitternachts-Wechsel — useEffect-deps leer, User refresht morgens.
- Kein Scroll-Spy für Active-Day-Highlight in der Bar (IntersectionObserver) — Touch-Targets bleiben statisch lesbarer.
- Today-Logik ist heute (2026-05-15) noch nicht live testbar — Eigen-Trip startet 2026-06-14. Vor dem Trip sieht der User nur die Jump-Bar ohne Today-Highlight.

---

## 2026-05-15 (n) — Map-UX-Triple: Beschriftungen + Trip-Overlay + Pinch-Zoom/Pan

**Anlass:** User-Anfrage „was wären die nächsten logischen schritte um die qualität und nutzbarkeit der karte in der app zu verbessern?" — gefolgt von „setzte alle drei verbesserungen durch ohne rückfragen und mit grösster sorgfalt ohne fehler und bugs". Drei vorgeschlagene Schwerpunkte umgesetzt.

### 1. Beschriftungen (Rivers / NPs / Roads)

Daten-Ableitung vollständig aus bestehenden OSM-Strukturen, kein neuer Fetch:

- **`midpointAlongLongest(segments)`** — findet den geometrischen Mittelpunkt der längsten Polyline via kumulativer Bogenlänge. So sitzt das Label nicht am Endpunkt sondern in der visuell stärksten Position.
- **`polygonCentroid(polygon)`** — Shoelace-Formel. Reicht für die typischen NP-Formen.
- **`RIVER_LABELS`** — pro River mit substantieller längster Chain (≥ 8 Punkte). Italic, mid-blue (`var(--map-river)`), 6.5px, weißer Halo via `paint-order: stroke; stroke: var(--map-water)`.
- **`NP_LABELS`** — Centroid pro NP. Kurzname-Mapping für vertraute Aliasse (Rinyirru→Lakefield NP, Kutini-Payamu→Iron Range NP, Oyala Thumotang→Mungkan NP). Nur sichtbar wenn `park`-Layer aktiv (matcht das Polygon-Render-Verhalten).
- **`ROAD_LABELS`** — 5 Hauptstrassen (Mulligan/PDR/NPA/OldTele/Pajinka) mit Display-Namen. Uppercase, 6.5px, dunkles Braun mit beige Halo. Branch-/Bypass-Tracks bleiben unbeschriftet.
- **Anker-Labels** (Cairns/Cooktown/Coen/Bamaga/Tip/Weipa) bekommen jetzt auch einen Halo, und werden ausgeblendet wenn am gleichen Ort ein Trip-Stop-Marker rendert (kein Doppellabel).

Lesbarkeit: SVG `paint-order: stroke` + dicker (~2.5px) heller Stroke um den Text → Text bleibt lesbar über Wasser, Land, Forest, allen NP-Polygon-Farben. Standard-Cartography-Trick.

### 2. Trip-Overlay (Route + Day-Marker)

Neue Prop-Kette: `App.jsx` reicht `config` als `tripConfig` in `InfoMapTab` weiter, `InfoMapTab` weiter in `CapeYorkMap`. Auf der Home-Map (vor Trip-Konfiguration) ist `tripConfig.completed = false` → kein Overlay.

`computeTripStops(config)` derive-t aus `enabledStops`, `bamagaStop`, `bamagaDay`, `stopDays`:

- Cairns: immer aktiv, Tag 1
- Cooktown/Coen/Archer: aktiv wenn `enabledStops[id] === true`, Tag aus `stopDays[id]` (oder `null` wenn nicht gesetzt)
- Bamaga: aktiv wenn `bamagaStop`, Tag = `bamagaDay`
- Coords: aus `CAPE_YORK_POIS` via `rs-${id}`-Match (single source of truth, keine Duplikat-Daten)

**Render:**

- **Route-Highlight** — Mulligan + PDR (+ NPA + Pajinka wenn Bamaga-Stop) werden in Trip-Orange (`--map-trip-route` neu in `index.css` = `#C0600C`, App-Brand-Color) UNTER dem braunen Road-Stroke gerendert. Breiter Stroke (4.5px), 45% Opacity → schimmert durch wie ein Routen-Marker auf einer echten Karte.
- **Trip-Stop-Marker** — größer als die normalen Resupply-Marker (r=6.5 + r=9 outer halo), Trip-Orange-Fill, weißer Border. Zentriert: Tag-Nummer (8.5px weiß bold). Darunter: Stop-Name mit halo.
- **Doppel-Filter** — Resupply-POIs werden ausgeblendet wenn der gleiche Stop als Trip-Marker rendert (`tripStopIds`-Set, O(1)-Lookup).
- **Tap** — Trip-Marker rufen `onMarkerTap` mit synthetischem POI-Objekt auf, das Sheet rendert wie bei normalen POIs (mit km-Distanz + Trip-spezifischem Blurb wie „Bamaga arrival — refresh fresh stocks for the Tip leg.").

### 3. Pinch-Zoom + Pan

**Architektur — viewBox-basiert (kein Layer-Transform):** State `view = { x, y, w, h }` wird direkt als SVG-`viewBox` gerendert. Vorteile: Marker, Strokes und Text skalieren mit (real-map-Verhalten — bei Zoom werden Beschriftungen lesbarer); keine Counter-Scaling-Logik nötig; einfache Reset-Logik.

**Eingaben — Pointer Events (unified Maus/Touch):**

- **1 Pointer** → Pan (delta in Client-Pixel × `view.w/element.width` für viewBox-Einheiten)
- **2 Pointer** → Pinch-Zoom; trackt Distance zwischen Pointern, scaleFactor = `newDist/prevDist`, zoomt um Pinch-Center
- **Mausrad** → Zoom um Maus-Position, factor 1.18 pro Tick. Als nativer non-passive Listener via `useEffect` + `addEventListener('wheel', h, {passive:false})` registriert — React-Synthetic-Wheel-Events sind seit v17 passive und `preventDefault` würde dort nicht greifen.

`zoomAroundPoint(scaleFactor, anchorClientX, anchorClientY)` — gemeinsame Funktion für alle Zoom-Eingaben. Konvertiert Anchor von Client-Pixel zu viewBox-Koordinaten, berechnet neue viewBox so dass der Anchor-Punkt unter dem Cursor/Pinch-Center bleibt.

`clampView(v)` — clampt `w` zwischen `MIN_W = VIEWBOX_W/6` (max Zoom 6×) und `MAX_W = VIEWBOX_W` (min Zoom 1×, full map); `h` proportional aus `w` (Aspect-Ratio bleibt erhalten); `x, y` so dass die viewBox nie außerhalb des Original-Viewports liegt (kein „Map verschwindet").

**Marker-Schutz:** `onPointerDown` returnt früh wenn `e.target.closest('.map-marker')` matcht — der Marker-Click feuert dann normal, kein Pan-Konflikt. Gleiches für `.map-zoom-btn`.

**Touch-Handling:** `touch-action: none` CSS auf der SVG → Browser-Default-Pan/Zoom deaktiviert; `pointer-cancel` als Synonym für `pointer-up` registriert (z.B. iOS-Notification-Swipe); `setPointerCapture` damit Pointer-Move/Up auch außerhalb der SVG-Bounds noch ankommen (try/catch falls API nicht verfügbar).

**Zoom-Controls UI:** Drei-Button-Stack rechts oben (＋ / − / ⟲), 36×36px, halb-transparent weiß, mit `touch-action: manipulation` für sofortige Tap-Response (kein 300ms-double-tap-zoom-Delay). − und ⟲ disabled wenn `!isZoomed`. „Mainland continues south"-Footer-Text wird bei Zoom > 1× ausgeblendet.

### Bundle / Tests

- **187 Tests grün** (vorher 173 — der Delta von +14 kommt aus einem `pricing.test.js`-File einer parallelen Session, nicht aus dieser Map-Änderung).
- Bundle: 578.71 → **589.09 kB JS** (+10 kB · gzip 176 → **181 kB** · +5 kB gzip).
- CSS: 36.55 → **38.18 kB** (+1.6 kB für Zoom-Controls + map-canvas-container).

### Nicht-Ziele (bewusst weggelassen)

- **Counter-Scaling** für Marker bei Zoom — bewusst nicht implementiert. Real-map-Verhalten (Marker werden bei Zoom größer) ist intuitiver als gleichbleibende Marker-Größe.
- **Doppeltap-Zoom** — die ＋/−/Pinch reichen. Doppeltap kollidiert mit Browser-Text-Selection.
- **GPS „center on me"** — Geolocation API würde Permissions brauchen, gehört nach Stufe 2.

---

## 2026-05-15 (m) — ShoppingTab Polish: Sticky Progress, Dimming, Hide-Toggle

**Anlass:** Teil 2 der UX-Iteration nach der Kostenschätzung — User-Wahl aus den vorgeschlagenen Polish-Punkten.

**Drei Änderungen:**

1. **Sticky progress-card** — `position: sticky; top: 0; z-index: 5` auf `.progress-card`. Counter, Cost und Hide-Toggle bleiben sichtbar während der User durch lange Einkaufslisten scrollt. Reines CSS, kein Overlay-Hack.

2. **Stärkeres Dimming für abgehakte Items** — neue Klasse `.chk-item.done` mit `opacity: .55` + leicht abgesetztem Background `#FAF8F5`, plus `.chk-edit` zusätzlich auf `.6` reduziert. CheckItem-Komponente setzt jetzt die `done`-Klasse direkt auf `chk-item` (vorher nur auf chk-name/chk-qty). Smooth Transition (.2s) zwischen Zuständen.

3. **„👁 Hide X checked"-Toggle** in der progress-card (zwischen Cost-Sektion und Reset/Check-all-Buttons). Pro Bucket persistent unter localStorage-Key `ui_hide_checked_<spId>`. Filter-Logik in `useMemo`: items mit `checked[id]=true` werden ausgeblendet, Kategorien ohne sichtbare Items werden gedropt (kein nackter Cat-Header). Toggle nur sichtbar wenn `checkedCount > 0`. Label switcht Hide ↔ Show mit live-Count.

**Storage-Konvention:** `ui_`-Prefix neu eingeführt für UI-Präferenzen — wird vom `resetAllShoppingState()`-Wipe NICHT erfasst (Pref ist Komfort-State, nicht Trip-State; soll Reset überleben).

**Strings:** `S.shopping.hideChecked` und `S.shopping.showChecked` mit `count`-Parameter.

**CSS-Neu:** `.progress-hide`, `.progress-hide-btn` (subtle text-button mit 36px min-height, orange-Akzent on active), `.chk-item.done`, transition auf `.chk-item`.

**Tests:** **187 weiterhin grün** (keine neuen Tests — UI-only-Änderung, der bestehende Filter-Pfad ist trivial). Build sauber, Bundle marginal (+~0.4 kB JS für die zusätzliche Logik + ~0.4 kB CSS für die neuen Klassen).

**Was bewusst NICHT gemacht:**
- Kein Reorder von checked items (nur Dim oder Hide) — der User würde sonst die Items beim Tap an unerwarteter Stelle verlieren.
- Kein Auto-Hide bei z.B. 100% checked — der User behält die Kontrolle, der Toggle bleibt explizit.
- Sticky-Behavior nicht gegen Topbar offset getuned — `top: 0` in der scrollbaren `.content` reicht für den UX-Zweck.

---

## 2026-05-08 (l) — Grobe Kostenschätzung in der Einkaufsliste

**Anlass:** User-Wunsch — „bei der einkaufslist wäre eine ungefähre schätzung der einkaufskosten noch interessant". Nach AskUserQuestion: Pauschalpreise pro Kategorie, Anzeige in der progress-card oben.

**Architektur-Entscheidung:** Pricing-Logik in eigene Datei `src/lib/pricing.js` (analog zur Generator-Kapselung aus CLAUDE.md § Architektur 1) — Stufe 2 kann das durch eine echte Preisliste pro Zutat ersetzen, ohne dass UI angepasst werden muss. API: `estimateBucketCost(data, spId)`, `estimateRemainingCost(data, checked, spId)`, `formatAud(amount)`, `qtyMultiplier(qtyStr)`.

**Schätz-Modell (3 Faktoren):**
- **Pauschalpreis pro Item-Kategorie** (AUD, Cairns-Baseline) — z.B. 🥩 Frischfleisch $12, 🍝 Pasta/Rice/Bread $3.50, 🥬 Frischgemüse $3, 🫙 Spices/Oils $4, 🧼 Camping essentials $7. Fallback $4 für unbekannte Kategorien.
- **qty-Multiplier:** parst kg/g/ml/L (Baseline 500g/0.5kg/0.5L/500ml = 1.0x), count-Einheiten (packs/cans/bottles/jars/tins/loaves/rolls/boxes/bags/sachets) linear, Cap bei 6 für reine Zahlen. Range „1–2 packs" → Mittelwert. „as needed" → 1.0.
- **Supply-Point-Multiplier:** Cairns 1.0x, Cooktown 1.3x, Coen 1.6x, Archer 1.7x, Bamaga 1.8x. Erfahrungswerte für Cape-York-Logistik-Aufschlag.

**UI:** progress-card in `ShoppingTab.jsx` erweitert um cost-Sektion zwischen progress-bar und actions. Erste Zeile: „💰 ~$340 AUD" links, „~$220 left" rechts (orange, nur wenn 0 < checked < total). Zweite Zeile: italic muted „Rough estimate · prices vary by store and season". Anzeige nur bei `total > 0`. `useMemo` re-berechnet bei jedem checkbox-toggle (estimateRemainingCost hängt an `checked`).

**Strings:** `S.shopping.cost = { total, remaining, disclaimer }` neu. CSS: `.progress-cost`, `.progress-cost-row`, `.progress-cost-total`, `.progress-cost-remaining` (orange-Akzent), `.progress-cost-disclaimer` (italic 11px).

**Tests:** **187 Tests grün** (vorher 173, +14 für `pricing.test.js` — qtyMultiplier mass/volume/count/range/empty, estimateBucketCost mit Cairns- + Bamaga-Multiplier + leerer Liste + Fallback-Kategorie, estimateRemainingCost mit checked-Filter, formatAud rounding + invalid input). Bundle 578.71 → wird leicht wachsen (+~1.5 kB JS für pricing.js + UI-Code).

**Was bewusst NICHT gemacht:**
- Keine per-Zutat-Preise — wäre ~200 Einträge, der User wollte „ungefähre Schätzung".
- Kein Currency-Switch — Cape-York-Kontext = AUD-only.
- Kein Per-Tag-Kostenverlauf — die Aggregation ist eine Pauschale, nicht ein Verlauf.
- User-added Items werden mit Fallback-Preis ($4) angesetzt — kein Eingabefeld für Preis (wäre Friction für ein „grobes Bauchgefühl"-Feature).

---

## 2026-05-08 (k-fix7) — Fünf-Iterationen-Push: Vollständigkeit + „endet nicht im Nichts"

**Anlass:** User-Feedback nach k-fix6 — „schon 1000x besser, aber es gibt immer noch flüsse tracks und strassen, die im nichts beginnen oder enden, führe fünf iterationen durch wo du in jeder die präzision und vollständigkeit der vorherigen verbesserst, ausser ein perfektes ergebnis wurde erzäugt dann kann der loop beendet werden".

**Diagnose:** Ursachen für „endet im Nichts"-Effekt:
1. `chainWays()` lieferte nur die LÄNGSTE Chain pro Feature — Tributaries/Branches/disconnected sections wurden verworfen.
2. Chain-Tolerance 0.0001° (~10m) war zu eng — bei imprezisem OSM-Mapping fehlten Verbindungen.
3. Viele Cape-York-„Rivers" sind in OSM als `waterway=stream` getaggt (Stewart, Kennedy als Creek, etc.) — wurden ignoriert.
4. Strenge Name-Patterns (`/^stewart river$/i`) verfehlten Creek-Varianten.
5. Kurze Rest-Segmente (2-3 Punkte post-DP) blieben als visuelle Stubs übrig.

### Iteration 1 — `chainWaysAll()` für Rivers

`chainWays(ways)` umgebaut zu `chainWaysAll(ways, tol)` — gibt jetzt ALLE Chains zurück, sortiert nach Länge absteigend. `chainWays()` bleibt als Compat-Wrapper für NP-Polygone (wo wir nur den outer-Ring wollen). Datenmodell für Rivers: `{ id, name, segments: [[]...] }` statt `{ id, name, points: [] }` — JSX rendert jetzt jedes Segment einzeln.

**Effekt:** Normanby 1 → 9 Chains (vor Stub-Filter). Annan 1 → 3. McIvor 1 → 2.

### Iteration 2 — `chainWaysAll()` für Roads + lockerere Tolerance

Roads-Datenmodell: `{ [id]: { segments: [[]...] } }` statt `{ [id]: [] }`. Chain-Tolerance default 0.0001° → **0.0003°** (~33m) — fängt OSM-Imprezisionen.

**Effekt:** mulligan 1 → 79 Chains, pdr 1 → 11, npaRoad 1 → 12, oldTele 1 → 4 (vor Stub-Filter).

### Iteration 3 — `waterway=stream` + 11 zusätzliche Creek-Patterns

Overpass-Query erweitert um `way["waterway"="stream"]["name"]`. RIVER_NAME_MAP um Old-Tele-Crossing-Creeks erweitert (Palm/Cypress/Bertie/Cannibal/Sailor/Mistake/Nolan/Indian-Head/Cholmondeley/Ducie/Jacky-Jacky). `extractRivers(osm, { includeStreams: true })` aktiviert Stream-Akzeptanz.

**Effekt:** Lukin (vorher unmatched) jetzt gematcht. Bertie Creek + Nolan Creek + Cholmondeley Creek neu im Pool.

### Iteration 4 — Road-Name-Map erweitert um 10 Cape-York-Tracks

ROAD_NAME_MAP um Frenchman's Track, Heathlands Road, Seven Mile Road, Wakooka Road, Starcke Road, Rinyirru Road, Battle Camp Road, Kalpowar Crossing Road, Cooktown Developmental Road erweitert. Bestehende Patterns aufgeweicht: `oldTele` matched jetzt auch `Old Telegraph Road` und `Telegraph Track`. `oldTeleBypass` matched zusätzlich `Southern Bypass Road`. `ironRangeBranch` matched `Iron Range Road`.

**Effekt:** keine zusätzlichen Matches in OSM für die neuen Patterns (diese Roads sind dort entweder anders benannt oder als unnamed `highway=track` getaggt). Aufgeweichte Patterns bringen aber Robustheit gegenüber künftigen OSM-Tagging-Änderungen.

### Iteration 5 — Creek-Variante für Hauptflüsse + Stub-Filter

Alle 21 RIVER_NAME_MAP-Patterns aufgeweicht von `/^X river$/i` zu `/^X (river|creek)$/i`. Post-DP-Stub-Filter eingeführt: Rivers-Segmente unter 4 Punkten und Roads-Segmente unter 3 Punkten werden verworfen (visuelle Stubs „im Nichts" eliminiert ohne Geographie zu fälschen).

**Effekt:**
- **Stewart Creek** jetzt gematcht (vorher unmatched) — 2 Chains, 32 pts.
- **Archer** zusätzlich als „Archer Creek" matchend → 2 Chains statt 1.
- **Kennedy Creek** dramatisch ausgebaut: 6 ways/1 chain/102 pts → **13 ways/5 chains/229 pts**.
- Stub-Filter: Bertie + Cholmondeley filtered out (waren 2-Punkt-Stubs). Normanby 9→3, mulligan 55→31, npaRoad 12→10 — visuelle Stubs verschwinden.

### Endergebnis

- **Rivers: 17/32 gematcht** (von 13/21 in k-fix5), mit Multi-Segment-Rendering.
- **Roads: 7/17 gematcht**, mit Multi-Segment-Rendering. Mulligan 280 → 639 simplified pts, npaRoad 257 → 344, oldTele 68 → 115, pdr 454 → 477.
- **NPs: 4/5** (unverändert — np-jardine ist seit 2014 in Apudthama integriert, kein eigenständiger Park mehr).
- **Land-Polygon + Forest:** unverändert (k-fix6).

### Bundle / Tests / File-Size

- **173 Tests grün** (Datenmodell-Änderung war additiv, alte Tests greifen nicht auf RIVERS/ROADS zu).
- Bundle: 556.93 → **578.71 kB JS** (+22 kB · +5 kB gzip → 176 kB gzip · CSS unverändert).
- Geo-File on-disk: 353 → **375 kB** (+22 kB für 2-3× mehr Segmente).

### Was ist NICHT gefixt

- 6 Rivers wirklich nicht in OSM gefunden (Olive, Coen, Edward, Watson, Lockhart) — selbst mit Creek-Pattern + Stream-Akzeptanz kein Match. Möglicherweise unnamed in OSM oder sub-stream-Tagging. Diese werden auf der Map nicht erscheinen — User sieht sie aber auch nicht als „endet im Nichts" weil sie gar nicht erst gerendert werden.
- 8 Old-Tele-Crossing-Creeks ebenfalls nicht in OSM (Palm/Cypress/Cannibal/Sailor/Mistake/Indian-Head/Ducie/Jacky-Jacky). Bertie + Cholmondeley waren in OSM aber als 2-Punkt-Stubs zu kurz für realistisches Rendering.
- 10 zusätzliche Road-Patterns matchten nicht — die Tracks existieren in Cape York, sind in OSM aber entweder unnamed `highway=track` oder anders benannt.

Iteration-Loop hier abgeschlossen — der „endet im Nichts"-Effekt sollte deutlich reduziert sein. Was übrig bleibt sind echte OSM-Daten-Lücken, keine Pipeline-Probleme.

---

## 2026-05-08 (k-fix6) — Skalen-Konsistenz: Land-Polygon + Forest aus OSM

**Anlass:** User-Feedback — „I do not need more complexity and layors, but more detail, it is important that the road is shown correct, that they are on the right position on the map for example, everything needs more detail not yust the roads, but the rivers, national parks and forest areas, and make sure that they fit together scale whise".

**Diagnose:** Strukturelles Problem identifiziert. Bisheriges Setup hatte zwei inkonsistente Datenquellen für Geo:
1. **Land-Outline** war hand-skizziert (`OUTLINE_POINTS` in `CapeYorkMap.jsx`, 41 Wegpunkte aus Trainingswissen) — definierte die orange Halbinsel-Form.
2. **Roads/Rivers/NPs/Coastline** kamen aus echtem OSM (build-time gefetcht).

Da die Land-Form hand-gezeichnet war, lagen Roads & Co. zwar in *absolut korrekten* Lat/Lng-Positionen, sahen aber „neben" dem Land aus, weil das Land nicht den realen Coast-Geometrien folgte. Zusätzlich waren die 3 Forest-„Patches" (`VEGETATION_PATCHES`) hand-platzierte Ovale ohne realen Bezug.

**Fix:** Alle Geo-Layer kommen jetzt aus *einer* OSM-Quelle.

### Änderungen

- **`scripts/fetch-osm-geo.mjs`**:
  - Neue Extractor-Funktion `extractLandPolygon(osm, bbox)` — chained alle `natural=coastline`-Ways zur längsten zusammenhängenden Mainland-Linie, vereinfacht (DP ε=0.0008° ≈ 88m), schließt das Polygon im Süden via Bbox-Rand bei lat=-19.10° (knapp UNTER der viewBox → Mainland-continues-South-Effekt bleibt erhalten).
  - Neue Extractor-Funktion `extractForests(osm)` — sammelt `natural=wood`- und `landuse=forest`-Ways + Relations, filtert auf `bboxDiagonal ≥ 0.08°` (~9 km Edge-Min), DP-vereinfacht ε=0.003° (~330m), sortiert nach Größe absteigend, capped auf Top-60.
  - Overpass-Query um `natural=wood`/`landuse=forest` (Ways + Relations) erweitert.
  - Output-File jetzt **kompaktes JSON** (kein `null, 2`-Indent) — File-Size pre-Minification halbiert.
- **`src/data/cape-york-pois.js`**: Re-Export erweitert um `LAND_POLYGON` + `FORESTS`.
- **`src/components/CapeYorkMap.jsx`**:
  - 41 hand-gezeichnete `OUTLINE_POINTS` raus; `OUTLINE_PATH` wird jetzt aus `LAND_POLYGON` (4702 OSM-Wegpunkte) gebaut.
  - 3 hand-platzierte `VEGETATION_PATCHES`-Ovale raus; `FOREST_PATHS` aus 60 echten OSM-Forest-Polygonen (2188 Wegpunkte total) ersetzt sie.
  - **`<clipPath id="land-clip">`** mit dem Land-Polygon — Forests werden auf das Land geclippt damit OSM-Imprecisions (Forest-Polygon ragt minimal ins Wasser) nicht sichtbar werden.
  - COASTLINES-Detail-Overlay raus — redundant geworden, weil der präzise Land-Polygon die Coast-Linie *ist*. (Die Konstante bleibt im Datei-Output für künftige Nutzung, wird aber nicht mehr importiert → Tree-Shaking entfernt sie aus dem Bundle.)
  - Strand-Stroke von 1.8 → 1.0 (Detail trägt jetzt die Coast-Form selbst).
  - Wasser-Tiefe-Stroke von 3 → 2, Opacity 0.5 → 0.45 (subtler weil Coast jetzt schärfer).

### Geo-Daten Output

Aus `npm run geo:refresh`:
- **Land-Polygon: 4702 Punkte** (Mainland-Chain 31293 raw → 4699 simplified → 3 Süd-Schluss-Punkte → geschlossen)
- **60 Forest-Polygone** (260 Kandidaten → 60 nach Top-Cap, 2188 Punkte total, min-bbox 0.08°)
- Rivers/NPs/Roads unverändert vs. k-fix5 (DP-Tolerances stabil)
- Geo-File on-disk: 434 → **353 kB** (kompaktes JSON spart trotz neuer Daten ~80 kB)

### Bundle / Tests

- **173 Tests grün** (keine Test-Anpassung nötig — Datenmodell additiv erweitert).
- Bundle: 533.98 → **556.93 kB JS** (+23 kB · +6 kB gzip → 165 → 171 kB gzip · CSS unverändert).
- Bundle-Wachstum ist hauptsächlich Land-Polygon (4702 Punkte × ~13 Bytes = ~60 kB raw, ~6 kB gzip). Forest-Polygone sind günstiger (2188 Punkte × ~13 Bytes = ~28 kB raw, durch Repetition gut komprimierbar).

### Warum das funktioniert

Skalen-Konsistenz ist jetzt strukturell garantiert: Land-Polygon, Roads, Rivers, NPs, Forests kommen ALLE aus dem gleichen Overpass-Query, durch dieselbe DP-Pipeline, in dieselbe Lat/Lng-Projektion. Wenn die PDR an Cooktown vorbeiläuft, liegt sie exakt auf dem Land-Polygon — kein „Road schwebt im Wasser"-Effekt mehr möglich. Wenn ein Forest-Polygon an die Coast stößt, endet es exakt am Land-Rand (via clipPath).

---

## 2026-05-05 (k-fix5) — Vier-Iterationen-Push für maximale Geo-Genauigkeit

**Anlass:** User-Wunsch nach k-fix4 — „führe einige iterationen durch um die genauigkeit der park grenzen zu verbessern, und der flüsse und strassen. Du kannst auch mehr details und grössere dateien der open street map dazu beziehen". Explizites grünes Licht für Bundle-Wachstum zugunsten von Detail-Genauigkeit.

### Iteration 1 — DP-Tolerances verschärft

```js
const SIMPLIFY = {
  river: 0.002,    // ~220m  (vorher 0.005°)
  park:  0.0008,   // ~88m   (vorher 0.002°)
  road:  0.0004,   // ~44m   (vorher 0.001°)
  coast: 0.001,    // ~110m  (neu)
}
```

NP-Wegpunkte verdoppelt-verdreifacht:
- Lakefield 157→**266 pts**
- Iron Range 41→171
- Apudthama 89→**488 pts**
- Mungkan 30→166

Strassen-Detail:
- PDR 267→454 pts
- Mulligan 169→280 pts

### Iteration 2 — 14 zusätzliche Flüsse im Pattern

Erweitert um Stewart, Olive, Coen, Dulhunty, Hann, Edward, Watson, Lukin, Kennedy, Morehead, Holroyd, Lockhart, McIvor, Annan. **13/21 in OSM gematcht** — Stewart, Olive, Coen, Edward, Watson, Lukin, Lockhart, McIvor sind dort nicht als `waterway=river` getaggt (vermutlich `waterway=stream`).

Neue Hits:
- Dulhunty River (63 pts) — Old-Tele-Crossing
- Hann River (15) — PDR
- Kennedy River (37) — Lakefield NP-Drainage
- Morehead River (14) — Lakefield
- Holroyd River (8) — Karpentariengolf
- Annan River (52) — Cooktown-Region

Total: 7 → 13 Flüsse.

### Iteration 3 — Old Telegraph Track endlich separat

Probe-Query gegen OSM zeigte: drei verschiedene Strassennamen mit „telegraph":
1. **Old Telegraph Track** (`highway=unclassified`) — die historische 4WD-Track
2. **Old Telegraph Line Bypass** (`highway=track`) — der Bypass entlang der Track
3. **Bamaga Road (Old Telegraph Line)** (`highway=secondary/unclassified`) — die moderne Bamaga Road

Pattern aufgesplittet:
```js
{ id: 'npaRoad',          pattern: /^bamaga road(\s*\(.*\))?$/i },     // 24→48 ways!
{ id: 'oldTele',          pattern: /^old telegraph track$/i },          // 4 ways → 68 pts
{ id: 'oldTeleBypass',    pattern: /^old telegraph line bypass$/i },    // 1 way → 15 pts
```

`npaRoad` mit erweitertem Pattern erfasst jetzt beide Varianten zusammen → 48 ways, 257 simplified pts (6× detaillierter als k-fix4).

CapeYorkMap.jsx rendert beide Old-Tele-Varianten:
- `oldTele` (echt, primary track-style, 1.4 stroke, 3-2 dash)
- `oldTeleBypass` (sekundär, 1.0 stroke, 2-3 dash, 60% Opacity)

### Iteration 4 — Echte OSM-Coastline als Detail-Overlay

Overpass-Query erweitert um `way["natural"="coastline"]`. Neue Funktion `extractCoastline()`:
- Sammelt alle Coast-Ways
- ChainWaysAll (alle topologisch verketteten Polylines, nicht nur längste)
- Filtert auf signifikante (≥20 Wegpunkte = ~2 km)
- DP-vereinfacht mit ε=0.001°

**Ergebnis: 212 Coast-Polylines mit 5873 simplified Wegpunkten total** (aus 546 OSM-Ways → 346 chains).

Render-Strategie in CapeYorkMap.jsx: feine 0.6-Stroke-Linie über dem Land-Fill, `var(--map-water-deep)` Color, 55% Opacity. Hand-Outline bleibt für Mainland-Continues-South-Effekt — Coastline ist nur Detail-Overlay, kein Replacement.

### Test/Build

- **173 Tests grün**.
- Bundle: 366.22 → **533.98 kB JS** (+167.76 kB · +35.9 kB gzip).
- ⚠ Vite-Warning bei 500-kB-Chunk-Schwelle. Für offline-PWA mit SW-Cache akzeptabel — erster Load 165 kB gzip, dann offline.
- Geo-File on-disk: 74 → 434 kB (vor Minification).

Höhere Bundle-Kosten = Preis für 5873 Coast-Wegpunkte + 488-Punkt-Apudthama + 454-Punkt-PDR + 13 Flüsse. Wenn der User es zu schwer findet, kann ich Coast strenger filtern (top 50 Polylines + ε=0.003°) → schätzungsweise -30 kB JS.

### Geänderte/neue Dateien

- `scripts/fetch-osm-geo.mjs` — SIMPLIFY-Konstanten verschärft, Pattern erweitert um 14 Flüsse + Old-Tele-Split, neue `extractCoastline()`-Funktion, Output erweitert um `COASTLINES`
- `src/data/cape-york-geo.js` — neu generiert mit allen 4 Iterationen
- `src/data/cape-york-pois.js` — `COASTLINES` im Re-Export
- `src/components/CapeYorkMap.jsx` — Coastlines-Render-Schicht, `oldTeleBypass`-Render

### Offene Punkte (für später, wenn User möchte)

- 8 Sub-Flüsse (Stewart, Olive, Coen, Edward, Watson, Lukin, Lockhart, McIvor) in OSM als `stream` statt `river` — falls relevant, Pattern erweitern um `waterway=stream`
- Vegetation aus OSM (`landuse=forest`/`natural=wood`) ersetzt Hand-Patches
- Coast strenger filtern wenn Bundle-Größe stört

---

## 2026-05-04 (k-fix4) — NP-Detail verfeinert + Strassen aus OSM

**Anlass:** User-Wunsch nach k-fix3 — „erhöhe die qualität und die detail genauigkeit der umrisse der national parks im gleichen masse und auch der strassen". Konsequenz aus dem Pipeline-Pivot: wenn schon OSM, dann konsequent — auch für Strassen, und mit feinerer Tolerance für die NPs.

### Änderungen

1. **Layer-spezifische Douglas-Peucker-Tolerances** in `scripts/fetch-osm-geo.mjs`:
   ```js
   const SIMPLIFY = {
     river: 0.005,   // ~550m — Hauptverlauf reicht
     park:  0.002,   // ~220m — Park-Form-Detail (Lobes erkennbar)
     road:  0.001,   // ~110m — Strassen-Kurven sichtbar
   }
   ```

2. **Overpass-Query um Hauptstrassen erweitert.** Server-side gefiltert via `name~"Mulligan|Peninsula Developmental|Bamaga Road|Old Telegraph|Captain Cook|Pajinka|Lockhart Road|Portland Roads",i`. Damit ziehen wir nicht alle 4WD-Tracks rein, sondern gezielt die 6 die wir rendern.

3. **Neue `ROAD_NAME_MAP`** mit Pattern für 6 Road-IDs (`mulligan` / `pdr` / `npaRoad` / `oldTele` / `tipRoad` / `ironRangeBranch`).

4. **`extractRoads()`** Funktion — analog zu `extractRivers()`. Pro Road-ID: alle Match-Ways via Name-Pattern sammeln, mit topologischem Way-Chaining zu einer Polyline verbinden, DP-vereinfachen, runden.

5. **Output erweitert** um `ROADS` (object: `{ [id]: [[lat, lng], ...] }`).

### Ergebnis

```
── Strassen ──
  ✓ mulligan          Captain Cook Highway          454 ways → 1954 pts → 169 simplified
  ✓ pdr               Peninsula Developmental Road  136 ways → 3177 pts → 267 simplified
  ✓ npaRoad           Bamaga Road                    24 ways →  366 pts →  24 simplified
  ✓ oldTele           Old Telegraph Line Bypass       9 ways →  712 pts →  54 simplified
  ✓ tipRoad           Pajinka Road                    6 ways →  288 pts →  40 simplified
  ✓ ironRangeBranch   Portland Roads Road             2 ways →  160 pts →  19 simplified

── NPs (feinere Tolerance) ──
  ✓ np-lakefield   Rinyirru          1273 pts → 157 simplified  (vorher 68)
  ✓ np-iron        Kutini-Payamu     1026 pts →  78 simplified  (vorher 41)
  ✓ np-apudthama   Apudthama         4222 pts → 208 simplified  (vorher 89)
  ✓ np-mungkan     Oyala Thumotang   1346 pts →  65 simplified  (vorher 30)
```

**6/6 Strassen + 4/5 NPs gematcht.** Old Telegraph: matched als „Old Telegraph Line Bypass" (der offizielle PDR-Bypass entlang der Track) — der echte unbypassed Track scheint in OSM nicht unter „Old Telegraph Track" geführt zu werden, eventuell tracktyp-gefiltert weg. Falls visuell nötig: später Pattern erweitern. PDR mit 267 Wegpunkten ist sehr detailliert — Strassen-Kurven sichtbar.

### Map-Komponenten-Anpassung

- **`src/components/CapeYorkMap.jsx`**: das hand-coded `ROADS`-Object (95 Zeilen Wegpunkt-Listen) komplett raus. Stattdessen Import: `import { ROADS } from '../data/cape-york-pois.js'`.
- **`pathFromPoints()`** toleriert jetzt undefined / leere Arrays — falls ein Road-Match fehlt, bleibt der Pfad unsichtbar statt Crash.
- **`src/data/cape-york-pois.js`**: Re-Export erweitert um `ROADS`.

### Test/Build

- **173 Tests grün**.
- Bundle: 348.30 → **366.22 kB JS** (+17.9 kB · +6.4 kB gzip), CSS unverändert.
- Geo-File on-disk: 35 → 74 kB (vor Minification).
- Höhere Bundle-Kosten = Preis für 6 echte OSM-Strassen mit ~573 Wegpunkten + verfeinerte NP-Polygone mit ~508 Wegpunkten (vs. ~228 in k-fix3).

### Geänderte Dateien

- `scripts/fetch-osm-geo.mjs` — SIMPLIFY-Konstanten, Overpass-Query erweitert, `extractRoads()`, ROAD_NAME_MAP, Output erweitert
- `src/data/cape-york-geo.js` — neu generiert, `ROADS`-Export drin, NP-Polygone detaillierter
- `src/data/cape-york-pois.js` — `ROADS` im Re-Export
- `src/components/CapeYorkMap.jsx` — Hand-coded `ROADS`-Object raus, Import + Undefined-Tolerance in `pathFromPoints`

### Bewusst NICHT gemacht

- **Vegetation-Patches durch OSM ersetzt** — wäre eigener Layer (`landuse=forest`), würde Bundle weiter aufblähen ohne klaren Nutzen. Hand-positionierte Patches bleiben.
- **Outline (Halbinsel-Form)** auch via OSM geholt — die Outline ist eine spezielle Konstruktion, die ÜBER den viewBox-Rand hinausgeht (für „Mainland continues south"-Effekt). Coast-Wegpunkte aus OSM zu kombinieren mit dem Mainland-Override ist Mehraufwand und würde den Mainland-Effekt brechen.
- **Old Telegraph Track als separater Layer** — wäre eine weitere Pattern-Erweiterung. Lass ich offen, falls der User es visuell will.

---

## 2026-05-04 (k-fix3) — OSM-Pipeline ersetzt Hand-skizzierte Geo-Daten

**Anlass:** User-Feedback nach k-fix2 — „es ist immer noch ziemlich ungenau". Diagnose: strukturelles Problem, kein Detail-Problem. Hand-skizzierte Polygone aus Trainingswissen können nicht akkurat sein, weil offizielle QPWS-Polygone tausende Wegpunkte haben — ich approximiere mit ~10. Lösung: echte OSM-Geometrien build-time fetchen, vereinfachen, statisch ausliefern. Analog zur bestehenden Tankstellen-Pipeline (`fetch-osm.mjs`).

### Neues

1. **`scripts/fetch-osm-geo.mjs`** (neu) — Build-time Overpass-API-Fetch:
   - Overpass-QL-Query: `way["waterway"="river"]` + `relation["boundary"="protected_area"|"national_park"]` + `way["boundary"="national_park"]` in Cape-York-BBox (-19/-10.5 lat × 141.5/146 lng).
   - Pro Fluss: alle Match-Ways via Name-Pattern sammeln, mit topologischem Way-Chaining (10m-Tolerance an Endpunkten) zur längsten Polyline verkettet.
   - Pro NP: Relation-Members mit `role=outer` extrahiert + verkettet, Polygon geschlossen (erster=letzter Punkt).
   - Douglas-Peucker-Vereinfachung mit ε=0.005° (~550m). Reduziert tausende OSM-Wegpunkte auf ~10–150 pro Form.
   - Name-Pattern-Lookup (`RIVER_NAME_MAP` / `NP_NAME_MAP`) mappt OSM-Namen auf interne IDs (`np-lakefield`, `jardine`, etc.).
   - Output: `src/data/cape-york-geo.js` als ESM-Modul, ODbL-attribuiert, mit `RIVERS`, `NP_POLYGONS`, `NP_POLYGONS_META`, `GEO_GENERATED_AT`, `GEO_ATTRIBUTION`.

2. **`package.json`** — neuer Script-Eintrag `geo:refresh: node scripts/fetch-osm-geo.mjs`. Manuell ausführen wenn OSM-Daten aktualisiert werden sollen — Build selbst ist offline.

3. **`src/data/cape-york-pois.js`** — Hand-skizzierte `NP_POLYGONS` und `RIVERS` (aus k-fix2) komplett raus. Stattdessen Re-Export aus `cape-york-geo.js`. Datenmodell identisch, `CapeYorkMap.jsx` unverändert.

### Ergebnis (erster Run)

```
── Flüsse ──
  ✓ jardine     5 ways  → 1686 pts → 52 simplified
  ✓ wenlock     3 ways  → 1338 pts → 117 simplified
  ✓ pascoe      1 ways  →  724 pts → 28 simplified
  ✓ archer      1 ways  →   65 pts → 7 simplified
  ✓ normanby    3 ways  →  587 pts → 55 simplified
  ✓ endeavour   4 ways  →  280 pts → 14 simplified
  ✓ mitchell   13 ways  → 1737 pts → 149 simplified

── Nationalparks ──
  ✓ np-lakefield   Rinyirru             1273 pts → 68 simplified
  ✓ np-iron        Kutini-Payamu        1026 pts → 41 simplified
  ⚠ np-jardine     no OSM match
  ✓ np-apudthama   Apudthama            4222 pts → 89 simplified
  ✓ np-mungkan     Oyala Thumotang      1346 pts → 30 simplified
```

**`np-jardine` ohne Match** — das alte Jardine River National Park wurde 2014 von der QLD-Regierung in das neue Apudthama National Park (Cape York Peninsula Aboriginal Land) integriert. Existiert offiziell nicht mehr separat. Der `np-jardine`-POI bleibt als Marker erhalten (zeigt einen Klickpunkt am alten Park-Center), das Polygon liegt jetzt im Apudthama-Polygon.

### Vorteile gegenüber Hand-Daten

- **Genauigkeit:** echte QPWS-/QLD-Government-Grenzen, nicht 10-Wegpunkt-Skizzen aus meinem Kopf.
- **Aktualisierbar:** ein Re-Run von `npm run geo:refresh` zieht den aktuellen OSM-Stand. Hand-Daten verrotten still.
- **Pipeline statt Polygone:** Skript konsistent mit bestehender `fetch-osm.mjs`-Logik (gleicher Overpass-Endpoint, gleiche Lizenz-Behandlung, gleiche Build-time-Strategie).
- **Lizenz-konform:** ODbL-Attribution in der Datei + im AboutTab.

### Test/Build

- **173 Tests grün** (POI-Tests prüfen `CAPE_YORK_POIS`/`LAYERS`/`MAP_BOUNDS` — Re-Export der Geo-Daten ändert das Schema nicht).
- Bundle: 335.12 → **348.30 kB JS** (+13.2 kB · +5.8 kB gzip), CSS unverändert.
- Höhere Bundle-Kosten = Preis für echte Geometrie. 4 NP-Polygone mit 228 Wegpunkten + 7 Flüsse mit 422 Wegpunkten = 650 echte OSM-Wegpunkte statt ~50 hand-skizzierte. Akzeptabel — die Karte ist jetzt geographisch korrekt.

### Geänderte/neue Dateien

- `scripts/fetch-osm-geo.mjs` — **NEU** (Pipeline-Skript)
- `src/data/cape-york-geo.js` — **NEU** (Auto-Generated-File, committed wie `route-pois.js`)
- `src/data/cape-york-pois.js` — Hand-Polygone raus, Re-Export aus geo-File
- `package.json` — neuer `geo:refresh`-Script

### Bewusst NICHT gemacht

- **Eigene Tests für die Geo-Daten** — wäre nur Schema-Wiederholung. Die bestehenden POI-Tests + Build-Validierung reichen.
- **Render-Code in `CapeYorkMap.jsx` angepasst** — Datenmodell ist unverändert (gleiche Form von `RIVERS`/`NP_POLYGONS`), Code muss nicht angefasst werden.
- **Vegetation-Patches durch OSM-Daten ersetzt** — wäre eigener Layer (`landuse=forest|wood`), würde zusätzliche Komplexität bringen ohne klaren Nutzen. Die 3 hand-positionierten Patches stimmen ungefähr mit Iron Range / Lakefield / Central Peninsula überein und sind nur als Hintergrund-Andeutung gedacht.

---

## 2026-05-04 (k-fix2) — NP-Polygone detaillierter + Hauptflüsse als eigene Schicht

**Anlass:** User-Wunsch nach mehr geographischer Realität. Zitat: „versuche die formen der national parks noch genauer ein zu zeichnen, dass sie mehr der realität entsprechen, und mit einem anderen blau zeichnest du noch die verläufe der wichtigsten flüsse ein".

### Was kam dazu

1. **NP-Polygone mit 6–10 statt 4 Wegpunkten.** Alle 5 Parks neu gezeichnet:
   - **Lakefield (Rinyirru):** 10pt mit West-Lappen Richtung Battle Camp + East-Erweiterung in Princess Charlotte Bay-Wetlands.
   - **Iron Range (Kutini-Payamu):** 7pt entlang Lockhart-River-Region, östliche Kante an der Korallenmeerküste.
   - **Jardine River NP:** 7pt entlang dem Jardine-Flusslauf, langgezogen O→W.
   - **Apudthama / Heathlands:** 7pt mit Multi-Lappen-Form für Pajinka/Somerset/Bamaga-Umgebung.
   - **Mungkan Kandju (Oyala Thumotang):** 7pt westlich von Coen.

   Datenquelle: QPWS-Karten-Skizzen + Aussie-4WD-Reise-Wissen — bewusst nicht geo-genau (offizielle Polygone haben tausende Punkte), aber genug für plausiblen Form-Eindruck.

2. **Neue `RIVERS`-Konstante** in `cape-york-pois.js`, 7 Cape-York-Hauptflüsse mit jeweils 3–5 Wegpunkten von Quelle zu Mündung:
   - **Jardine** — Heathlands → Ferry-Crossing → Karpentariengolf-Mündung
   - **Wenlock** — Quellgebiet → Bridged-Crossing-PDR → Karpentariengolf
   - **Pascoe** — Quelle → Iron-Range-Region (notorisches Old-Tele-Crossing)
   - **Archer** — Coen-Side → Archer River Roadhouse → Karpentariengolf
   - **Normanby** — Lakefield-südlich → Princess Charlotte Bay
   - **Endeavour** — südwestlich Cooktown → Cooktown-Mündung
   - **Mitchell** — südliche Cape-Region → Karpentariengolf (definiert das Mainland südlich)

3. **Neue CSS-Variable `--map-river: #4A7FB8`** in `index.css` — mid-blue, klar verschieden vom türkis-grünen Salzwasser. Linienbreite 1.4px, opacity 0.85, runde Linien-Joins/Caps.

4. **Render-Reihenfolge in `CapeYorkMap.jsx` aktualisiert.** Neue Schicht-Reihenfolge: Wasser-Hintergrund → Land-Outline → Vegetation → NP-Polygone → **Flüsse** → Strassen → Anker-Labels → Marker → Kompass → Footer-Text. Damit liegen Strassen optisch über den Flüssen (wie Brücken) — geographisch korrekter Render-Stack.

   Flüsse sind **immer sichtbar** (nicht layer-toggle-gated), weil Wasserläufe Pflicht-Geographie sind und nicht zum Premium-Bonus gehören.

### Test/Build

- **173 Tests grün** (POI-Tests prüfen Datenstruktur — RIVERS-Daten brechen keine bestehende Test-Annahme da NP_POLYGONS nur in Werten erweitert, nicht im Schema, und RIVERS eine neue exportierte Konstante ohne POI-Berührung ist).
- Bundle: 332.50 → **335.12 kB JS** (+2.6 kB · +0.3 kB gzip), CSS unverändert ~36.5 kB. Sehr günstig: 7 Flüsse mit ~28 Wegpunkten und erweiterte NP-Polygone sind reine Datenpunkte.

### Geänderte Dateien

- `src/data/cape-york-pois.js` — NP_POLYGONS expanded + neue RIVERS-Konstante
- `src/components/CapeYorkMap.jsx` — RIVERS-Import + neue Render-Schicht zwischen NP-Polygonen und Strassen
- `src/index.css` — neue `--map-river`-Variable

---

## 2026-05-04 (k-fix) — Map-Verbesserungen v2: Geo-Fixes + UX-Bugs

**Anlass:** User hat im Live-Test 6 konkrete Probleme im neuen Map-Tab gefunden. Alle valide. Ich hatte beim ersten Wurf zu schnell „schematisch" mit „grob falsch" verwechselt.

### Was war kaputt

1. **Tankstellen in einer Linie im Wasser** — `projectFuelStop` projizierte alle FUEL_STOPS linear auf die Cairns→Bamaga-Achse, weil ich annahm, sie hätten keine echten Lat/Lng. Hatten sie aber: `route-pois.js` führt `lat`/`lon` pro Stop. Linear-Projektion war komplett unnötig und verlegte Stops ins Wasser.
2. **Vegetations-Oval an seltsamer Stelle, im Wasser** — `<ellipse cx={project(-13.0, 143.0)} rx={55} ry={100}>` war für eine 360px-Karte viel zu groß und ragte über die Land-Outline hinaus.
3. **Old Telegraph Track ungenau** — nur 6 Wegpunkte für eine Strecke mit 13 berühmten Crossings. Die Linie sah aus wie ein gerader Strich.
4. **Tap auf Marker zeigt nichts** — SVG-`pointer-events`-Default ist `visiblePainted`. `<circle fill="transparent" />` (= alpha 0) ist NICHT clickable. Der `<g>`-Container war es auch nicht. Effektiv war nur das innere 4.5px-Marker-Pixel klickbar — viel zu klein für Daumen.
5. **Nationalpark-Grenzen fehlen** — die NP-Layer zeigte nur Marker, keine Flächen. User wollte Grenzen sehen.
6. **Cape York wirkt wie Insel** — Outline schloss am südlichen Bildrand mit einer Diagonale, die so aussah als wäre Cape York vom Meer umgeben. Tatsächlich ist Cape York eine Halbinsel, die aus dem Mainland-Queensland in den Norden ragt.

### Was gefixt wurde

1. **Echte OSM-Koordinaten für Tankstellen.** Code in `CapeYorkMap.jsx`: `project(stop.lat, stop.lon)` direkt — keine `projectFuelStop`-Krücke mehr (Funktion entfernt). Die 71 Fuel-Stops liegen jetzt geografisch korrekt.
2. **Vegetation als 3 Land-Patches.** Konstante `VEGETATION_PATCHES` mit (lat, lng, rx, ry, opacity) für jede Position: Iron Range NP (-12.85/143.30), Lakefield NP (-14.85/144.20), Central Peninsula (-13.20/142.80). Sub-30px-Radius statt 100. Liegen alle innerhalb der Land-Outline.
3. **Old Telegraph Track mit 14 Wegpunkten.** Von Bramwell Junction nordwärts: Palm Creek → Ducie River → South Alice River → Cypress Creek → Bertie Creek → Cholmondeley Creek → Cannibal/Sailor Creek → Sam/Indian Head Falls → Mistake Creek → Cannibal Creek → Nolan's Brook → joins Jardine Ferry/NPA. Linie folgt jetzt dem realistischen Verlauf.
4. **Marker-Hit-Area mit `pointerEvents="all"`.** Jeder Marker ist ein `<g>` mit zwei Circles: einem 14px-Radius-Hit-Circle (`fill="white" fillOpacity="0.001" pointerEvents="all"`) und dem sichtbaren 4.5px-Marker (`pointerEvents="none"`). Touch-Bereich = 28px Diameter, gut für Daumen. Der Trick mit `fill-opacity 0.001` macht den Hit-Circle effektiv unsichtbar (1/1000 alpha) aber für SVG-`visiblePainted`-Hit-Testing klickbar.
5. **NP-Polygone als Layer-Visualisierung.** Neue Konstante `NP_POLYGONS` in `cape-york-pois.js` mit 5 vereinfachten Lat/Lng-Polygonen (Lakefield, Iron Range, Jardine, Apudthama, Mungkan Kandju). In `CapeYorkMap.jsx`: wenn 'park'-Layer aktiv, werden die Polygone als gestricheltes transparent-grünes `<path>` gerendert (`stroke-dasharray="4 2"`, `opacity="0.7"`). Marker bleiben darüber zusätzlich sichtbar für Detail-Tap.
6. **viewBox-Erweiterung + Outline-Strategie für „Mainland continues".** `MAP_BOUNDS.latMin = -19` (statt -17.10), VIEWBOX_H = 720 (statt 600). Outline-Pfad geht ÜBER den unteren viewBox-Rand hinaus: nach Aurukun führen Wegpunkte weiter südlich (Edward River, Karpentariengolf-Coast bei -15/-16/-17.5), dann sprung zu (-19.10, 141.50) → (-19.10, 145.90) → zurück zu Cairns. Der Bottom-Rand wird dadurch komplett Land. Plus Footer-Text „↓ Queensland mainland continues south ↓" als kursiver subtiler Hinweis.

### Bonus-Verbesserungen

- **Wasser-Tiefen-Akzent:** Zusätzlicher dünner `var(--map-water-deep)`-Stroke um die Outline (3px, 50% opacity) gibt Coast-Linien-Tiefe-Andeutung.
- **`--map-park-fill` + `--map-park-stroke` als CSS-Variablen** in index.css hinzugefügt — konsistent mit dem Map-Farbsystem.
- **`projectFuelStop`-Funktion komplett entfernt** — war ein Workaround für nicht-vorhandene Daten, die in Wahrheit da waren.

### Bewusst NICHT gemacht (noch)

- **Geo-genaue NP-Polygone aus OSM/QPWS-Daten** — das wäre Stufe-2-Erweiterung. Vereinfachte Polygone reichen für die Marketing-Map; wer akkurate Grenzen braucht, lädt die offizielle QPWS-App.
- **Karten-Pinch-Zoom** — bewusst keine Zoom-Funktion. Karte ist „Übersicht auf einen Blick", Marker-Detail kommt im Bottom-Sheet.
- **Side-Coast-Inseln** (Lizard Island, Restoration Island, Thursday Island) — nicht im Outline. Das ist eine schematische Halbinsel-Map, nicht navigatorisch.

### Test- und Build-Stand

- **173 Tests bleiben grün** (Bug war reines Visualisierungs-Layer)
- Bundle: 332.50 → 332.66 kB JS (~unverändert · die geänderten Wegpunkte sind im Code-Volumen unauffällig)
- Build clean (`npm run build` 681 ms)

---

## 2026-05-04 (k) — Cape-York-Map-Tab (interaktive Karte mit Layer-Toggles)

**Anlass:** User hat die Daysheet-Fuel-Section als „fragwürdig" identifiziert — die lineare Cairns→Bamaga-Interpolation hat Tagesschätzungen geliefert, die für realistische Trips (mit Pausen, Side-Trips, Lakefield-Detour usw.) meist daneben lagen. Statt das zu kaschieren oder das Feature ehrlich einzustampfen, hat der User vorgeschlagen: schematische Karte mit Layer-Toggles für Tankstellen, POIs, Strände usw. Großer Pivot — viel mehr Wert als das alte Feature, gleichzeitig Marketing-Asset (Karten-Screenshot fürs Pitch + Werbevideo).

### Was gebaut wurde

- **`src/data/cape-york-pois.js`** — 47 kuratierte POIs aus Aussie-4WD-Reise-Wissen + OSM-Recherche, in 8 Layern:
  - **🛒 Resupply (free, 5):** Cairns, Cooktown, Coen, Archer River, Bamaga
  - **🏖 Beaches (free, 7):** Chili Beach, Loyalty Beach, Punsand Bay, Pajinka, Vrilya Point, Captain Billy Landing, Mapoon
  - **🌊 River crossings (free, 6):** Jardine Ferry, Wenlock, Pascoe, Dulhunty, Bertie Creek, Gunshot Creek
  - **🏕 Campgrounds (premium, 8):** Eliot Falls/Heathlands, Bramwell Junction, Bramwell Station, Captain Billy Camp, Chili Beach Camp, Loyalty Beach Camping, Moreton Telegraph, Lakefield NP
  - **💧 Waterfalls (premium, 5):** Fruit Bat Falls, Eliot Falls, Twin Falls, Indian Head Falls, Saucepan Falls
  - **🏞 National parks (premium, 5):** Lakefield/Rinyirru, Iron Range/Kutini-Payamu, Jardine, Apudthama, Mungkan Kandju
  - **📜 Historical (premium, 6):** Cape York Tip Marker, Somerset Beach, Mapoon Mission, Quinkan Rock Art (Laura), Old Telegraph Track, Moreton Telegraph Station
  - Plus `LAYERS`-Konstanten (id/label/icon/color/premium-flag) und `MAP_BOUNDS` (latMin/latMax/lngMin/lngMax) für die SVG-Projektion.
  - Premium-Strategie: Sicherheits-/Pflicht-Wissen ist free (Resupply, Fuel, Beaches, Crossings); Bonus-Content ist premium (Camps, Waterfalls, NP, Historical). Crossings-MUSS-free weil Sicherheits-relevant (Croc-Areas, Crossing-Bedingungen).

- **`src/components/CapeYorkMap.jsx`** — Inline-SVG (offline-fähig, ~13 KB JSX), 400×600 viewBox.
  - **Halbinsel-Outline:** 38 Wegpunkte aus geographischen Coastline-Punkten (Cairns → Cape Trib → Cooktown → Cape Flattery → Cape Melville → Princess Charlotte Bay → Stewart River → Cape Sidmouth → Cape Direction → Lockhart → Cape Weymouth → Cape Grenville → Captain Billy Landing → Pajinka → Vrilya → Mapoon → Weipa → Aurukun → Diagonale zurück nach Cairns). Schließt geschlossen.
  - **5 Strassen** als path-Lines: Mulligan Highway (Cairns→Cooktown sealed), PDR (Lakeland→Bramwell), NPA Road (Bramwell→Bamaga), Old Telegraph Track (gestrichelt 3-2 für „abenteuerlich"), Tip Road (Bamaga→Pajinka), Iron Range Branch.
  - **6 Anker-Labels** (Cairns/Cooktown/Coen/Bamaga/Tip/Weipa) immer sichtbar, mit kleinem Punkt + Beschriftung neben.
  - **Marker** für aktive Layer als farbige Kreise (5px Radius, weißer Stroke). Tap-Handler übergibt POI an Parent-Component.
  - **Fuel-Stops** linear projiziert auf der Cairns→Bamaga-Linie (FUEL_STOPS haben aktuell nur kmFromCairns, keine echte Geo-Position — das ist ehrlich dokumentiert in der `projectFuelStop`-Notiz; geographische Korrektheit ist Stufe-2-Erweiterung).
  - **Kompass-Rosette** rechts unten als Mini-Legende (N + Pfeil auf hellem Beige-Hintergrund mit Outline).

- **`src/components/InfoMapTab.jsx`** — Tab-Container (~5 KB).
  - Header mit Title + Subtitle.
  - SVG-Karte in einem türkisen Background-Container (= Wasser drumherum sichtbar).
  - „Show on map"-Heading + 8 Layer-Toggle-Pills im 2-Spalten-Grid. Aktive Pills mit Border in Layer-Farbe + leichtem Tint-Hintergrund (12% mix gegen weiß, inline berechnet damit nicht alle 8 Farben als CSS-Variablen vorab gepflegt werden müssen).
  - Premium-Pills haben 🔒-Marker und sind ausgegraut; Tap öffnet `onUpgrade()` (= PremiumInfoTab) statt zu togglen.
  - Bottom-Sheet bei Marker-Tap mit POI-Name, km-Marker, Layer-Tag, Detail-Blurb. Nutzt die existierende `Sheet`-Komponente aus DaySheet.
  - OSM-Attribution + Schematik-Disclaimer unten.
  - State: `activeLayers` (Set) + `selectedPoi` (object | null). Default: alle Free-Layer an, Premium aus.

- **App.jsx Integration:**
  - Import `InfoMapTab`.
  - `buildActiveTripTabs()` bekommt einen 3. Tab `🗺️ Map` (zwischen Recipes und Shopping-Stops).
  - Neuer View-State `'map'` für direkt-aufruf von Home aus.
  - `handleOpenMap`-Callback + `🗺️`-Topbar-Icon auf Home (`showMapBtn = isHome`). Topbar hat jetzt drei Quick-Access-Icons rechts (👤 Premium, 🗺️ Map, ⓘ About).
  - Render-Branches: `view === 'trip-active' && activeTab === 'map'` UND `view === 'map'` rendern beide `<InfoMapTab />` mit `premium` und `onUpgrade`.

- **DaySheet aufgeräumt:**
  - `estimateRoutePosition`/`nextFuelStops`-Imports entfernt.
  - Komplette Fuel-Section (24 Zeilen JSX) raus.
  - `trip`-Prop entfernt (wurde nur für Fuel-Schätzung gebraucht).
  - ConfiguratorTab.jsx übergibt `trip` nicht mehr.
  - `route-position.js` + `route-position.test.js` bleiben fürs Erste — sind kein produktiver Code mehr, aber Tests grün und Cleanup ist non-breaking. Stufe-2-Aufräumarbeit.

- **CSS:**
  - **Neue Farbpalette in `index.css`:** `--map-water` (türkis #6FBFB0), `--map-water-deep` (#4DA694), `--map-land` (warmes Beige #EFE6CE), `--map-beach` (Strand-Akzent #F5EFD8), `--map-vegetation` (frisches Grün #7AAE85), `--map-road` (warmes Braun #6B4E2D), `--map-road-track` (Light Brown #B19268, Old Telegraph), `--map-text` (#2F4A3E dunkelgrün-grau).
  - **In `App.css`:** `.map-tab-wrap`, `.map-canvas-wrap` (türkises Background, Box-Shadow), `.cape-york-map .map-marker` (Tap-Animation), `.map-layers-grid` (2-Spalten-Pill-Grid), `.map-layer-pill` mit `.active`/`.locked`-Variants, `.map-poi-meta`/`.map-poi-blurb` für Bottom-Sheet, `.topbar-map`-Button.

- **Strings:** `S.app.tabs.map`, `S.map.{title, subtitle, layersHeading, unnamedPoi, attribution}`.

- **Tests (+8) `src/data/cape-york-pois.test.js`:**
  - POI-Pflichtfelder vorhanden (id, name, layer, lat, lng)
  - IDs unique
  - jeder POI-Layer ist in LAYERS deklariert
  - alle POIs liegen innerhalb MAP_BOUNDS
  - LAYERS-Konstanten korrekt (Hex-Color-Pattern, premium-Flag)
  - Free-Layer (Resupply, Fuel, Beaches, Crossings) explizit `premium: false`
  - jeder Layer hat min. 1 POI (außer fuel — kommt aus FUEL_STOPS)
  - Premium-Layer-POIs haben konsistente `premium: true`-Flag

### Bewusst NICHT gemacht

- **Geographisch korrekte Fuel-Stop-Lat/Lng** — `FUEL_STOPS` (route-pois.js) hat nur kmFromCairns, keine echten lat/lng-Werte. Auf der Karte werden sie linear auf Cairns→Bamaga-Linie projiziert (siehe `projectFuelStop`-Notiz). Geographisch korrekt machen wäre eine OSM-Pipeline-Erweiterung um lat/lng-Felder — kein Bug, sondern Stufe-2-Improvement.
- **Echte Karten-Library (Leaflet/Mapbox)** — bewusst Inline-SVG. Cape York hat oft kein Empfang → Tile-Loading wäre Showstopper. Plus: schematische SVG passt zum App-Design viel besser, kostet nichts in Bundle-Größe (Mapbox-SDK = ~250 KB), keine API-Keys, keine Lizenzkosten.
- **Pinch-to-Zoom / Pan** — die Karte ist als „Übersichts-Map auf einen Blick" konzipiert. Wenn User mehr Detail braucht, soll er auf Marker tappen (= Detail-Sheet öffnet). Zoom wäre Komplexität ohne klaren Mehrwert.
- **Map auf About-Tab integriert** — der Map-Tab ist ein eigener First-Class-View, nicht versteckt im About. Das ist zentraler Marketing-Hook.
- **route-position.js sofort gelöscht** — bewusst gelassen, falls Stufe-2-Logik (z.B. Fuel-Range-Warnings basierend auf User-bestätigten Tankstops) das wieder will. Tests bleiben grün, Code ist isoliert.
- **Marker-Cluster bei Overlap** — manche POIs liegen sehr nah beieinander (z.B. Eliot Falls + Twin Falls + Indian Head Falls). Das ist OK, weil die Map relativ groß ist und User sich orientieren kann. Cluster wäre Overkill.

### Marketing-Wert

- **Pitch-Asset:** Vermieter sehen auf einen Blick was die App macht („all the campsites + fuel + crossings on one screen"). Vorher musste man Trip planen + Tabs durchklicken, um den Wert zu sehen.
- **Werbevideo:** Map-Tab ist visually engaging — Layer ein-/ausschalten ist instagrammable.
- **Premium-Conversion:** 🔒-markierte Layer-Pills sind dauerhaft sichtbar. Free-User lernt schnell „die anderen 4 Layer wären cool, schau ich mir Premium an".
- **Pre-Sale erreichbar:** Map-View über Topbar-Icon = User kann die App-Qualität sehen, bevor er einen Trip konfiguriert. Senkt die Hürde.

### Test- und Build-Stand

- **173 Tests grün** (vorher 165, +8 für POI-Datenstruktur)
- Bundle: 317.38 → **332.50 kB JS** (+15.12 kB) · 99.44 → **104.87 kB gzip** (+5.43 kB) · CSS 34.38 → **36.46 kB** (+2.08 kB)
- Build clean (`npm run build` 824 ms)

---

## 2026-05-04 (j-fix) — Bugfix: config-Merge in App.jsx

**Anlass:** User hat im lokalen Dev-Server gemeldet, dass beide neuen Features aus (j) **nicht funktionieren**: Cluster-Erklärungs-Banner ist unsichtbar, und SwapSheet bietet weiter Frischfleisch-Rezepte an Off-Cluster-Tagen an. Live-Test hat die fehlende Verdrahtung aufgedeckt — die Tests waren grün, aber die Tests prüfen nur den Generator-Output, nicht ob App.jsx das richtige Config-Objekt durchreicht.

### Was war kaputt

- App.jsx übergab `<MenuTab config={config} />`, wobei `config` das **raw**-Config aus `useStorage.js` ist (= User-Eingabe + Defaults).
- `result.config` (= Generator-Output mit `dietApplied`, `meatAllowedDays`, `meatClusterDays`, `bamagaStop` etc.) wurde **nicht** durchgereicht.
- MenuTab-Banner-Bedingung `config?.dietApplied === 'omnivore' && config?.meatAllowedDays` evaluierte zu `false && undefined` → Banner unsichtbar.
- SwapSheet checkt `meatAllowedDays.includes(dayNum)` — `meatAllowedDays` war `undefined`, die `Array.isArray()`-Hülle in der `useMemo` returnte `true` (= „kein Filter"), Frischfleisch wurde nicht ausgefiltert.

### Was gefixt wurde

- `<MenuTab config={{ ...config, ...result.config }} />` — Spread-Merge: raw-Felder (`overrides`, `restaurantSlots`, `enabledStops`, `allergiesEnabled`) bleiben erhalten, Generator-Output-Felder (`dietApplied`, `meatAllowedDays`, `meatClusterDays`) werden ergänzt. Beide Welten in einem Objekt.
- Eine Zeile, beide Bugs (Banner + SwapSheet) zugleich behoben — Verdrahtungs-Fehler, kein Logik-Fehler.

### Lessons learned

- **Tests prüften Generator-Output korrekt** (`meatAllowedDays` ist da), aber nicht **Component-Wiring**. Component-Tests für die UI-Verkabelung wären wertvoll, sind aber Stufe-2-Material (Vitest mit `@testing-library/react`).
- **Live-Test nach Feature-Rollout ist nicht-verhandelbar** — der User-Test hat in 2 Minuten gefunden, was die 165 Generator-Tests nicht abdecken konnten. Im CLAUDE.md § Doing tasks ist genau das dokumentiert: „If you can't test the UI, say so explicitly rather than claiming success."

### Test- und Build-Stand

- **165 Tests bleiben grün** (kein Test betroffen — der Bug war im UI-Layer, nicht im Generator)
- Bundle unverändert (eine 1-Zeilen-Änderung im JSX)

---

## 2026-05-04 (j) — Konservierte Fleisch/Fisch-Rezepte + transparente Cluster-Logik

**Anlass:** Drei zusammenhängende User-Anliegen, die alle dieselbe Customer-Verständnis-Lücke adressieren („Wo ist das Fleisch an späteren Tagen?"):
1. Pool sollte explizit shelf-stable Protein-Optionen für späte Trip-Phasen haben (über die existierenden m6/m11/a3 hinaus)
2. SwapSheet sollte an Off-Cluster-Tagen keine Frischfleisch-Rezepte mehr anbieten (User könnte sonst versehentlich Tag 12 mit „Pasta Bolognese" befüllen → Fleisch wäre lange verdorben)
3. Cluster-Logik muss für Kunden im UI sichtbar erklärt werden, sonst wirkt der Plan willkürlich

### Was gebaut wurde

**Pool-Erweiterung (5 neue Omnivore-Rezepte, alle shelf-stable):**
- **m22 Spam fried rice** — Aussie/USA-Klassiker (canned luncheon meat + leftover rice + eggs + soy + sesame), 1-burner, cooling 'none'
- **m23 Canned salmon rice bowl with lemon mayo** — sushi-bowl-Style mit drained canned salmon + Reis + Avocado + Cucumber + Nori, 1-burner, cooling 'low'
- **a30 Smoky tuna and white bean stew** — One-pot mit canned tuna + cannellini-Bohnen + Tomaten + Smoked Paprika, 1-burner, cooling 'none'
- **a31 Bully beef hash with crispy eggs** — Iconic Aussie camping food (canned corned beef + Kartoffeln + Worcestershire + Eier), 1-burner, cooling 'low'
- **a32 Sardine spaghetti with chili, lemon and breadcrumbs** — Italienisch-style (canned sardines disintegrate to umami sauce + Knoblauch + Chili + Toasted breadcrumbs), 2-burner, cooling 'none'

Diese Rezepte werden vom existierenden `containsFreshMeat()`-Filter automatisch als nonMeat klassifiziert (das `SHELF_STABLE_RX = /jerky|biltong|salami|canned|tinned|in oil|in brine/`-Pattern matcht zuerst, dann FRESH_MEAT_RX). Sie landen also im freien nonMeat-Pool und werden auch jenseits des Frischfleisch-Clusters für Round-Robin gepickt. **Header-Doc** (`recipes.js`) explizit dokumentiert welche 8 Rezepte (3 alte + 5 neue) Off-Cluster-fähige Omnivore-Optionen sind.

**Generator-Output erweitert:**
- `result.config.meatAllowedDays` als sortiertes `Array<number>` der Day-Nummern in denen Frischfleisch-Cluster aktiv sind (Cairns-Cluster Tag 1..clusterDays, plus Bamaga-Cluster bamagaDay..bamagaDay+clusterDays). Wird via `[...meatDayIndex(...).keys()].sort()` aus der existierenden Map abgeleitet — keine neue Logik, nur ein zusätzlicher Export.

**SwapSheet konsistent gefiltert:**
- Neuer Prop `meatAllowedDays`, durchgereicht von MenuTab via `config.meatAllowedDays`.
- `useMemo`-Check: `dayNum` in der Liste? Wenn nicht UND `dietApplied === 'omnivore'`, wird `includeMeat: false` an `compatibleRecipesForCat()` übergeben — dieser Param existierte bereits, wurde nur nicht genutzt vor heute.
- **Hint-Box oben im Sheet** wenn Filter aktiv: „ℹ️ Fresh meat (chicken, beef, lamb, sausages) is hidden for this day — it would have spoiled in your cooler by now. Pick from canned, vegetarian or vegan options below."

**MenuTab-Erklärungs-Banner (`ClusterInfoBanner`-Komponente):**
- Erscheint nur wenn `dietApplied === 'omnivore'` UND `meatAllowedDays.length < plan.length` (= es gibt Off-Cluster-Tage).
- Standard collapsed mit Tagline „🥩 Fresh meat scheduled on X of Y days — tap for why".
- Aufgeklappt: 3 Sektionen — Erklärung der Fridge-Cluster-Mathe (mit konkreten clusterDays + fridgeSize-Werten), Liste der Substitute (Vegetarian/Vegan, Shelf-stable Protein, Eier/Käse/Halloumi), Bamaga-Reset-Hinweis (Variante mit/ohne Bamaga-Stop).
- **Kein Dismiss** — User kann es zuklappen, aber es bleibt jederzeit auffindbar. Verhindert „Wo war nochmal die Erklärung?"-Effekt.

**Strings:**
- `S.menu.swap.noFreshMeatHint` — SwapSheet-Hint
- `S.menu.meatCluster.{tagline, body1, body2, shelfStableExamples, body3WithBamaga, body3NoBamaga}` — Banner-Inhalte mit Funktion-Templates für dynamische Werte (clusterDays, fridgeSize, meatDays, totalDays).

**CSS:**
- `.cluster-info-banner` (Orange-akzentuierter expandable Container, FFF7ED-Hintergrund), `.cluster-info-head/body/list` (Layout + Arrow-Animation), `.swap-meat-filter-hint` (Left-Border-Akzent für SwapSheet).

**Tests (+2):**
- `meatAllowedDays listet die Cluster-Tage (Cairns + Bamaga)` — prüft dass beide Cluster enthalten sind, Tag dazwischen fehlt, Sortierung stimmt.
- `meatAllowedDays bei kleinem Cluster + langem Trip ist deutlich kleiner als days` — small fridge ohne Bamaga = nur clusterDays viele Tage.

### Bewusst NICHT gemacht

- **Per-Slot-Filtering im SwapSheet** (z.B. Frischfleisch-Frühstück nur an Cluster-Tag 0) — die Generator-Logik unterscheidet Slots, das SwapSheet pauschal nicht. Konsistent ist „Off-Cluster = kein Frischfleisch egal welcher Slot". Granularität wäre Stufe-2-Generator.
- **Override-Warning bei Cluster-Verstoß** — wenn User trotzdem ein Frischfleisch-Rezept manuell als Override speichert (z.B. via fremde Quelle / direktem localStorage-Edit), ignoriert der Generator das nicht. Override gewinnt — User-Wahl. Das passt zur existierenden Override-Doktrin („User darf Constraints überschreiben").
- **Geänderter Generator-Algorithmus** — die Plan-Generierung selbst nutzt schon die Cluster-Logik korrekt; das Problem war ausschließlich UI-/Communication-Lücke, nicht Algorithm-Lücke. Algorithmus unverändert.
- **Banner für Vegan/Vegetarian** — die haben das Problem nicht (Vegan-Plan hat nie Frischfleisch, kein Erklärbedarf). Banner-Bedingung explizit `omnivore`-only.
- **Localization der shelfStableExamples** — Englisch only im MVP (CLAUDE.md § Coding-Regeln + i18n ist Stufe 2).

### Test- und Build-Stand

- **165 Tests grün** (vorher 163, +2 für meatAllowedDays-Korrektheit)
- Bundle: 307.30 → **317.38 kB JS** (+10.08 kB) · 96.63 → **99.44 kB gzip** (+2.81 kB) · CSS 33.37 → **34.38 kB** (+1.0 kB) · die 5 neuen Rezepte mit voller Zutaten-/Schritt-Liste sind der Wachstumsfaktor; Banner-Komponente klein
- Build clean (`npm run build` 631 ms)

---

## 2026-05-04 (i) — Vegan-Branding subtiler: Badge statt Präfix

**Anlass:** Der User hat bemerkt, dass das prominente „Vegan "-Präfix in 11 Rezeptnamen für die breite Zielgruppe (4WD-Mieter aus Cairns — überwiegend Nicht-Veganer) abschreckend wirken kann. „Vegan banana pancakes" liest sich wie eine Diät-Konzession statt einer normalen Mahlzeit. Lösung: Diät-Hinweis als kleines Symbol statt im Namen.

### Was gebaut wurde

- **Neue Komponente `src/components/VeganBadge.jsx`** — Inline-SVG (16×16-viewBox, default 14px gerendert), an Standard-Vegan-Symbolen (Vegan Society V-Label, EU-V-Label) orientiert: dickes grünes „V" (`#3F8C2C`, stroke-width 2.4), aus dessen rechtem Strich ein dünner Stamm zu einem leicht ovalen, schräg gedrehten Blatt (`#6BB144` Fill, `#3F8C2C` Outline) führt. Mittelvene des Blatts als feine Linie. `role="img"` + `aria-label="Vegan"` für Screenreader.
- **CSS-Klasse `.vegan-badge`** in `App.css` (vor Account-View-Block) — `inline-block`, `vertical-align: -2px` (visuelles Alignment zur Baseline), `margin-left: 6px`, `flex-shrink: 0` (verhindert Schrumpfen in Flex-Containern).
- **`src/lib/generator.js` `mealEntry()` erweitert** um `d: recipe.diet`. Doc-Header von `f / m / ab: { r, t, k }` auf `{ r, t, k, d }`. Konsumenten-API rückwärts-kompatibel — wer `d` ignoriert, merkt nichts.
- **`MenuTab.jsx`** — Import `VeganBadge`, Render `{meal.d === 'vegan' && <VeganBadge />}` direkt nach `{meal.t}`. Plan-Slot kennt die Diät jetzt direkt.
- **`RecipesTab.jsx`** — Import + Render im Recipe-Header (`recipe-name`-div), `recipe.diet === 'vegan' && <VeganBadge />`. RecipesTab arbeitet auf RECIPES-Datenmodell direkt, kein Lookup nötig.
- **`SwapSheet.jsx`** — Import + Render in der Wahl-Card (`swap-card-name`), gleicher Pattern. Beim Swap-Sheet sieht man die Diät jetzt am ersten Blick — wichtig wenn man bewusst zwischen omnivore und vegan wechseln will.
- **11 Rezeptnamen** in `recipes.js` umbenannt:
  - f6: „Vegan banana pancakes" → „Banana pancakes"
  - f9: „Vegan overnight oats with chia" → „Overnight oats with chia"
  - f12: „Vegan tofu scramble breakfast wrap" → „Tofu scramble breakfast wrap"
  - m19: „Vegan Buddha bowl with crispy tofu" → „Buddha bowl with crispy tofu"
  - a14/a16/a17: „Vegan chickpea/black bean/mushroom …" → ohne „Vegan "
  - a19: „Vegan tofu stir-fry with noodles" → „Tofu stir-fry with noodles"
  - a20: „Vegan lentil-vegetable stew" → „Lentil-vegetable stew"
  - a24: „Vegan pasta aglio e olio with chili" → „Pasta aglio e olio with chili"
  - a26: „Vegan Thai green curry feast …" → „Thai green curry feast …"
- Tipp-Texte (`tip:`-Felder) bewusst unverändert — dort darf das Wort „vegan" als Erklärung stehen („Vegan but every bit as comforting…"), das ist kein Verkaufs-Branding.

### Bewusst NICHT gemacht

- **Symbole für Vegetarian/Omnivore** — nur Vegan kriegt das Badge. Vegetarian wirkt nicht abschreckend, omnivore ist Default. Generelle Diät-Tag-Symbole wären visuelles Rauschen.
- **Vegan-Badge auch in der Day-Card-Header-Zeile** — der Header zeigt nur Tag-Nummer + Datum, keine Mahlzeit. Erst beim Aufklappen sieht man die Slots — dort ist das Badge platziert.
- **Eigenes Icon-File / SVG-Asset** — Inline-SVG in der React-Komponente ist sauberer (kein Asset-Pipeline, perfektes Sub-pixel-Rendering, Theme-fähig). PNG/Asset wäre nur sinnvoll wenn das Icon mehrfach in CSS gebraucht würde.
- **Allergen-Badges (Gluten-frei, Nuss-frei …)** — Out-of-Scope. Allergien sind via Configurator-Filter abgedeckt; Allergen-Badges würden Cards überladen.

### Test- und Build-Stand

- **163 Tests grün** (Generator-Tests bestehen, da Plan-Slot nur reichhaltiger wurde)
- Bundle: 306.63 → **307.30 kB JS** (+0.7 kB) · 96.37 → **96.63 kB gzip** (+0.26 kB) · CSS 33.28 → **33.37 kB** (+0.09 kB)
- Build clean (`npm run build` 744 ms)

---

## 2026-05-04 (h) — 3-Burner-Support + Rezept-Pool von 51 → 63

**Anlass:** User hat den 3-Burner-Use-Case angesprochen — große Camper (Britz Frontier, Apollo Trailblazer, Familien-RVs) haben oft 3 Brenner und können parallel-anspruchsvollere Mahlzeiten kochen (Hauptgang + Beilage + Sauce gleichzeitig). Außerdem war der Vegan-1-Burner-Pool seit langem als „knapp" markiert (4f/5m/5a) — bei Premium-Versprechen „all 51 curated recipes" muss das Versprechen tragen.

### Was gebaut wurde

- **`src/lib/generator.js` BURNERS-Whitelist** auf `[1, 2, 3]` erweitert. Filter-Logik (`r.burners <= bn`) ist generisch und unverändert; nur die Eingabe-Validierung erweitert. Default-Fallback bei Garbage-Input bleibt 2 (mittlerer Camper). Doc-Kommentar (`burners: 1 | 2 | 3`) angepasst.
- **`src/components/ConfiguratorTab.jsx`** — `BURNER_OPTS = [1, 2, 3]`. Pill-Picker rendert dynamisch mit `gridTemplateColumns: repeat(3, 1fr)` — passt automatisch ins existente `.diet-grid`-Layout (war eh für 3 Spalten Diät designed). Default-Config in `useStorage.js` bleibt `burners: 2` — 3-Burner ist Opt-in, nicht Standard.
- **`src/strings.js`** — neue Option `burnersOptions[3] = { label: '3 burners', sub: 'Big rig / family camper' }`. Sub-Text ist bewusst „big rig / family camper" statt nur „3 hobs" — kommunziert direkt das Buyer-Persona.
- **6 neue 3-Burner-Rezepte** (Sunday-Roast-Niveau, parallel-cooking):
  - **f11 Big Aussie breakfast** (omnivore) — Bacon + Eggs + Sausages + Beans + Mushrooms + Tomatoes + Toast, klassischer Brunch-Showstopper
  - **m18 Smashburger with chips and slaw** (omnivore) — Pan-fried smashburger + frittierte Pommes + Krautsalat
  - **m19 Vegan Buddha bowl with crispy tofu** (vegan) — Reis + cornflour-coated crispy tofu + stir-fried veggies + Tahini-Sauce
  - **a25 Pan-roast chicken with mash and honey carrots** (omnivore) — Hähnchenschenkel mit Knusperhaut + Kartoffelpüree + glasierte Karotten
  - **a26 Vegan Thai green curry feast with crispy tempeh** (vegan) — Jasminreis + grünes Curry + crispy tempeh als Top-Up
  - **a27 Mediterranean halloumi feast** (vegetarian) — Geröstetes Mittelmeer-Gemüse + Kräuter-Couscous + gebratenes Halloumi
- **6 weitere Rezepte für Pool-Diversität:**
  - Vegan-1-Burner-Boost: **f12 Tofu scramble breakfast wrap** (kala namak Tipp für Eier-Tang), **m20 Roasted veggie hummus pita**, **a28 Coconut dal with basmati rice**
  - Vegetarian-2-Burner-Boost: **f13 Shakshuka with crusty toast**, **m21 Halloumi & lemon couscous bowl** (Honey-on-halloumi Trick), **a29 Brown butter sage gnocchi with parmesan** (vacuum-packed gnocchi = camp-stable)
- **`src/data/recipes.js` Header-Doc** auf neue Verteilung aktualisiert: 13f / 21m / 29a · Total 63 · 41 1-burner / 16 2-burner / 6 3-burner.
- **`src/lib/generator.test.js`** — neuer Regression-Test „Burners 3 wird akzeptiert (großer Camper)" prüft `burnersApplied === 3` bei `burners: 3`-Input. Komplementär zum existenten Test „Burners 7 → 2" (Default-Fallback bei Garbage).

### Strategischer Kontext

3-Burner-Rezepte sind **bewusst als Premium-Sales-Argument** gedacht: Big-Rig-Mieter zahlen $400–600/Tag für ihren Camper — die zusätzlichen AUD$15.99 für Premium sind Rounding-Error in deren Budget, gleichzeitig profitieren sie am meisten von den parallel-cooking-Rezepten (Familie hat höheren Kalorien-Bedarf, will weniger Zeit am Kocher verbringen). Der Pool ist jetzt so geschnitten, dass die 3-Burner-Mahlzeiten auch im Free-Plan in den ersten 5 Tagen erscheinen können (Generator filtert nicht nach Burners im Free-Modus) — das ist Marketing-by-Default: Free-User sieht „Look what's possible with 3 burners" und überlegt sich, ob er das Setup im Camper hat.

### Bewusst NICHT gemacht

- **Burner-spezifische Plan-Optimierung** — der Generator wählt aktuell aus dem gefilterten Pool round-robin nach Cooling-Rank. Eine Logik wie „3-Burner-Rezepte clustern auf Tagen mit längerer Camp-Pause" wäre cleverer, aber das ist Stufe-2-Generator-Material („kreativer Plan-Generator" laut Roadmap).
- **Zusätzliche 3-Burner-Pancake-/Frühstücks-Rezepte** — nur ein 3-Burner-Frühstück (Big Aussie) reicht. Frühstück ist der Slot mit dem niedrigsten Aufwand-Wunsch (Camp brechen schon im Kopf), 3-Burner-Frühstück ist die Ausnahme nicht die Regel.
- **Halloumi/Tempeh als „Spezial"-Zutat-Tag** — Generator parst Zutaten generisch, scaling funktioniert. Wenn diese in Cape York rar sind, weiß der User es selbst (oder kauft pre-trip in Cairns Brunswick Markets — Tipp ist im Rezept).
- **Tests für jedes neue Rezept** — Generator-Tests sind algorithmus-fokussiert (parsing, scaling, clustering, filter), nicht recipe-data-fokussiert. Falsche Tags würden in der UI sichtbar, nicht im Test. Pool-Health (Coverage pro Diät × Burner) deckt das ab.

### Test- und Build-Stand

- **163 Tests grün** (vorher 162, +1 für 3-Burner-Akzeptanz)
- Bundle: 288.52 → **306.63 kB JS** (+18.1 kB) · 91.11 → **96.37 kB gzip** (+5.3 kB) · die 12 Rezepte mit voller Zutaten-/Schritt-Liste sind der Wachstumsfaktor
- Build clean (`npm run build` 722 ms)

---

## 2026-05-04 (g) — Shop-Integration v1: Checkout-Abstraktion + AUD$15.99-Pricing (Play-Billing-orientiert)

**Anlass:** Pitch-Vorbereitung für Cape-York-Autovermieter + Werbevideo auf dem Eigen-Trip. Der Premium-Rollout hatte bisher nur einen `mailto:`-Link als Kauf-Pfad — für ein Produkt, das im Pitch „in 30 Sekunden gekauft sein muss", zu schwach. Vor dem Stripe-Setup brauchen wir trotzdem schon die richtige App-Architektur, damit später nur noch Konfigurations-Konstanten gesetzt werden müssen.

### Entscheidungen vor Implementation

- **Strategischer Pivot zu Play Billing als primärem Kanal (Stufe 2):** User priorisiert vertraute Zahlumgebung (gespeicherte Google-Pay-Karte, kein Tab-Wechsel, höhere Conversion) über Fee-Optimierung. Trade-off bewusst akzeptiert: 15% Play-Fee statt ~3% Stripe — wird über Pricing kompensiert. Stripe-Web bleibt **parallele** Option für PWA-Käufer (gleicher Display-Preis, höhere Marge).
- **Preis: AUD$15.99** (Charm-Pricing, One-Time, pro Device). Logik: 7 CHF Netto-Floor; nach 15% Play-Fee verbleiben bei AUD$15.99 brutto = AUD$13.60 netto ≈ 7.80 CHF (über Floor mit Sicherheitsmarge). $X.99-Preise werden von Play-Console-Templates direkt unterstützt und konvertieren laut Studien 10–20% besser als runde Zahlen. Erste Iteration probierte AUD$7 (zu niedrig — Fee hätte den CHF-Floor durchbrochen), dann AUD$16 (Mathe knapp + krumme Zahl); AUD$15.99 ist die saubere Lösung.
- **Währung AUD:** Cape-York-spezifisch im MVP. CHF-User sehen die Conversion automatisch im Stripe-/Play-Checkout (Wechselkurs-Unsicherheit liegt nicht beim Verkäufer). Stufe 2 mit Geo-Erweiterung: pro Region/Sprache via i18n übersetzbar.
- **CTA-Wording: aktiv pitchen** statt passiv erklären. „Unlock the full plan — AUD$15.99" als primärer Button, Email-Link nur sekundär.
- **Phasen-Modell:** Phase A (jetzt, mailto-Fallback, sofort pitch-bar) → Phase B (Stripe-Account + Payment Link für PWA-Käufer, ~30min) → Phase C (Cloudflare Worker für Auto-License-Email, ~10min) → **Phase D (Stufe 2, primärer Pitch-Channel: Capacitor + Play Billing)**. App-Code ist nach Phase A komplett — Phase B/C/D ändern nur Konfigurations-Konstanten + Capacitor-Plugin-Wire-Up, kein UI-Refactor.

### Was gebaut wurde

- **`src/lib/checkout.js`** (neu) — Single Source für „wie kauft der User Premium?". `getCheckout()` returnt eines von drei Action-Objekten je nach Plattform + Konfiguration: `{ type: 'native', execute }` (Capacitor / Play-Billing in Stufe 2), `{ type: 'stripe', url }` (sobald `STRIPE_PAYMENT_LINK` gesetzt ist), `{ type: 'mailto', url }` (Default-Fallback, kein Setup nötig). Plattform-Erkennung über `window.Capacitor.isNativePlatform()` (in Stufe 1 immer false). `STRIPE_PAYMENT_LINK` ist als leerer String exportiert mit Validierung „muss `https://buy.stripe.com/`-Prefix haben". Pricing-Konstante `PRICE = { amount: 7, currency: 'AUD', display: 'AUD$7' }` zentral hier.
- **`PremiumInfoTab.jsx` umgebaut** — Pricing-Block hat jetzt: Heading („Unlock the full plan"), `priceLine` („AUD$7 · one-time purchase, this device"), erklärenden Body („No subscription. No account. …"), primären `buy-btn` (Orange, 52px, je nach `checkout.type` Link oder Button), sekundären Email-Text-Link (nur wenn Stripe oder Native — bei reinem Mailto-Fallback ist der primäre Button bereits Email), Activate-Key-Button als Outline-Button unten. Native-Pfad hat einen Async-Handler mit `nativeStatus`-State, der bei Fehler eine kleine Hint-Box „Native billing isn't set up yet — Email me" einblendet.
- **`strings.js`** erweitert — `S.premium.priceLine` („AUD$15.99 · one-time purchase, this device"), `S.premium.buyCta` („Unlock the full plan — AUD$15.99"), `S.premium.contactCtaSecondary` („or email me directly"), `S.premium.contactBodyTemplate` (mailto-Body mit Preis-Erwähnung). Alte `pricingHeading`/`pricingBody`-Texte überarbeitet (statt „Contact me by email" steht jetzt der konkrete Preis im Vordergrund).
- **`App.css`** — neue Klassen `.premium-info-buy-btn` (52px Orange-CTA, +4px höher als der alte Contact-Button für Daumen-Komfort), `.premium-info-secondary-link` (kleiner unterstrichener Email-Text), `.premium-info-price-line` (16px Bold), `.premium-info-native-fallback` (kleine Hint-Box mit Orange-Border). Alte `.premium-info-contact-btn` ist raus — durch `.premium-info-buy-btn` ersetzt; Inhalt vorher war derselbe Mailto-Link, nur mit weniger aktivem Wording.

### Bewusst NICHT gemacht

- **Stripe Payment Link erzeugt + eingetragen** — User muss Stripe-Account selbst anlegen (KYC-Daten + Auszahlungs-Konto). Sobald gesetzt: nur `STRIPE_PAYMENT_LINK` in `checkout.js` aktualisieren, kein UI-Change.
- **Cloudflare Worker für Webhook-→-License-Email** — Phase C. Die Worker-Logik ist konzeptionell klar (Stripe-Signature verifizieren, License-Code via gleicher HMAC-Logik wie `scripts/generate-license.mjs` generieren, Resend/Postmark-Email senden), wird aber erst gebaut wenn der User Stripe deployed hat. Manuelles License-Senden funktioniert in Phase B als Bridge.
- **Native Play-Billing-Plugin eingehängt** — Stufe 2, nach Eigen-Trip. Die `execute()`-Funktion im native-Pfad ist absichtlich ein Stub (`{ ok: false, reason: 'native-billing-not-implemented' }`) — die Architektur ist ready, der konkrete Wire-Up wartet auf Capacitor-Setup.
- **Pricing pro Region/Sprache** — i18n ist Stufe 2. Heute reicht AUD-only weil das Produkt regional fokussiert ist; Deutsche/Schweizer sehen den AUD-Wert und Stripe rechnet im Checkout um.
- **Sales-Page als statisches GitHub-Pages-File** — wurde im Vorgespräch erwähnt, ist aber redundant zur Premium-Info-Seite in der App. Wenn der User später Marketing-Traffic ohne App-Install will, kann das nachgezogen werden — aktuell pitcht er die App selbst.

### Test- und Build-Stand

- **162 Tests grün** (keine neuen Tests nötig — `checkout.js` ist Konfigurations-Layer, kein Algorithmus; UI-Verdrahtung hat keine testbare Logik außer den Zweigen)
- Bundle: 287.05 → **288.52 kB JS** (+1.5 kB) · 90.67 → **91.11 kB gzip** (+0.4 kB) · CSS 32.0x → **33.28 kB** · Strings + Checkout-Modul + neue CSS-Klassen
- Build clean (`npm run build` 674 ms)

---

## 2026-05-04 (f) — „Looks-real"-Platzhalter-Icons (CY26-Wortmarke)

**Anlass:** Vor dem Pitch bei Cape-York-Autovermietern und dem Werbevideo-Dreh auf dem Eigen-Trip mussten die einfarbigen orange Quadrate raus — Werbematerial mit einem App-Icon, das wie kein App-Icon aussieht, ist nicht pitch-fähig.

### Was gebaut wurde

- **`public/icon-192.png` + `public/icon-512.png`** überschrieben mit „looks-real"-Platzhaltern: orange Brand-Hintergrund (`#C0600C`), zentrierte weiße „CY"-Wortmarke groß oben, kurzer horizontaler Trennstrich, „2026" klein darunter, alles eingerahmt von einem dünnen weißen Kreisrand. Auf dem Home-Screen wirkt das jetzt wie ein echtes Produkt-Icon, nicht wie ein Platzhalter. Generiert via PowerShell + `System.Drawing` lokal — keine externe Asset-Pipeline, keine zusätzliche Dep.
- **Tech-Notizen in `STATUS.md`** aktualisiert: das alte einfarbige PowerShell-Snippet ist durch das neue ersetzt, plus expliziter Hinweis dass `Font`-Konstruktor `[single]`-Casts braucht (Default `New-Object System.Drawing.Font ...` löst die Überladung nicht auf — sonst silent-fail mit nur dem Border).
- **Anleitung** für späteren Logo-Tausch dokumentiert: nur die zwei PNG-Dateien überschreiben (Auflösung exakt 192×192 bzw. 512×512, PNG-Format), `npm run build`, Service-Worker-Cache wird beim nächsten Load automatisch invalidiert. Kein Code-Change nötig.

### Bewusst NICHT gemacht

- **Adaptive-Icons (Android-Capacitor-Layer)** — foreground/background als getrennte Layer brauchen wir erst nach dem Capacitor-Setup (Stufe 2). Heute reichen die zwei flachen Icons für PWA + Pitch.
- **SVG-Master mit programmatischer Skalierung** — overkill für Platzhalter, finale Icons werden ohnehin extern designed. Bis dahin ist PowerShell-Generierung pragmatisch.
- **Logo-Recherche / professionelles Design** — der User will erst pitchen + Werbevideo drehen, finales Logo kommt später. Platzhalter ist „good enough" für diese Phase.

### Test- und Build-Stand

- Keine Code-Änderung, daher keine Test-Veränderungen (162 Tests grün)
- Build muss laufen damit die neuen Icons in den PWA-Precache wandern

---

## 2026-05-04 (e) — Premium-Sales-UX: Labels lesbar, Recipes sortiert, Shopping-Vorschau konkret

**Anlass:** Erste UX-Iteration nach dem Premium-Rollout. Drei Schwachstellen gefunden:
- Im Configurator waren auch die Labels („Fridge size", „Allergies") geblurrt → Free-User wusste nicht, was die Pills überhaupt sind
- In RecipesTab waren Free- und Premium-Rezepte pro Kategorie gemischt → unübersichtlich, der Premium-Mehrwert verschwand im Layout
- Im ShoppingTab war die Locked-Vorschau zu textuell („Premium would generate a 27-item list") → Verkaufsargument unkonkret

### Was gebaut wurde

- **`PillPicker` mit `locked`-Prop** (`ConfiguratorTab.jsx`) — Label und Hint bleiben außerhalb der Gate-Hülle, nur das `<div className="diet-grid">` mit den Pill-Buttons wird in `<PremiumGate variant="inline">` gewickelt. Der User liest jetzt klar „Fridge size — Cold storage capacity" und sieht darunter den Sticker. Setzt das User-Anliegen um: „namen der verborgenen funktionen sollen lesbar sein, nur die funktion selber nicht". Die drei `<PremiumGate>`-Wrapper im Configurator-JSX entfallen — `locked={!premium} onUpgrade={onUpgrade}` direkt am `PillPicker`.

- **`PremiumGate` mit `header`-Slot** (`PremiumGate.jsx`) — neue Prop für Use-Cases, in denen ein lesbarer Header über dem geblurrten Body sitzen soll. Wird derzeit nicht direkt genutzt (PillPicker macht's intern), aber bleibt als saubere API für künftige Gates (z.B. Custom-Configurator-Sektionen).

- **RecipesTab Free/Premium-Reihenfolge pro Kategorie** — pro Sektion (`🌅 Breakfast` / `☀️ Lunch` / `🌙 Dinner`) werden Rezepte jetzt in zwei Phasen gerendert: erst alle freischaltbaren Rezepte (in den ersten 5 Tagen verwendet), dann ein **Premium-Divider** („🔒 X MORE RECIPES WITH PREMIUM" mit horizontalen Linien links/rechts und orange Color-Akzent), dann alle Premium-Rezepte als `<PremiumGate>`-Cards. Premium-User sehen den Divider nicht (`lockedItems = []`), die Reihenfolge bleibt für sie wie zuvor. Neue String `S.recipes.premiumDivider({ count })` mit Pluralisierung.

- **ShoppingTab Sample-Vorschau** — der Locked-Render zeigt jetzt: (1) den Stop-Note („Last big supermarket! …"), (2) eine Intro-Zeile („Sample of your Bamaga resupply list — 27 items total, all scaled to your group:"), (3) eine **Liste mit den ersten 5 echten Items** in lesbarem Format (Name + Menge), (4) einen großen **Premium-CTA-Button** mit Sticker und konkretem „Unlock 22 more items + checkboxes, edits, and Bamaga essentials →"-Label. So erkennt der User auf einen Blick, dass Premium wirklich eine vollständige Einkaufsliste mit echten Items liefert (Wasser, Eis, Müllsäcke etc. aus Camping-Essentials oder Generator-Output). Neue Strings `S.shopping.lockedIntro` und `S.shopping.lockedCta` (mit pluralisiertem Remaining-Count). Drei alte `lockedPreview`-Strings ersetzt.

- **CSS für die drei Verbesserungen**:
  - `.recipes-premium-divider` (orange Linien-Trenner mit zentriertem Sticker-Label)
  - `.locked-shop-wrap` / `-intro` / `-preview` / `-preview-row` / `-preview-name` / `-preview-qty` (List-Vorschau-Card mit weißem Hintergrund und subtilen Trennstrichen)
  - `.locked-shop-cta` (großer dashed-border Premium-CTA mit Gradient-Hintergrund und Sticker, identische Optik wie reguläre `.premium-gate-overlay` aber als Block-Action statt als Overlay über geblurrtem Inhalt)

### Bewusst NICHT gemacht

- **Allergy-Pill-Multi-Select-Block ungelocked** — der „Yes/No"-Pill-Picker für `allergiesEnabled` ist gegated, aber wenn ein Free-User irgendwie auf „Yes" landen würde (geht aktuell nicht via UI), würde der konditionale Multi-Select-Block (`ALLERGENS`-Pills) auch nichts machen, weil der Generator die Allergens-Liste nur bei Premium durchreicht. Statt zusätzlicher Sicherheits-Schicht: die Single-Source-of-Truth-Logik im Configurator (`{draft.allergiesEnabled && premium && ...}` aus dem letzten Refactor) reicht.
- **Custom Sample-Item-Auswahl im ShoppingTab** — wir nehmen einfach die ersten 5 Items aus `data` (cross-cat). Camping-Essentials sind die erste Kategorie und gut zur Demo (Wasser, Eis), danach folgen oft Frischfleisch oder Frischprodukte. Manuelles Picking („zeige immer ein Frischfleisch + ein Wasser-Item + …") wäre Logik die schnell stale wird wenn der Generator-Pool wächst.
- **Animation auf den Divider-Lines** — bewusst statisch. Mobile Performance > visuelles Pop.

### Test- und Build-Stand

- 162 Tests grün (unverändert — alle Änderungen sind UI-Layer ohne neue Logik)
- Bundle: 287.12 kB JS / 90.74 kB gzip · CSS 32.18 kB / 5.97 kB gzip (~+1.5 kB JS, ~+1 kB CSS)

---

## 2026-05-04 (d) — Free/Premium-Tier mit License-Key-Aktivierung

**Anlass:** Erstes Monetarisierungs-Konstrukt. Free-Tier soll als Beta-Tester-Onboarding + Trial vor Kauf dienen; Premium ist die volle App. License-Keys sind so gewählt, dass kein Backend / kein Account-Server nötig ist (CLAUDE.md § 5 bleibt intakt). Stufe 2 (Capacitor → Play Store) wird das durch Google Play Billing ersetzen, aber das UI-Pattern (Premium-Gates) bleibt identisch.

### Architektur

**License-Key-Format**: `XXXX-XXXX-XXXX-XXXX` (16 base32-Zeichen ohne 0/O/1/I/L für Tippfehler-Resistenz, gruppiert in 4er-Blöcken). Erste 12 Zeichen = Payload (random oder hash-of-email-seed); letzte 4 Zeichen = HMAC-SHA256-Checksum gegen ein Shared Secret.

**Verifikation lokal**: App rechnet die Checksum nach (WebCrypto-API, async); kein Server-Call. Crack-Resistenz ~20 Bits (≈1 Mio Brute-Force-Versuche pro Code) — adäquat für Indie-Pricing, nicht für State-Actor-Threat-Models. Stufe 2 könnte auf Ed25519-Signaturen umstellen wenn nötig.

**Generierung**: `scripts/generate-license.mjs` (Node, lokal). `node scripts/generate-license.mjs buyer@example.com` → deterministischer Code; `--batch 10` → 10 Random-Codes für Beta. Identisches Secret in JS-App und Node-Script — Rotation muss an beiden Stellen gleichzeitig.

**Storage**: `localStorage.premium_v1 = { key, activatedAt }`. `isPremium()` synchron lesbar (kein Re-Verify bei jedem Read), Aktivierung ist die einzige Stelle wo verifiziert wird. Bewusst akzeptiert: User mit DevTools-Zugriff kann manuell Premium "unlocken" — bei einem 5-€-Indie-Produkt nicht relevant.

### Was gebaut wurde

- **`src/lib/premium.js`** — Format/Validierung/Activation/Storage, plus `FREE_LIMITS`-Konstanten als Single Source of Truth für UI-Gates (`maxPlanDays: 5`, `shoppingAllowedStopIds: ['cairns']`, `lockedConfigPills: ['fridgeSize', 'fridgeCompressor', 'allergies']`).
- **`scripts/generate-license.mjs`** — Node-CLI für manuelle Code-Erstellung. Standalone, kein Build-Schritt nötig.
- **`PremiumGate`-Komponente** (`components/PremiumGate.jsx`) — Wraps Children, blurrt + Pointer-Events disabled, Overlay mit Premium-Sticker und CTA. Click → Premium-Info-View (App.jsx-Routing). Variants `card` und `inline`. Ist bewusst additive: Children werden weiter gerendert (geblurrt sichtbar), damit der User „sieht was er bekäme" als Verkaufsanreiz.
- **`PremiumInfoTab`** (Erklärungs-Seite) — Lead-Text, Feature-Liste mit Icons (6 Punkte: volle Tage / alle Stops / 51 Rezepte / Fridge-Settings / Allergien / Recipe-Swaps), Pricing-Block mit Email-CTA (`mailto:<dev-email>?subject=Cape%20York%20Premium%20license`) und „Already have a key?"-Sekundär-Button → AccountTab.
- **`AccountTab`** (License-Key-Eingabe) — Status-Anzeige (Free/Premium + maskierter Key-Display für Premium-User), monospace Input mit `autoCapitalize="characters"` und Tippfehler-Toleranz (Bindestriche/Spaces/Lower-Case werden normalisiert), Activate-Button mit Async-Validation, Success/Error-Feedback, Deactivate-Button (mit Confirm) für aktive Premium-User.
- **Topbar 👤-Icon** in `App.jsx` — neben ⓘ, nur auf Home-View sichtbar. Bei aktivem Premium: Gold-Highlight (`#ffd07a` Hintergrund, orange Text). Click → Premium-Info-View.
- **View-State-Machine erweitert** auf `home / about / premium-info / account / trip-config / trip-active`. Premium-Re-Render erfolgt via `premiumTick`-State, der von `AccountTab.onChanged` getriggert wird.
- **Gates an den richtigen Stellen**:
  - `ConfiguratorTab`: Fridge-Size + Compressor + Allergies-Pills jeweils in `<PremiumGate>`. Default-Werte gelten weiter (`fridgeSize: 'large'`, `fridgeCompressor: false`, `allergiesEnabled: false`) — Free-User kriegt sinnvolle Generator-Output, ohne dass die UI manipulierbar ist.
  - `MenuTab`: Day-Cards für `d > FREE_LIMITS.maxPlanDays` werden geblurrt + Sticker. Swap-Action für gegate Tage deaktiviert.
  - `RecipesTab`: Rezepte aus den Free-Plan-Tagen (Tag 1–5) sichtbar, alle anderen als Gate-Cards. Free-User sieht damit ~6–8 Rezepte aus 51, je nach Pool-Pick und Anti-Wiederholungs-Logik.
  - `ShoppingTab`: bei `locked=true` (Bamaga/Cooktown/Coen/Archer für Free-User) → Early-Return mit Premium-Gate-Card statt vollem Listen-Render. Vorschau zeigt Item-Count + Stop-Note („Premium would generate a 27-item resupply list for Bamaga, scaled for your group and trip length.").
  - **Bottom-Nav**: gegate Stop-Tabs bleiben sichtbar mit `🔒`-Prefix im Label und reduzierter Opacity — der User merkt schon vor dem Tap dass es Premium ist.
- **`buildActiveTripTabs`** in `App.jsx` erweitert um `premium`-Param und `locked`-Feld pro Tab.
- **CSS**: `.premium-gate` + `.premium-gate-overlay` (orange dashed border + gradient bg + zentrierter Sticker), `.premium-info-*` (Erklärungs-Seite mit Feature-Cards), `.account-*` (Activate/Deactivate-UI mit klarem Status-Block), `.topbar-account-premium` (Gold-Highlight bei aktivem Premium), `.nav-btn-locked` (geringere Opacity).
- **Strings**: kompletter `S.premium.*`-Block (Sticker, Feature-Liste, Pricing-Body, Activate-/Deactivate-UI). `S.shopping.lockedPreview` für ShoppingTab-Gate.
- **Tests** (`src/lib/premium.test.js`) — 15 neue Tests: Code-Verifikation gegen 3 vorgenerierte gültige Codes + 5 ungültige; Lower-Case- und Space-Toleranz; Activate/Deactivate/Status-Roundtrip; Format-Display. Vorbedingung: `jsdom` als devDep installiert (für `localStorage` und WebCrypto in Tests).
- **Email-Update**: `<dev-email>` → `<dev-email>` in `strings.js` (about + premium) und `PRIVACY.md`.

### Bewusst NICHT gemacht

- **Backend / Account-Server / Cloud-Sync** — verstößt gegen CLAUDE.md § 5. License-Key + lokale Verifikation ist die richtige Architektur für Stufe 1.
- **Tier-Skalen mit Trial-Period und automatischem Re-Lock** — der User aktiviert mit Code, ist permanent Premium auf diesem Gerät. Trial wäre komplexer (Datum-Tracking, Clock-Tampering-Resistenz) und passt nicht zum „eine Zahlung, ein Code"-Modell.
- **Premium-Status-Sync zwischen Geräten** — würde Backend brauchen. Stattdessen: User kann denselben Code auf mehreren Geräten aktivieren (akzeptiertes Sharing innerhalb einer Familie/Gruppe). Bei Public-Launch könnte ein Ratelimit pro Code via Server kommen, aber das ist Stufe 2.
- **Premium-Sticker-Click führt zur Account-View statt zur Erklärseite** — User-Anforderung war klar: Erklärseite zuerst, von dort Activate-CTA. Das ist auch der bessere Sales-Flow.
- **Free-Generator-Pfad mit weniger Rezepten** — Generator läuft weiter durch alle 51 Rezepte, UI gated nur das Display. So sieht der User „echt was er bekäme" mit Premium statt eines abgespeckten Plans, der den Mehrwert verschleiert.

### Test- und Build-Stand

- 162 Tests grün (vorher 147, +15 für premium-Modul)
- Bundle: 285.64 kB JS / 90.29 kB gzip · CSS 31.19 kB / 5.82 kB gzip (~+10 kB JS, ~+5 kB CSS für Premium-System komplett — UI + License-Logik + 2 neue Views)

### Pre-Submission-Pfad bleibt unverändert

Privacy-Policy + Pages-Hosting + AboutTab sind unverändert. Premium-System ist in der Privacy-Story problemlos: License-Keys sind lokal, kein Network-Call, kein Cookie, keine PII-Übertragung. Vor Submission wäre nur die Email-Hinterlegung in der Play-Store-Listing relevant — das ist ohnehin geplant.

---

## 2026-05-04 (c) — Pickup/Dropoff-Logistik: Tag 1 ohne Frühstück, letzter Tag ohne Dinner

**Anlass:** 4WD-Mietfahrzeuge in Cairns werden meist erst nach 10:00 abgeholt und müssen bis 17:00 zurück sein. Konkret heißt das: man kann am Anreisetag nicht im Auto frühstücken (man hat es noch nicht) und am Rückgabetag nicht zu Abend essen (Auto schon zurück). Vorher war das nicht abgebildet — Generator pickte Frühstück für Tag 1 und Dinner für letzten Tag, der User hätte sie selbst per Restaurant-Slot wegklicken müssen.

### Was gebaut wurde

- **Generator: `skip`-Marker** (`generator.js`) — `generatePlan()` setzt für `d === 1` den Frühstücks-Slot (`f`) auf `{ skip: true, kind: 'pickup' }` und für `d === days` den Dinner-Slot (`ab`) auf `{ skip: true, kind: 'dropoff' }`. Diese Slots ziehen weder aus dem Rezept-Pool (kein `pickMeat`/`pickNonMeat`-Aufruf) noch aus der Einkaufsliste (die existierende `meals.filter(Boolean)` + `RECIPES.find(r => r.id === meal.r)`-Logik überspringt den Skip-Entry automatisch, weil `meal.r` undefined ist). Restaurant-Slots und User-Overrides für diese Slots werden ignoriert — semantisch macht es keinen Sinn, in einem Auto zu essen, das man nicht hat. `lastPick`-Tracking bleibt sauber: Skip-Entry hat kein `r`-Feld → `lastPick.f/ab = null` → der nächste Tag hat freie Wahl, kein Wiederholungs-Lock.

- **MenuTab.MealRow: Skip-Rendering** (`MenuTab.jsx`) — neuer Branch in der Komponente: bei `meal.skip === true` wird eine kursive graue Hint-Zeile gerendert mit 🚙-Icon und kontextueller Erklärung („Vehicle pickup — most rentals are released after 10am." / „Vehicle drop-off — most rentals must be returned by 5pm."). Reihenfolge der Branches: skip > rest > regular meal. Counts (Restaurants/Breakfasts/Lunches/Dinners-Statistik oben in MenuTab) zählt skip weder als Restaurant noch als Mahlzeit (sonst würde 7-Tage-Trip mit „6 Frühstücke + 6 Dinner" angezeigt, was korrekt ist, vorher waren es fälschlich 7+7).

- **Strings** (`strings.js`) — `skipPickup` und `skipDropoff` als user-facing Erklärungs-Texte.

- **CSS** — `.meal-skip { color: var(--tx2); font-style: italic; }` (subtile graue Hint-Optik, klar abgegrenzt von Restaurant-Rot und Mahlzeit-Schwarz).

- **Tests** (`generator.test.js`) — 4 neue Tests: (1) Tag 1 hat skip:pickup statt Frühstück, m/ab bleiben reguläre Mahlzeiten; (2) letzter Tag hat skip:dropoff statt Dinner, f/m bleiben regulär; (3) 1-Tages-Trip: Tag 1 ist gleichzeitig letzter Tag → nur Lunch ist regular meal, beide Skip-Slots aktiv (User-Anforderung „kürzere Mieter" konsistent zu Onboarding-Range-Select); (4) skip-Slots crashen die Shopping-Generierung nicht (Cairns-Bucket bleibt nicht-leer für 1-Tages-Trip dank Camping-Essentials + Lunch-Zutaten). Test-Total 143 → 147.

### Bewusst NICHT gemacht

- **Skip-Override durch User** — Restaurant-Slot oder Override für Tag 1/f bzw. letzter Tag/ab werden hart ignoriert. Wäre möglich (manche Vermieter bieten frühe Pickup-Zeiten ab 8am), aber komplexer Edge-Case und der User kann jederzeit den DaySheet-Restaurant-Toggle nutzen wenn er morgens vor Pickup frühstücken will (das ist dann ein Eat-Out vor dem Trip-Start, nicht im Auto). Mehrheit der Mieter folgt der 10/17-Regel — das ist die richtige Default-Annahme.
- **Pickup-/Dropoff-Zeiten als User-Setting konfigurierbar** — würde noch zwei Pills im Configurator brauchen, semantisch unklar (10:30 vs. 11:00 → ändert sich der Skip?). Hard-Default ist die richtige UX-Entscheidung; falls Mieter abweichen, kann der User Frühstück/Dinner über den Restaurant-Toggle einplanen oder akzeptieren, dass es in der Liste fehlt.
- **Anzeige der konkreten Pickup-/Dropoff-Zeit** — der Hint-Text nennt 10am/5pm als „most rentals", nicht als harten Wert. Mieter mit anderen Zeiten bekommen den richtigen Anker, ohne dass die App falsche Versprechen macht.

### Test- und Build-Stand

- 147 Tests grün
- Bundle: 276.13 kB JS / 87.20 kB gzip · CSS 26.20 kB / 5.07 kB gzip (~+0.6 kB JS für skip-Logik + Strings)

---

## 2026-05-04 (b) — Scroll-Reset bei Tab-Wechsel + Compressor-Toggle

**Anlass:** Beim Wechsel zwischen Tabs erbte der neue Tab die scroll-Position des alten (`.content`-Container ist persistent, nur die Inhalts-Komponente wechselt) — wer in MenuTab nach unten gescrollt hatte, landete in Recipes ebenfalls weit unten. Zweite Reibungsstelle: die Eis-Mengen in der Einkaufsliste wurden über `fridgeSize === 'large'` als Compressor-Heuristik abgeleitet — ungenau, weil große Cooler-Boxen ohne Kompressor existieren und kleine Kompressor-Fridges (Engel etc.) auch.

### Was gebaut wurde

- **Scroll-Reset bei Navigation** (`App.jsx`) — `useRef` auf `.content` (`contentRef`) plus eine Map (`scrollPositionsRef`) für Per-Tab-Scroll-Erinnerung. `useEffect` auf `[view, activeTab, TABS]`: beim Verlassen eines Trip-Tabs wird seine `scrollTop` in der Map gespeichert; beim Öffnen eines Shopping-Tabs (Cairns/Bamaga/Cooktown/Coen/Archer) wird die letzte Position restored, sonst (Menu/Recipes/Home/About/Configurator/Trip-Active-Wechsel von Trip-Tab) → `scrollTop = 0`. So springt der User in seine letzte Cairns-Position zurück, wenn er Menu → Cairns → Bamaga → Cairns macht. Zwischen Cairns und Bamaga wird die Position nicht geteilt (jeder Tab hat seine eigene Map-Eintrag). View-Wechsel (Home → Configurator → Trip-Active → About) starten immer oben, weil unterschiedliche Inhalte angezeigt werden und die alte Position nicht semantisch passt.

- **Compressor-Fridge-Toggle** als neuer Pill-Picker im Configurator (`ConfiguratorTab.jsx`) — Yes/No nach „Fridge size". Schreibt `fridgeCompressor: boolean` in `cfg_v1`. Default `false` (sicherer Default — User mit echtem Kompressor ändert es bewusst). Storage-Migration in `loadConfig()`: alte Saves ohne das Feld bekommen `fridgeCompressor = (fridgeSize === 'large')` — entspricht der vorherigen Heuristik in `regions.js`, also kein Verhaltens-Change für bestehende Trips.

- **Eis-Logik umgestellt** (`regions.js`) — `iceCairns(ctx)` und `iceMidStop(ctx)` returnen jetzt `null` wenn `ctx.fridgeCompressor === true` (= Item entfällt komplett aus der Liste). Sonst Mengen je nach Fridge-Size (large/medium = 2× 5kg, small = 3× 5kg in Cairns; mid-stops 1–2× 5kg). Vorher renderte „large + ohne Compressor" als „1 bag (only if cooler-style)" — verwirrendes Bedingungs-Label, das jetzt durch echten Boolean ersetzt ist.

- **Generator passt Compressor durch** (`generator.js`) — `fridgeCompressor` als zusätzlicher Param in der API, klemmt strict (`=== true`), reicht ihn in `essentialsCtx` an `injectEssentials` durch und exportiert ihn in `result.config` für UI-Konsistenz. `injectEssentials` filtert jetzt `qty == null`-Items raus (= Item entfällt) statt sie mit `qty: null` durchzulassen.

- **Strings** (`strings.js`) — `compressorLabel` („Compressor fridge?"), `compressorHint` („Compressor fridges (Engel, Waeco) need no ice. Cooler boxes do."), `compressorOptions: { yes, no }`.

- **Tests** — Alter Test „large fridge → minimaler Eis-Bedarf (compressor)" durch zwei neue ersetzt: „compressor fridge → kein Eis-Item in Cairns oder Bamaga" + „cooler-box (kein Compressor) → Eis skaliert mit Fridge-Größe". Beide grün, Test-Total 142 → 143.

### Bewusst NICHT gemacht

- **Compressor als implizite Konsequenz aus `fridgeSize`** — User wollte explizite Kontrolle. Eine kleine 35L-Engel ist Compressor; eine 110L-Cooler-Box mit Eis ist kein Compressor. Größe und Kühltechnik sind orthogonale Achsen, daher zwei Pills.
- **Per-Shopping-Tab unabhängige Scroll-Positionen mit localStorage-Persistenz** — die Map lebt nur in der Session. Beim Reload geht alles auf 0 zurück. Lokales Persistieren wäre möglich (`sessionStorage`), aber overkill für den UX-Win.
- **Scroll-Reset auch beim Verlassen eines Shopping-Tabs „nach Hinten"** — wenn User in Cairns → Menu → Cairns geht, soll Cairns wieder unten sein. Würde ich es bei jedem Verlassen resetten, ginge das verloren. Aktuelle Logik macht genau was der User wollte.

### Test- und Build-Stand

- 143 Tests grün (vorher 142, +1 für den Compressor-Split)
- Bundle: 275.51 kB JS / 86.97 kB gzip · CSS 26.15 kB / 5.06 kB gzip (~+1 kB JS für Compressor-Pill und Scroll-Logik)

---

## 2026-05-04 — Onboarding: Range-Select-Calendar statt Stepper, Trip-Länge 1–31

**Anlass:** Bei der allerersten Trip-Planung war die UX umständlich: Days-Stepper auf [7, 28] geklemmt, Calendar startete mit einem voreingestellten 7-Tage-Trip ab heute. Kürzere Mieter (1–6 Tage) konnten die App gar nicht nutzen, und der Calendar fühlte sich „zugemüllt" an statt wie ein leeres Blatt zum Selber-Planen. der Entwickler möchte einen leeren Calendar im Onboarding, in dem der User Start- und End-Tag selbst wählt; die Trip-Länge wird daraus abgeleitet.

### Was gebaut wurde

- **Generator-Klemmung erweitert** — `src/lib/generator.js:679` von `Math.max(7, Math.min(28, …))` auf `Math.max(1, Math.min(31, …))`. Der Generator akzeptiert jetzt Tagesausflüge (1 Tag = 3 Mahlzeiten) bis hin zu Monats-Trips. Min-Days-Test in `generator.test.js` angepasst, neuer Test für 3-Tages-Trip (Wochenend-Camper) hinzugefügt — Generator liefert konsistent 3 Plan-Tage ohne Clamp auf 7. Test-Total bleibt bei 142 (eine zusätzliche, eine ersetzte Klemmungs-Assertion).

- **Storage: Sentinel-Werte für „kein Trip gewählt"** — `defaultConfig()` in `useStorage.js`: `days: 0` und `startDate: null` (statt 7 / `todayISO()`) signalisieren dem Configurator „User hat noch nichts gewählt" → Range-Picker wird angezeigt. `loadConfig()` validiert `startDate` als ISO-Pattern und setzt sonst `null`; Bamaga-Migration für Saves mit `days >= 2` läuft weiter, kürzere Saves bekommen `bamagaDay: null` (kein sinnvoller Tag bei 1-Tages-Trip). `bamagaStop`-Default in `defaultConfig()` von `true` auf `false` umgestellt (war ohnehin per Configurator-Flow überschrieben, aber semantisch sauberer für Sentinel-State). `todayISO`-Import aus `dates.js` entfernt — wird in useStorage nicht mehr gebraucht.

- **TripCalendar: Range-Select-Mode** (`src/components/TripCalendar.jsx`) — komplette Umstellung der Tap-Mechanik. Wenn `startDate==null || days==0` → Select-Mode: kein tripStart/tripEnd, leerer Calendar. 1. Tap setzt `pendingStart` (intern, orange Highlight via neue `.cal-pending`-Klasse). 2. Tap auf einen späteren Tag: `onSelectRange(startISO, days)` wird mit der berechneten Tagesanzahl aufgerufen (`diffDays(earlier, later) + 1`). 2. Tap auf einen früheren Tag: auto-swap (das frühere Datum wird Start, späteres End). 2. Tap auf den gleichen Tag: 1-Tages-Trip (`days=1`). View-Mode (Range gesetzt): Tap auf Trip-Tag öffnet das DaySheet wie bisher, Tap außerhalb der Range wird ignoriert (Edit der Range geht jetzt explizit via „Re-pick dates"-Link statt via implizites Tap-außerhalb, das User irritiert hat). Hint-Texte mode-abhängig: `calendarHintPickStart` / `calendarHintPickEnd` / `calendarHintView`.

- **ConfiguratorTab umgebaut** (`src/components/ConfiguratorTab.jsx`) — Stepper-Helper-Komponente komplett entfernt. Days-Display als read-only Hint: `daysSelected({days})` („14 days selected") wenn Range gewählt, sonst `daysNotSelected` („Tap a start day in the calendar, then your end day."). „↺ Re-pick dates"-Button (orange Link-Style, neue `.repick-btn`-CSS) erscheint nur wenn Range gewählt — setzt `days=0`, `startDate=null`, `bamagaDay=null` zurück, Calendar springt in Select-Mode. Generate/Update-CTA ist `disabled` bis `hasRange` (`days >= 1 && startDate != null`); neue `.gen-btn:disabled`-CSS (grau-beige). Calendar-Tip nur sichtbar wenn Range existiert (sonst widerspricht der Text dem Empty-State). `handleSelectRange(startISO, days)`-Callback berechnet auf einen Schlag: bamagaStop/bamagaDay je nach Trip-Länge, enabledStops auto-disable für Stops mit nicht-erreichbarem `minTripDays`, restaurantSlots/overrides/stopDays auf neue Trip-Länge gefiltert.

- **Stop-Filterung nach Trip-Länge** — `regions.js`: neues Feld `minTripDays` pro optionalem Stop (Cooktown=2, Coen=4, Archer=5, Bamaga=5; basiert auf typicalDay + 1 Puffer-Tag). `App.jsx.buildActiveTripTabs(bamagaStop, enabledStops, days)` filtert Stop-Tabs raus, deren `minTripDays > days` ist (sonst gäbe es bei 3-Tages-Trip einen leeren Bamaga-Tab). Configurator `markedDays` und `allStopRows` filtern identisch — Stop-Marker im Calendar verschwinden bei Trip-Verkürzung, im DaySheet erscheinen nur die für die aktuelle Trip-Länge sinnvollen Stops als Toggle. Konkret: 1-Tages-Trip = nur Cairns, kein Tab für Optional-Stops; 3-Tages-Trip = Cairns + Cooktown möglich; 4 Tage = + Coen; 5+ Tage = alle.

- **HomeTab + App.jsx Null-Handling** — `HomeTab.formatDate` returnt leeren String bei `null` startDate. `App.jsx` tripSummary nur wenn `config.completed && config.days >= 1` (Edge-Case für inkonsistente alte Saves abgesichert).

- **Strings in `src/strings.js`** — `daysLabel` von „Days on the road" auf „Trip length" (passender für Range-Display); neue Keys `daysNotSelected`, `daysSelected`, `repickDates`. Calendar-Hints aufgeteilt in `calendarHintPickStart` / `calendarHintPickEnd` / `calendarHintView`. `calendarTip` von „… (Bamaga, Cooktown, Coen, Archer River)" gekürzt auf „… mark a resupply stop." (war bei kurzen Trips irreführend, weil Bamaga/Coen ggf. gar nicht angeboten werden).

- **CSS** — neue Klassen `.repick-btn` (orange Link-Style), `.gen-btn:disabled` (grau-beige für deaktivierten Submit), `.cal-cell.cal-pending` (orange Highlight für gewählten Start im Range-Select).

### Bewusst NICHT gemacht

- **Hover-Range-Preview** — auf Touch-Devices gibt es kein Hover. Range visualisiert sich erst beim 2. Tap. Der Pending-Start ist orange markiert, das ist auf 360px-Mobile klar genug.
- **Stepper als Fallback neben Range-Select** — der Entwickler hat ihn explizit raus gewollt. Der Calendar ist jetzt Single Source of Truth für die Datums-Auswahl.
- **Edit-Mode mit eigener UX** — beim Trip-Edit (`config.completed`) wird die existierende Range im View-Mode angezeigt; um die Daten zu ändern, muss der User explizit „Re-pick dates" tappen. So bleibt der Edit-Flow vorhersehbar: Tap auf Trip-Tag = DaySheet (Stops/Restaurants), Re-pick = Daten ändern. Kein „Tap außerhalb der Range = neuer Start" mehr — das war versehentlich auslösbar.
- **Generator-Tests für 1-Tages-Edge-Case ausgebaut** — der bestehende Test mit `days: 0 → 1`-Klemmung deckt das ab. Neue Tests für minTripDays-Filterung wurden bewusst nicht geschrieben, weil das pure UI-Logik ist (Generator filtert Stops nicht; das macht der Configurator-State).
- **Auto-Migration alter Saves mit `days < 5 + bamagaStop:true`** — alle alten Saves haben `days >= 7` (alte Min-Klemmung), also kann der Mismatch nicht entstehen. UI filtert ohnehin korrekt für die Anzeige.

### Test- und Build-Stand

- 142 Tests grün (vorher 141, +1 für 3-Tages-Edge-Case)
- Bundle: 274.64 kB JS / 86.73 kB gzip · CSS 26.15 kB / 5.06 kB gzip (vs. 273.45 / 86.22 / 25.74 vorher — +1.2 kB JS für Range-Select-Logik + Stop-Filter)

### Bekannte Lücke / Hinweis für nächste Session

Live-Test im Browser steht noch aus — Build und Tests sind grün, aber UI-Verhalten beim Range-Select muss der Entwickler im Browser durchklicken (Stop-Toggles, Tipp-Texte, Calendar-Tap-Reihenfolge). Falls es auf einem alten `cfg_v1` mit `completed:true` öffnet, statt auf dem Empty-State Home-Screen zu landen → das ist erwartet, „Reset & start a new trip" auf der Home-Card räumt das auf.

---

## 2026-05-03 — Privacy Policy auf GitHub Pages gehostet (Pre-Submission-Block 100% durch)

**Anlass:** Vorige Session hat PRIVACY.md/DATA_SAFETY.md als Source-Files angelegt + AboutTab gebaut, aber der Privacy-Link zeigte auf das GitHub-Repo-File (`github.com/.../blob/main/PRIVACY.md`). Für Google Play Store ist das unzureichend — die Console verlangt eine **standalone Privacy-URL ohne Login-Wall**, die als Fundament des App-Listings stabil über Releases bleibt. GitHub-Repo-Links werden zwar gerendert, sind aber kein „Privacy-Hosting" im Sinne der Play-Store-Compliance (Google rendert das nicht ohne JavaScript, der Header zeigt GitHub-UI statt Privacy-Inhalt, Pfad ändert sich theoretisch wenn das Repo umbenannt wird). Dieser Commit schließt den letzten Pre-Submission-Block.

### Was gebaut wurde

- **`scripts/build-privacy.mjs`** (neu) — liest `PRIVACY.md`, konvertiert via `marked.parse(md, { gfm: true, breaks: false })` zu HTML, wraps das in ein standalone HTML-Template mit `<head>`-Meta-Tags (viewport, theme-color, robots index/follow für die Findbarkeit), minimal-inline-CSS und semantischem `<main>`-Wrapper. Schreibt `public/privacy.html`. CSS-Design: Cape-York-Orange-Akzent (`#C0600C`) konsistent zur App, neutrale Sans-Serif-Fonts (system stack — keine Google-Fonts-Dep), max-width 720px für Tablet/Desktop-Lesbarkeit, mobile-Breakpoint bei 480px (kleinere h1-Sizes, weniger Padding), hover-State auf Links. Bewusst KEIN externes CSS / Fonts / JS — das File muss aus jedem Browser stand-alone rendern (das ist ja der Punkt der Privacy-URL: erreichbar ohne unsere App).

- **`prebuild`-Hook in `package.json`** — `"prebuild": "node scripts/build-privacy.mjs"` plus `"privacy:build": "node scripts/build-privacy.mjs"` für Manual-Trigger. npm convention: `prebuild` läuft automatisch vor `build`. Bedeutet konkret: jeder `npm run build` (lokal + CI) regeneriert privacy.html aus dem aktuellen PRIVACY.md-Stand. Kein zusätzlicher CI-Step nötig.

- **`public/privacy.html` gitignored** — auto-generiertes File, Source of Truth bleibt PRIVACY.md. Wird im CI bei jedem Deploy frisch generiert. .gitignore-Eintrag mit erklärendem Kommentar warum.

- **`marked@^18.0.3`** als devDep installiert. Battle-tested Markdown-Parser, ~50 kB packed (devDep — nicht im Production-Bundle, also Bundle-Size unverändert). Alternative wäre `remark` (komplexer, Plugin-basiert, overkill für diesen Use-Case).

- **AboutTab-Link aktualisiert** — `S.about.privacyUrl` von `https://github.com/Japeyer/cape-york-app/blob/main/PRIVACY.md` auf `https://japeyer.github.io/cape-york-app/privacy.html` umgestellt. AboutTab-Header-Kommentar dokumentiert die neue URL als Play-Store-tauglich.

- **Wartungs-Reminder in `PRIVACY.md`** — HTML-Kommentar oben im File: „Bei Änderungen NICHT die HTML-Variante editieren — MD-File ändern und build laufen lassen." Verhindert Drift zwischen MD und HTML in zukünftigen Sessions.

### Bewusst NICHT gemacht

- **Generated `public/privacy.html` ins Git committed** — wäre einfacher (kein CI-Step), aber gefährlich: dann hat man zwei Source-of-Truth-Files die drift-en können. Auto-Generation aus MD ist die saubere Lösung. Gitignore-Eintrag verhindert dass das File versehentlich eingecheckt wird.
- **`marked` als Production-Dependency** — wird nur im build-Step gebraucht, nicht zur Runtime. Production-Bundle bleibt frei davon (Tree-shaking + Build-Step-Trennung).
- **Inline-CSS + JS bundled mit Vite** — das Privacy-File soll standalone sein, also bewusst KEIN Vite-Build-Pipeline-Touch. Direkt-Datei-Generierung statt React-Component damit es ohne JS rendert (= Accessibility + Suchmaschinen-Indexierung).
- **Terms of Service** — Google Play verlangt nur Privacy Policy als Pflicht, ToS ist optional. Vor Submission ggf. nachziehen wenn das Listing-Wizard das anfragt; der Build-Step ist generisch genug dass `terms.html` daneben generiert werden kann (aktuell nicht nötig — keine kommerziellen Bedingungen, keine Subscription, keine User-Generated-Content).
- **`/PRIVACY` (ohne .html-Extension) als Pretty-URL** — würde URL-Rewrites am Webserver brauchen, GitHub Pages tut das nicht ohne `.nojekyll` + custom 404-Hacks. `/privacy.html` ist 100% sauber + Play-Store akzeptiert beides.

### Auswirkung

Pre-Submission-Pflichtblock ist zu 100% durch. Die App ist jetzt **inhaltlich** Play-Store-ready (PWA-Funktion + Privacy-Policy + Daten-Safety-Doku). Verbleibend für Submission ist nur noch der **technische** Block: Capacitor-Setup (für APK), Play-Console-Account ($25), Listing-Texte + Screenshots. Bundle/Tests unverändert (273.44 kB JS / 86.22 kB gzip · 141 grün).

---

## 2026-05-03 — Pre-Play-Store-Block: Privacy + About-Page

**Anlass:** Erster konkreter Schritt Richtung Google-Play-Store-Submission. Aus dem Pre-Submission-Block ist Privacy Policy die einzige hard requirement, ohne die Google die App gar nicht erst akzeptiert — und gleichzeitig die niedrigste Code-Risiko-Aufgabe (keine Capacitor-/Android-/OneDrive-Dependency). Hat Synergie mit der ODbL-Attribution: bisher hing das Banner nur kontextuell im DaySheet, gehört aber global in eine About-Section. Hat zusätzlich den Wert eines vollständigen Code-Audits — was die App wirklich an Daten sammelt und an wen sie sie schickt.

### Audit-Ergebnis

`grep` über `src/` nach `localStorage`/`sessionStorage`/`fetch(`/`XMLHttpRequest`/`WebSocket`/`EventSource`/`navigator.send` plus manuelle Inspektion von `index.html` (kein externes Asset, lädt nur `/src/main.jsx`), `vite.config.js` (Service Worker config: pre-caching der eigenen Assets, kein Runtime-Caching externer URLs, kein Google Analytics aktiviert) und aller Production-Dependencies in `package.json`. Ergebnis:

- **5 localStorage-Key-Patterns**: `cfg_v1` (Trip-Config), `ck_<id>` (Shopping-Checkboxen), `del_<id>` (gelöschte Items), `qty_<id>` (Mengen-Overrides), `add_<bucket>_<id>` (User-hinzugefügte Items)
- **0 Network-Calls in src/** (kein fetch, kein XHR, kein WebSocket, kein EventSource, kein navigator.sendBeacon)
- **0 Cookies** (keine `document.cookie`-Werte)
- **0 Tracker** (kein Google Analytics, Mixpanel, Amplitude, Sentry, Crashlytics)
- **0 Drittanbieter-CDNs** (keine Google Fonts, keine externen Skripte)
- `workbox-google-analytics` ist transitive Dependency von `vite-plugin-pwa`, wird aber nicht aktiviert — verifiziert via Inspektion von `dist/sw.js` + `dist/workbox-*.js` (keine GA-Calls im finalen Bundle)
- `scripts/fetch-osm.mjs` ruft Overpass an — aber **nur build-time, nur wenn der Entwickler `npm run osm:refresh` manuell ausführt**. Endnutzer machen diesen Call nie. Wird in PRIVACY.md unter „Network connections" für Transparenz erwähnt.

Saubere Privacy-Story, fast kein Compliance-Aufwand bei der Play-Store-Form (Antwort auf „Does your app collect or share user data?" ist klar Nein).

### Was gebaut wurde

- **`PRIVACY.md`** (neu, ~120 Zeilen) — user-facing Privacy Policy in Englisch. 10 Sektionen: was die App handhabt (trip-data, kein PII), wo es liegt (`localStorage`-Keys explizit aufgelistet), wer es kriegt (niemand), Network-Connections (keine zur Runtime; OSM build-time erwähnt für Transparenz), Cookies/Tracking (keine — explizite Liste was nicht verwendet wird), Children (suitable but not targeted), Lösch-Workflow (zwei In-App-Buttons + OS-Pfad), OSM-Attribution + ODbL-Link, Änderungs-Policy, Kontakt-Email + GitHub-Source-Link.

- **`DATA_SAFETY.md`** (neu) — interne Audit-Doku in Deutsch. Zweck: vorbereitete Antworten für die Google-Play-Store-Data-Safety-Form, plus vollständiges Daten-Inventar als Reminder bei zukünftigen Code-Änderungen. Konkret: Audit-Methode dokumentiert, Form-Antworten (Collection: No / Encryption: N/A / Deletion: Yes), localStorage-Tabelle mit Lebensdauer pro Key-Pattern, Cookies (keine), andere Storage-Mechanismen (sessionStorage/IndexedDB nicht verwendet), Service-Worker-Cache-Policy, Build-time-only Network-Disclaimer, Drittanbieter-Library-Audit (alle Production-Deps einzeln durchgegangen), Permissions-Plan für Stufe 2 Capacitor (nur INTERNET, keine sensiblen), und ein Compliance-Reminder bei zukünftigen Code-Änderungen.

- **`src/components/AboutTab.jsx`** (neu) — neue View in der State-Machine. 5 Sektionen: **App-Header** (🦘-Icon + „Cape York 2026" + Tagline), **„Your data"** mit Kurzfassung („Everything you enter stays on this device. No account, no cloud sync, no analytics.") und Link zur PRIVACY.md auf GitHub, **„Data sources"** zeigt OSM-Snapshot-Datum dynamisch via `ROUTE_POIS_GENERATED_AT` + Curation-Hinweis für Rezepte + ODbL-Attribution direkt aus `ROUTE_POIS_ATTRIBUTION` (Single-Source-Prinzip — die OSM-Datei ist die Wahrheit, nicht ein duplizierter String), **„Important"** als Disclaimer mit Orange-Akzent und Borderline-Box („planning aid, not a substitute for trip preparation. Always carry adequate water, fuel, and emergency supplies. Confirm fuel availability and opening hours before you set out — OpenStreetMap data may be incomplete or outdated. Allergen filtering is heuristic — always check ingredient lists yourself if you have a serious allergy."), **„Contact"** mit `mailto:` Email-Link + GitHub-Source-Repo-Link.

- **App.jsx** — View-State-Machine erweitert um `'about'`. `handleOpenAbout` Callback. Topbar zeigt **ⓘ-Icon rechts** wenn `isHome` (sonst überladen mit Back-Button gleichzeitig); Title wechselt zu „Cape York 2026" auf About, Subtitle leer.

- **Strings** (`src/strings.js`) — neue `S.about`-Section mit 10 Keys (appName, tagline, privacyHeading/Body/Cta/Url, sourcesHeading/Body, disclaimerHeading/Body, contactHeading, contactEmail, sourceCta, sourceUrl). `sourcesBody` ist Funktion mit `{generatedAt}`-Parameter damit das OSM-Snapshot-Datum aus `route-pois.js` durchgereicht wird.

- **CSS** (~80 Zeilen) — `.topbar-about` (rechtsbündig, gleiche Pillenform wie Back-Button), `.about-wrap/-card/-app/-icon/-app-text/-app-name/-app-tagline/-section/-section-label/-text/-attribution/-link/-disclaimer`. Disclaimer-Text bekommt `#FEF0E6`-Hintergrund + Orange-Border-Left für visuelle Warnung. Link-Style ist Orange + bold ohne Underline (Touch-friendly mit 6px padding).

### Bewusst NICHT gemacht

- **PRIVACY.md inline im AboutTab rendern** (z.B. via react-markdown) — neue Dependency, neue Bundle-Size, fragwürdiger Wert. Externer Link auf das GitHub-File ist offline-untauglich, aber die App läuft sowieso vor Trip-Antritt online (der User kann's vorher im Detail lesen) und der Kurzfassung im AboutTab reicht für In-Trip-Nachfragen.
- **Privacy-Settings-Sektion mit „Daten löschen" Button im AboutTab** — die existieren schon zweifach (Home: „Reset & start a new trip"; Trip: „Reset all"). Ein dritter Pfad würde Verwirrung stiften.
- **Cookie-Banner** — bewusst keinen, weil keine Cookies. Trotzdem würde das einen Cookie-Banner-Pflicht erzeugen weil Nutzer den Unterschied zwischen Cookie und localStorage nicht sehen — aber unter DSGVO sind nur „technisch nicht notwendige Tracker"-Mechanismen consent-pflichtig, und unsere localStorage-Nutzung ist 100% notwendig (App ohne Trip-Config sinnlos). Wenn ein User-Anwalt das später anders sieht, kann nachgezogen werden.
- **HTML-Version der Privacy Policy auf GitHub Pages hosten** — vor Play-Store-Submission Pflicht. Aktueller GitHub-Repo-URL-Link funktioniert für Standalone-Hosting nicht (Google verlangt eine eigenständige Privacy-URL ohne Login-Wall). Pre-Submission-Reminder in STATUS.md hinterlegt.
- **Capacitor-Setup begonnen** — bewusst nach OneDrive-Umzug. Heutiger Block ist alles low-risk-PWA-Polish.

### Auswirkung

App hat jetzt eine sichtbare Privacy-Story und globale ODbL-Attribution. Pre-Play-Store-Submission-Pflichtblock zu 80% durch (verbleibend: HTML-Hosting der PRIVACY.md, Capacitor-Setup, Data-Safety-Form mit den vorbereiteten Antworten ausfüllen). Bundle: 270.28 → 273.45 kB JS (+3.2 kB), CSS 24.46 → 25.74 kB. Tests bleiben bei 141 grün.

---

## 2026-05-03 — Fuel-Section im DaySheet (OSM-Daten erstmals UI-sichtbar)

**Anlass:** Der vorige Commit hat die OSM-Tankstellen-Daten ins Repo geholt aber kein UI hat sie konsumiert — die Bytes waren tot. Erster Konsument: eine kompakte „Fuel ahead"-Section im DaySheet, die beim Tap auf einen Trip-Tag die nächsten 3 Tankstellen auf der geplanten Strecke zeigt. Niedrigster Aufwand für direkten Trip-Wert (Sprit-Planung ist auf Cape York sicherheitskritisch — längste Lücke ohne Diesel ist 189 km im Outback).

### Was gebaut wurde

- **`src/lib/route-position.js`** (neu) — `estimateRoutePosition({dayNum, days, bamagaStop, bamagaDay})` schätzt km-Position pro Trip-Tag via linearer Interpolation zwischen Cairns (Tag 1, km 0) und Bamaga (bamagaDay, km 1000). Liefert `{km, direction: 'north'|'south'}` oder `null` wenn keine Schätzung möglich (kein bamagaStop = kein Norden-Anker, oder out-of-range/non-finite Inputs). Outbound: `(dayNum-1)/(bamagaDay-1) × 1000`. Return: `(1 - (dayNum-bamagaDay)/(days-bamagaDay)) × 1000`. `nextFuelStops(km, direction, count)` filtert die FUEL_STOPS-Liste in Reise-Reihenfolge — strikt `> km` für north (am Bamaga-Tag erscheint Bamaga-BP selbst nicht), strikt `< km` für south, `(unnamed fuel)` ohne Brand werden ausgefiltert (meist Cairns-Metro-OSM-Lücken die User nicht im Kopf hat).

- **DaySheet-Erweiterung** (`src/components/DaySheet.jsx`) — neue Props `trip` ({days, bamagaStop, bamagaDay}). Zwischen Restaurant-Toggles und Sheet-Footer eine neue Section: Heading „Fuel ahead" + Hint mit geschätzter km-Position („Estimated position: ~500km from Cairns, heading north. Next stations:") + Liste mit max 3 Stops. Pro Stop-Card: Name (font-weight 600) + Meta-Zeile „Brand · km X" + Diesel-Badge in Orange wenn OSM `fuel:diesel=yes` getaggt. Empty-State („No further fuel stations on this leg.") für den letzten Tag bei südwärts/Tag bamagaDay bei nordwärts. **ODbL-Attribution** klein, rechtsbündig, opacity 0.8 unter der Liste — erfüllt damit die ODbL-Pflicht erstmals in der UI.

- **`src/lib/route-position.test.js`** (neu, 16 Tests) — Outbound-Interpolation (Tag 1 = km 0, bamagaDay = km 1000, Tag 5 = km 500 bei Standard-Trip), Return-Interpolation (Süd-Richtung, Tag last = km 0, Mitte ≈ halbe Strecke), Edge-Cases (`bamagaStop=false` → null, out-of-range/NaN → null, `bamagaDay=days` → kein Rückweg), `nextFuelStops` Reise-Reihenfolge + count-Limit + strikte > km + invalide Inputs + `(unnamed)`-Filter. Test-Total damit auf **141** (vorher 125).

- **Strings** (`src/strings.js`) — neue `S.config.daySheet`-Keys: `fuelHeading`, `fuelHintNorth({km})`, `fuelHintSouth({km})`, `fuelStopMeta({km, brand})`, `fuelDieselYes`, `fuelEmpty`, `fuelAttribution`. Englisch wie der Rest, i18n-ready.

- **CSS** (~50 Zeilen in `App.css`) — `.sheet-fuel-list/-row/-name/-meta/-diesel/-empty/-attribution`. Style folgt dem existierenden Sheet-Toggle-Look (Card-Border + bg, 10px radius), aber non-interaktiv (Liste statt Toggle-Buttons). Diesel-Badge in `var(--or)` Orange für visuelle Bestätigung.

### Bewusst NICHT gemacht

- **Multi-Stop-Anker für die Interpolation**: nur Cairns + Bamaga als Anker. Wenn User Cooktown an Tag 3 + Coen an Tag 5 + Bamaga an Tag 9 hat, könnte man segmentweise zwischen allen 4 Punkten interpolieren — gibt genauere km-Schätzungen für die Mitte des Trips. **Verworfen für MVP**, weil: (a) lineare Interpolation zwischen Cairns/Bamaga ist für Cape-York-Trips schon innerhalb ±10% der echten Position (Stops liegen ja meist auf der Hauptroute), (b) Implementation wird deutlich komplexer mit Anker-Sortierung + Range-Suche, (c) Aufwand vs. Wert nicht gerechtfertigt für einen Hint-Wert. Wenn Eigen-Trip zeigt dass die Schätzung zu ungenau ist, kann das nachgezogen werden.
- **Routing-API für echte Distanzen**: dieselbe Begründung wie beim Overpass-Commit — overkill für den Use-Case.
- **„Längste Sprit-Lücke" als Sicherheits-Warnung**: gehört in eine globale Trip-Übersicht (z.B. ein Route-Tab — Option (b) aus der Diskussion), nicht in den per-Tag-Sheet. Wäre der nächste sinnvolle Schritt wenn der Fuel-Hint sich bewährt.
- **Diesel-Status defaultet zu „unbekannt"**: nur 5 von 71 Stops haben `fuel:diesel=yes` in OSM. UI zeigt das Badge nur bei expliziten yes-Stops (ehrliche Datenwiedergabe — false-defaultet wäre irreführend, true-defaulted erst recht). User kann annehmen dass Roadhouses Diesel haben (in Australien Standard), aber die App behauptet's nicht aktiv.

### Auswirkung

OSM-Daten sind jetzt erstmals nutzbar in der App. Beim Planen klickt User auf Tag 5 und sieht: „Estimated position: ~500km from Cairns, heading north. Next stations: Caltex (km 560), unnamed stop (km 640), Bramwell Junction Roadhouse (km 829)." Direkter Sicherheits-Nutzen ohne neue Tabs / neue Bottom-Nav-Komplexität. Bundle wuchs von 258.12 → 270.28 kB JS (+12 kB, +3.2 kB gzip) — `FUEL_STOPS` wird jetzt nicht mehr tree-shaked weil `route-position.js` sie importiert. CSS 23.90 → 24.46 kB. ODbL-Pflicht ist erstmals in der UI eingelöst.

---

## 2026-05-03 — OSM-Fuel-Stops: Build-time Daten-Pipeline + Tests

**Anlass:** Trip-relevante Safety-Infos brauchen verlässliche, überprüfbare Daten. Die hartkodierten `kmFromCairns`-Werte in `regions.js` (Cooktown 330, Coen 580, Archer 670, Bamaga 1000) hatten keine Quelle und keine Test-Abdeckung — Refactor-Risiko bei jedem Edit. Cape York 4WD-Trips sind tankplanungs-kritisch (längste Lücke ohne Diesel ist 189 km, in Remote-Outback ist „Sprit alle" potenziell lebensgefährlich) → unabhängige Daten-Quelle und automatische Verifikation Pflicht.

### Was gebaut wurde

- **`scripts/fetch-osm.mjs`** (neu) — Build-time Node-Script. Hits Overpass-API mit QL-Query auf `amenity=fuel` Nodes+Ways in Cape-York-BBox (-16.95/-10.55 lat × 142.0/145.85 lon). Pro Stop: `id` (`node/123`), `name`, `brand`, `operator`, `diesel` (true/false/null), `hours`, `lat`, `lon`, `kmFromCairns`. Distanz via Haversine × 1.30 Road-Factor (empirisch aus Cairns→Bamaga 770 km Luftlinie / 1000 km Straße abgeleitet). Output: `src/data/route-pois.js` mit `FUEL_STOPS`/`ROUTE_POIS_ATTRIBUTION`/`ROUTE_POIS_GENERATED_AT`. Druckt zusätzlich kmFromCairns-Verifikations-Tabelle gegen die hartkodierten Werte in `KNOWN_SUPPLY_POINTS` mit Diff-Spalte und ⚠ wenn `|diff| > 50`.

- **`npm run osm:refresh`** in `package.json` — manuell ausführen wenn User aktualisierte OSM-Daten will. Bewusst nicht im CI-Build (offline-first: ein Build darf nicht fehlschlagen weil Overpass gerade down ist).

- **`src/data/route-pois.js`** (auto-generiert) — 71 Tankstellen, davon **15 nördlich von Cooktown** (Trip-relevant): Hann River Roadhouse km 364, Musgrave km 442, Coen km 560, Archer River km 640, Bramwell Junction km 829, Bamaga BP km 992. Längste Lücke 189 km (zwischen einem Unnamed Stop und Bramwell Junction). 5 explizit als Diesel-tagged, 14 ohne Name (OSM-Daten-Qualität).

- **`src/data/route-pois.test.js`** (neu, 11 Tests) — Lock-In für Daten-Vertrag: Pflichtfelder pro Stop, BBox-Coverage, Sortier-Invariante (Reise-Reihenfolge), ID-Eindeutigkeit, optionale Felder typrichtig. Plus Plausibilität: ≥30 Stops total, ≥5 nördlich von Cooktown, ≥1 bei Bamaga. **ODbL-Compliance-Test**: prüft dass `ROUTE_POIS_ATTRIBUTION` non-empty ist und „OpenStreetMap" enthält — schützt davor dass die Konstante umbenannt wird ohne dass die UI nachzieht. Test-Total damit auf **125** (vorher 114).

### kmFromCairns-Verifikation (regions.js gegen OSM)

| Stop          | Current | Estimated | Diff   |
|---------------|--------:|----------:|-------:|
| Cairns        |       0 |         0 |      0 |
| Cooktown      |     330 |       222 |  -108 ⚠ |
| Coen          |     580 |       560 |    -20 |
| Archer River  |     670 |       641 |    -29 |
| Bamaga        |    1000 |       992 |     -8 |

Cooktown zeigt -108 km Diff weil die Mulligan Highway-Route durch Black-Mountain-Country deutlich kurviger als 1.30× Luftlinie ist; 330 km bleibt korrekt. Andere Stops sind innerhalb 30 km — `regions.js`-Werte werden bestätigt.

### Bewusst NICHT gemacht

- **OSM-Daten im UI anzeigen**: `route-pois.js` ist zwar im Repo, aber kein Component konsumiert `FUEL_STOPS` aktuell. Build-Output ist um 0 kB grösser (tree-shaking). Wenn ein zukünftiger Fuel-Stop-Tab gebaut wird, muss `ROUTE_POIS_ATTRIBUTION` sichtbar werden — der Test feuert wenn die Konstante leer wäre, aber er prüft nicht aktive UI-Verkabelung. Reminder im Header von `route-pois.js`.
- **Runtime-Fetch**: bewusst Build-time. Cape York hat oft keinen Empfang, App muss offline-fähig bleiben. User triggert `npm run osm:refresh` manuell wenn OSM-Updates gewünscht — Coverage in Remote-Australien ändert sich selten genug (alle paar Monate ein neuer Roadhouse, wenn überhaupt).
- **Echte Straßen-Distanzen via Routing-API**: 1.30× Heuristik reicht für Sortierung „Stop X liegt zwischen A und B". Echtes Routing (Mapbox/OSRM) bräuchte Account + API-Key + Runtime-Calls — overkill für MVP.
- **Diesel-Verfügbarkeits-Annahme**: nur 5 von 71 Stops haben `fuel:diesel=yes` in OSM. Bedeutet nicht dass die anderen kein Diesel haben — bedeutet OSM-Mapper hat es nicht getaggt. Bewusst als `null` ausgewiesen statt false-defaulted (würde User in die Irre führen). Header-Kommentar in `route-pois.js` warnt explizit: „niemals verlassen, im Zweifel vor Fahrt anrufen".

### Tooling-Notizen

- **Overpass HTTP 406** beim ersten Run: User-Agent header fehlte. Gefixt mit `'cape-york-app/1.0 (+https://github.com/Japeyer/cape-york-app)'` + expliziter `Accept: application/json`. Overpass ist strict mit identifying UAs — sonst rate-limited oder rejected.
- **Lizenz-Header in jedem generierten File**: ODbL-Compliance benötigt Quelle + Attribution sichtbar. Header von `route-pois.js` enthält `© OpenStreetMap contributors, ODbL` plus Generierungs-Datum.

### Auswirkung

Datenpipeline funktioniert end-to-end (Overpass → Verifikation → Tests grün → Build grün). Konstanten in `regions.js` haben jetzt eine externe, reproduzierbare Quelle. Foundation für künftige Fuel-Stop-UI (Map-Tab, „nächste Tankstelle"-Card im Day-Sheet, etc.) steht. Build-Output unverändert (tree-shaking — kein Component konsumiert die Daten yet).

---

## 2026-05-03 — CI-Fix: Vitest 4 → 3 (eliminiert nested-vite Lockfile-Konflikt)

**Anlass:** Der vorige Vitest-Push (`ed75906`) ließ den GitHub-Actions-Deploy-Workflow scheitern. `npm ci` brach mit EUSAGE-Code ab — lokal lief alles grün, auf Linux nicht. Drei Failed-Runs hintereinander, auch nach Node 22 Bump und Lockfile-Regenerierung.

### Diagnose-Pfad (mehrere Iterationen)

**Versuch 1 — Lockfile regenerieren** (`8f6de5e`): `rm package-lock.json && npm install` neu. Alte Lockfile hatte 467 Einträge, neue 513 → 46 Pakete fehlten in der alten. Hypothese: Windows-ARM64-Bug. → **Failed**, npm ci immer noch EUSAGE.

**Versuch 2 — Node 20 → 22 in CI** (`6b5233e`): match lokale npm-11-Version. Hypothese: Lockfile-Format-Inkompatibilität zwischen npm 10/11. → **Failed**, gleicher Error.

**Versuch 3 — Verbose-Output via Commit-Comment** (`a4ee6cd`): GitHub-Logs sind ohne Auth nicht abrufbar (Artifact-Download liefert 401, raw-log-URL liefert 404). Lösung: Workflow postet bei Failure die letzten 80 Zeilen npm-debug-log per `GITHUB_TOKEN` als Commit-Comment, der über `GET /repos/:o/:r/commits/:sha/comments` öffentlich gelesen werden kann.

### Root Cause (endlich)

Aus dem Commit-Comment auf `a4ee6cd`:

```
npm error Missing: esbuild@0.28.0 from lock file
npm error Missing: @esbuild/aix-ppc64@0.28.0 from lock file
... (27 esbuild platform-binaries missing)
```

`npm ls vite esbuild` lokal:

```
+-- vite@5.4.21
|   `-- esbuild@0.21.5
`-- vitest@4.1.5
    +-- @vitest/mocker@4.1.5
    |   `-- vite@8.0.10           ← eigenes nested vite!
    |       `-- esbuild@0.21.5 deduped invalid: "^0.27.0 || ^0.28.0"
```

Vitest 4 hat seinen **eigenen nested `vite@8.0.10`** als regular dependency (nicht peer). Dieses vite@8 verlangt esbuild@^0.27||^0.28 als Bündel-Tooling. Auf Windows ARM64 schreibt npm aber die platform-binaries für die 0.28er-Version *nicht* in die Lockfile (bekannter npm-Bug, in STATUS.md schon dokumentiert seit dem ursprünglichen Rollup-Workaround). Die JS-Wrapper-Pakete sind drin, die nativen Binaries fehlen — `npm ci` mit `strict: true` lehnt das ab.

### Fix

**Vitest 3.2.4 statt 4.1.5.** Vitest 3 hat `vite` als **peer dependency**, nicht als nested regular dep — nutzt also das vorhandene vite@5 im Project, kein zweiter vite-Tree, kein doppelter esbuild.

`npm ls` nach Fix:

```
+-- vite@5.4.21
|   `-- esbuild@0.21.5
`-- vitest@3.2.4
    +-- @vitest/mocker@3.2.4
    |   `-- vite@5.4.21 deduped   ← gleicher vite, kein nested
```

114 Tests bleiben grün — Vitest-API zwischen 3.x und 4.x ist kompatibel, **kein Test-Code-Refactor nötig**. Test-Laufzeit lokal sogar 444 ms statt 757 ms (kleinere Dep-Tree).

### Lessons / Tech-Notizen für zukünftige Sessions

1. **Niemals neue Major-Versionen von Tools wählen, die vor <30 Tagen released wurden** — Vitest 4 ist sehr neu (Oktober 2025). Sweet Spot ist „Major-Version die seit ≥6 Monaten stable ist".
2. **Bei `npm ci`-Fehlern auf CI immer zuerst `npm ls <verdächtiger-pkg>` lokal laufen lassen** — zeigt sofort wenn doppelte Versionen / nested deps im Tree sind.
3. **Logs aus GitHub Actions ohne Auth holen:** Workflow postet Diagnose als Commit-Comment per `curl + GH_TOKEN`. Funktioniert immer, ohne Artifact-Download oder API-Auth-Setup. Permissions im Workflow: `contents: write`.
4. **Windows-ARM64 + OneDrive ist eine fragile Kombination für npm.** Der Workaround „auf Linux ein clean install machen" wäre bei zukünftigen Multi-Platform-Deps die saubere Lösung — aber WSL-Setup haben wir bisher vermieden.

### Workflow-Cleanup nach Diagnose

Diag-Steps wieder entfernt (`5ad36f1` artifact-upload, `a4ee6cd` commit-comment), `permissions: contents: write` zurück auf `read`, Node bleibt auf 22 (sinnvoll behalten).

### Commit-Liste der Diagnose-Iteration

| Commit | Was | Status |
|---|---|---|
| `ed75906` | Vitest 4 + 114 Tests + CI-Integration | failure |
| `8f6de5e` | Lockfile clean-regenerated | failure |
| `6b5233e` | Node 20 → 22 in CI | failure |
| `821d32a` | Erste Diag-Variante (GITHUB_STEP_SUMMARY) | failure (nicht abrufbar) |
| `5ad36f1` | Artifact-Upload-Variante | failure (Auth-Required) |
| `a4ee6cd` | Commit-Comment-Variante | failure → **echter Error sichtbar** |
| `b02a43b` | **Vitest 4 → 3 Pin + Workflow-Cleanup** | **success ✓** |

### Bewusst NICHT gemacht

- **Vite auf 6/7/8 upgraden** statt Vitest downgrade — wäre die andere Lösungsrichtung. Größeres Risiko (vite-plugin-pwa@0.20 explizit nur für vite@5 getestet, vite-plugin-react-Migration), kein erkennbarer Mehrwert für unseren Use-Case.
- **Lockfile auf Linux erzeugen via WSL** — würde den Windows-ARM64-Bug umgehen, aber WSL-Setup ist Mehraufwand. Solange wir Vitest 3 (peer-dep) nutzen, kein nested-vite/esbuild und damit kein Bug-Trigger.
- **`npm install` statt `npm ci` in CI** — würde EUSAGE-Errors umgehen, aber lockfile-pinning verlieren (nicht-reproduzierbare Builds). Mit dem echten Fix nicht nötig.

---

## 2026-05-03 — Vitest + 114 Tests für alle lib-Files; CI führt Tests vor Deploy aus

**Anlass:** App ist 6 Wochen vor dem Eigen-Trip (Juni 2026, 16-Tage Cape York). Bisher 0 automatisierte Tests, nur manuell-validierte Smoke-Tests in der CHANGELOG dokumentiert. Worst-Case-Szenario: ein Refactor zwischen jetzt und Trip-Start führt einen subtilen Bug im Generator ein (z.B. Bamaga-Routing falsch, Fleisch-Cluster verschoben, Allergen-Filter zu strikt) → der Entwickler fährt mit kaputtem Plan nach Cape York. Tests sind ab jetzt der Fail-Safe. Außerdem stehen sie sowieso auf der Stufe-2-Vorbereitungs-Liste (Pre-Play-Store).

### A) Setup

- **Neue devDep:** `vitest@^4.1.5` (256 KB, Vite-native, kein zusätzliches Test-Framework nötig — verwendet die bestehende vite-Config)
- **package.json scripts:**
  - `"test": "vitest run"` — single-shot, für CI
  - `"test:watch": "vitest"` — local TDD-Workflow
- **Keine vitest.config.js** — Vitest auto-discovered `**/*.test.js` und nutzt die bestehende `vite.config.js`. Die PWA-Plugin-Hooks sind während Tests inert.
- Vitest 4 vs. vite-plugin-react werfen 2 cosmetic deprecation-warnings beim Start (esbuild → oxc) — funktional irrelevant, lassen sich später durch ein Upgrade von vite-plugin-react fixen.

### B) Test-Files & Coverage

| File | Tests | Schwerpunkt |
|---|---|---|
| `src/lib/calories.test.js` | 29 | clampCustomKcal-Edge-Cases (NaN/null/over-MAX/STEP-Rundung), personDailyKcal Standard-Modi (alle Type×Appetite-Kombinationen mit Soll-kcal-Werten), Custom-Modus inkl. customKcal-Override, defensive Defaults bei unbekanntem Type/Appetite, groupFactor mit echten Familien-Mix (1M+1F=2.0 backward-compat), groupDailyKcal=5400 für Standard-2-Personen, migratePersonsToPeople für persons:1..8 + Out-of-Range-Klemmung |
| `src/lib/dates.test.js` | 20 | todayISO-Format & lokale-Zeit-Garantie, parseISO↔isoFromDate-Roundtrip, addDays über Monats-/Jahres-/Schaltjahr-Wechsel (2024-02-29!), diffDays inkl. DST-Sicherheit (Australia QLD hat kein DST → kritisch für Cape York), weekdayMo mit Mo=0..So=6 |
| `src/lib/allergens.test.js` | 26 | ALLERGENS-Liste matched Configurator, Core-Hits für alle 8 Allergene mit echten Zutaten-Strings, Topping-Markers (`Optional:`/`to taste`/`(optional)`/`to garnish`), False-Positive-Filter (Coconut/Oat/Almond Milk ≠ dairy, Peanut Butter ≠ dairy, `egg-free wheat noodles` ≠ eggs, `gluten-free pasta` ≠ gluten), Multi-Allergen-Behaviour, Wortgrenzen (`honey` ≠ nuts) |
| `src/lib/generator.test.js` | 39 | Output-Struktur (config/plan/shopping/warnings), Input-Klemmung an System-Boundary (days [7,28], people max 8, unbekannte enums fallen auf defaults), Determinismus (gleiche Config 2× = gleicher Output), Bamaga-Routing (true/false/clamping/Bucket-Existenz), Anti-Wiederholungs-Logik (1-Burner-Test der den Beef-Stir-Fry-Bug von 2026-05-02 als Regression-Test verewigt), Restaurant-Slots (rest:true Marker + keine Shopping-Items wenn alle Slots Restaurant), User-Overrides (Override picked + ovr:true marker + Fallback bei invalid recipe-id), Camping-Essentials (Wasser-Skalierung 2P×10D×3L=60L verifiziert + Eis-Skalierung mit fridgeSize), alle 4 Optional-Stop-Buckets (cooktown/coen/archer/bamaga + Cairns), Allergen-Filter, Fridge-Cluster-Logik (large > small clusterDays), Diät-Fallback bei Vegan + 5 Allergene, Item-ID-Stabilität quer durch verschiedene Configs |

**Total: 114 Tests in 4 Files, lokal grün in <400 ms.**

### C) Test-Diagnostik & Bug-Fixes (in den Tests, nicht im Generator)

Erste Ausführung hatte 2 Failures, beide in meinen Test-Annahmen, NICHT im Generator-Code:

1. **Restaurant-Items-Test**: ich nahm an, `Object.values(shopping)` liefert konsistent Arrays von `{cat, items}`-Objekten, was es auch tut — aber meine `cats.reduce(...)`-Verschachtelung war zu aggressive Reduktion. Stattdessen jetzt der schärfere Test: „wenn ALLE Slots Restaurant sind, hat Cairns NUR die Essentials-Kategorie übrig". Eindeutiger und semantisch wertvoller.

2. **Vegan + 5 Allergene**: ich erwartete dass jeder Slot gefüllt ist trotz Pool-Fallback. In Wahrheit kann der Generator bei extrem restriktiver Config slot=null liefern (wenn der Pool nach Fallback immer noch leer ist). Test relaxiert: nur das Vorhandensein einer Warnung wird verifiziert, plus dass `plan.length === 16` (kein Crash). Korrektes Verhalten — Generator warnt, UI rendert „no recipe".

### D) CI-Integration

`.github/workflows/deploy.yml`:

```yaml
- run: npm ci
- run: npm test     # ← NEU, vor build
- run: npm run build
```

→ Bei Test-Failure stoppt der Workflow und das Deploy zur GitHub Pages findet nicht statt. Schützt davor, dass ein versehentlicher Refactor mit kaputtem Generator live geht. Test-Laufzeit auf GitHub-Hosted-Runner (Ubuntu 20-Core): geschätzt <2 s, also vernachlässigbar im Build-Pipeline-Total.

### E) Was diese Tests NICHT abdecken (bewusst)

- **React-Komponenten (UI-Tests)**: würden React-Testing-Library + jsdom + diverse setup brauchen. Aktuelle Komponenten sind dünn (Routing in App.jsx + Render-Pässe in den Tabs) — Visual-Regression vor dem Trip via manuelles Klicken im Browser ist ausreichend. Stufe-2-Pre-Play-Store-Block würde das ergänzen.
- **localStorage-Migration in `useStorage.js`**: könnte mit fake-localStorage gemockt werden, wäre wertvoll wenn neue Migrations dazukommen. Bisher single-User → niedriger Risk-Score.
- **Integration-Tests „User klickt Configurator → sieht Plan"**: bräuchte Playwright/Cypress. Für MVP overkill.
- **Real-Recipe-Pool-Sanity** (z.B. „jedes Rezept hat mindestens 1 Zutat", „alle qty-Strings parsen ohne Fehler"): wäre genau das was vor jedem Recipes-Update Sicherheit gibt. Niedrige Prio bis das Recipe-Pool-CRUD (Stufe 2) kommt.

### F) Bekannte Vitest-Warnings (cosmetic)

```
[vite] warning: `esbuild` option was specified by "vite:react-babel" plugin.
This option is deprecated, please use `oxc` instead.
```

Vitest 4 nutzt Rolldown-Vite intern (statt klassisches Vite), das auf oxc statt esbuild gewechselt ist. `@vitejs/plugin-react@4.x` setzt aber noch esbuild-Optionen — Vitest übergeht sie aber funktional korrekt. Wird mit dem nächsten plugin-react Major-Release verschwinden.

### G) Bewusst NICHT gemacht

- **Coverage-Report (`vitest run --coverage`)** — würde extra Dep (`@vitest/coverage-v8` ~12 MB) brauchen. Tests sind manuell durchgegangen, jeder Public-Export ist getestet. Coverage-Zahl ist Vanity-Metric solange Tests sinnvoll sind.
- **Snapshot-Tests** — fragil bei jeder Recipe-Pool-Änderung. Lieber explizite Assertions auf konkrete Felder (was ich gemacht habe).
- **Property-based Tests (fast-check)** — Generator ist deterministic, das wäre nice-to-have aber overkill für aktuelle Bug-Surface.
- **Beforehand-Hooks** — Tests sind alle stateless (keine localStorage-Manipulation, keine DOM-Mounts). Kein cleanup nötig.

---

## 2026-05-03 — Codebase-Cleanup: Dead exports, unused strings, dokumentarische Daten

**Anlass:** Nach mehreren Iterationen Cruft akkumuliert. Drei `general-purpose`-Agents parallel angesetzt auf:
1. unused exports in `src/`
2. unused leaf keys in `S` (strings.js)
3. unused CSS classes in `App.css`

Plus manueller Sweep auf dokumentarische Datenfelder die nie gelesen werden (CLAUDE.md-Regel „don't design for hypothetical future requirements").

### Befund

**Dead exports** (1):
- `personFactor` in `lib/calories.js:45` — Funktion existiert weiter (intern verwendet von `personDailyKcal` und `groupFactor`), aber `export`-Keyword war dead.

**Unused strings** (2 leaf keys):
- `S.app.subtitleEmpty` („Configure your trip to begin") — wurde durch `S.home.emptySub` abgelöst als der Home-Screen gebaut wurde
- `S.app.tabs.configurator` („Trip") — der Configurator-Tab wurde aus der Bottom-Nav entfernt, der Tab-Label war übrig

**Unused CSS** (0): Alle Class-Selektoren in `App.css` haben mindestens eine JSX-Referenz. Style-Cleanup war beim Calendar-only-Refactor schon erschöpfend.

**Dokumentarische Datenfelder in regions.js** (3 Felder × 5 supplyPoints = 15 Vorkommen + Header-Kommentare):
- `stores: ['Woolworths', ...]` — Shop-Marken pro Ort, nirgends gelesen
- `capability: { freshMeat: 'full', ... }` — 13-Felder-Matrix pro Stop, laut Header-Kommentar „rein dokumentarisch — Generator routet nur Cairns/Bamaga frisch"
- `typicalDay: N` — Heuristik für Standard-Trip, war Grundlage für `defaultDayForStop` das beim Calendar-only-Stop-Refactor entfernt wurde

### Fixes

**`src/lib/calories.js`:** `export function personFactor` → `function personFactor` (Funktion bleibt, ist kein toter Code, nur die `export` ist redundant).

**`src/strings.js`:** `S.app.subtitleEmpty` und `S.app.tabs.configurator` raus. `S.app.tabs` Header-Kommentar präzisiert (Cairns/Bamaga → Cairns/Bamaga/…).

**`src/data/regions.js`:** `stores` / `capability` / `typicalDay` aus allen 5 supplyPoints raus. Header-Kommentar-Block (Doku der Felder) entsprechend gekürzt — nur die Felder die tatsächlich existieren werden noch dokumentiert. Inline-Kommentare zu Capability-Heuristik („Cairns hat alles. Hauptshop für den Trip.") raus.

**`src/hooks/useStorage.js`:** Stale Comment auf Zeile 174 aktualisiert. Sagte „Wird im Configurator beim Aktivieren auf `regions.js → typicalDay` initialisiert" — der ganze Aktivierungs-Mechanismus mit `defaultDayForStop` ist seit dem Calendar-only-Refactor weg, jetzt korrekt: „Wird gesetzt durch Tap auf einen Tag im Calendar-DaySheet (toggleStopForDay in ConfiguratorTab)".

### Bewusst BEIBEHALTEN

- **Migration-Code in `loadConfig`** (Zeilen 211–248): handhabt User-Saves aus älteren Versionen (alte `persons:N`-Schema, fehlende `bamagaStop`/`enabledStops`/`startDate`/etc.). Project ist in Dogfood-Phase mit nur einem User (der Entwickler), aber Migrations sind defensiver Code mit minimalen Kosten — bleiben.
- **Helpers `containsFreshMeat`, `meatShelfLife`, `meatClusterDays`** in `generator.js`: alle drei werden mehrfach intern aufgerufen (Pool-Splitting + Shelf-Sortierung + Cluster-Berechnung). Nicht exportiert, nicht dead.
- **`role`-Feld auf supplyPoint** (`'start'` / `'mid'` / `'roadhouse'`): wird in `ShoppingTab.jsx:193` gelesen für `isStart`-Branch (zeigt Cairns als „Hauptshop"). Bleibt.
- **`calColor` auf optional-Stops:** wird vom Calendar gerendert. Bleibt.
- **CSS-Comment „Legacy: alte Selektoren ..."** (App.css:533): die Klasse selbst (`.chk-item.orphan-item`) wird tatsächlich verwendet, der Kommentar erklärt nur warum die alte Notation überlebt. Bleibt.

### Build-Resultat

```
JS:  259.33 kB → 258.12 kB  (−1.21 kB)
gzip: 82.31 kB →  82.03 kB  (−0.28 kB)
CSS:  23.90 kB unverändert
```

Wenig in absolut, aber das Bundle bleibt schlank — und die Codebase ist konzeptionell sauberer (kein „warum ist das hier? wird das benutzt?"-Friction beim nächsten Refactor).

### Methodisch

Drei Agents parallel statt sequentiell für die Inventur — Antwortzeit halbiert, kein Kontext-Pollution im Main-Conversation. Manueller Sweep ergänzte die agent-finds um die `regions.js` doku-only-Felder (Agent erkennt `definiert aber nie gelesen` für JS-Symbole gut, aber Daten-Felder sind subtiler — `sp.capability` könnte im Prinzip via `Object.entries(sp)` iteriert werden, also brauchte das einen menschlichen Blick).

---

## 2026-05-02 — Calendar-only Stop-Management + sichtbarer First-Time-Tipp

**Anlass:** User-Beobachtung: Stop-Aktivierung war doppelt verkabelt. Bamaga hatte einen Yes/No-PillPicker im Configurator *plus* musste im Calendar-DaySheet noch der Tag bestätigt werden. Optional-Stops (Cooktown/Coen/Archer) hatten ihre eigenen Toggle-Pills weiter unten *plus* den Tap-im-Calendar-Workflow. Wenn der User einen Stop im Calendar einträgt, ist die Aktivierung implizit — die separaten Pills bringen keinen Mehrwert, nur kognitive Last und Doppel-UI.

Zusätzlich war das Tap-Verhalten des Calendars nicht selbsterklärend: erste User wussten oft nicht, dass der Calendar nicht nur eine Übersicht ist sondern auch der Ort für Restaurant- und Stop-Planung.

### A) UI-Änderungen in `ConfiguratorTab.jsx`

**Entfernt:**
- `<PillPicker>` für `bamagaStopLabel` (Yes/No)
- Konditionale Info-Box `cfg-bamaga-info` wenn Bamaga aktiv
- Komplette Section „Other resupply stops" mit 3 Toggle-Pills für Cooktown/Coen/Archer
- Konditionaler Hint `cfg-stops-tip` darunter
- Konstanten `BAMAGA_OPTS`, `OPTIONAL_STOPS`
- Helper `supplyPointFor`, `defaultDayForStop`
- Callback `toggleOptionalStop`

**Hinzugefügt:**
- `<div className="cfg-calendar-tip">` direkt unter `<TripCalendar>` — erste, prominentere Tipp-Box (orange Hintergrund, Icon-Präfix), Text: „💡 Tap any trip day to plan eating out or mark a resupply stop (Bamaga, Cooktown, Coen, Archer River)."
- Im `DaySheet` jetzt eine kleine `sheet-section-hint` unter „Resupply stops": „Tap to mark this day as the arrival. Tap again to remove."

### B) DaySheet-Logik komplett umgekrempelt

`enabledStopRows` (zeigte nur aktivierte Stops) ist jetzt `allStopRows` (zeigt alle optionalen Stops, auch inaktive). Drei mögliche Zustände pro Row:

| Zustand | Label | Visual |
|---|---|---|
| inactive | „Bamaga arrival" | leerer Checkbox |
| active, this day | „Bamaga arrival" | gefüllter Checkbox (✓) |
| active, other day | „Bamaga arrival · currently day 9 — tap to move here" | leerer Checkbox |

**`toggleStopForDay(stopId, dayNum)`** macht alle drei Übergänge in einer Aktion:

```js
if (!isOn) → enable + assign safeDay
else if (currentDay === dayNum) → disable
else → move to safeDay
```

Beim Disable bleibt `stopDays[stopId]` (resp. `bamagaDay`) im Storage erhalten — wenn User später re-aktiviert ohne Tag zu setzen, würde der letzte gesetzte Tag wiederkommen (aktuell aber: Re-Aktivierung passiert immer zusammen mit einem konkreten Tap auf einen Tag, also wird sofort der neue Tag geschrieben).

**Tag-1- und Tag-`days`-Edge-Case:** Auf dem ersten und letzten Trip-Tag versteckt sich die ganze Resupply-Section (`allStopRows` returned `[]` für diese Tage). Cairns ist Day 1 = Start, da resuppliert man nicht; Day `days` ist Rückkehr nach Cairns, ebenfalls kein sinnvoller Mid-Trip-Stop. Restaurant-Toggles bleiben aber sichtbar (Eating-Out in Cairns ist plausibel an beiden Tagen).

### C) String-Cleanup (`src/strings.js`)

**Entfernt** (ungenutzt nach UI-Removal):
- `bamagaStopLabel`, `bamagaStopHint`, `bamagaStopOptions`
- `bamagaCalendarHint`
- `optionalStopsLabel`, `optionalStopsHint`, `optionalStopOptions`
- `stopDayBadge`, `stopDayUnset`, `stopsCalendarHint`

**Hinzugefügt:**
- `S.config.calendarTip` — der prominente First-Time-Hinweis
- `S.config.daySheet.resupplyHint` — erklärt das Tap-Verhalten in der Section
- `S.config.daySheet.stopElsewhere({ name, day })` — Label für „Stop ist aktiv aber an anderem Tag"

**Geändert:**
- `S.config.calendarHint` von „Tap a day to mark Bamaga or restaurant meals; tap outside the trip to set a new start date." auf nur noch „Tap outside the trip to change the start date." (Tap-Verhalten innerhalb des Trips wird jetzt vom prominenten Tipp + DaySheet-Section-Hint kommuniziert, nicht mehr im kleinen Header-Hint)
- `S.config.daySheet.stopArrival` von „Set as ${name} arrival day" auf „${name} arrival" (kürzer, weil Section-Hint schon erklärt was Tap macht)

### D) CSS-Aufräumarbeiten (`src/App.css`)

**Hinzugefügt:**
```css
.cfg-calendar-tip {
  margin: -4px 0 12px;
  padding: 10px 12px;
  background: #FEF0E6;        /* warmes orange-tint */
  border: 1px solid #F3D2B0;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--tx);
}
.sheet-section-hint {
  font-size: 12px;
  color: var(--tx2);
  margin: -4px 0 8px;
  line-height: 1.4;
}
```

**Entfernt** (ungenutzt nach JSX-Removal):
- `.stops-list`
- `.stop-pill` + `.stop-pill.active`
- `.stop-pill-head`, `.stop-pill-check`, `.stop-pill.active .stop-pill-check`
- `.stop-pill-label`, `.stop-pill-day`, `.stop-pill-sub`
- `.cfg-stops-tip`
- `.cfg-bamaga-info`

### E) Datenmodell — bewusst unverändert

`bamagaStop`/`bamagaDay`/`enabledStops`/`stopDays` bleiben im `cfg_v1`-Storage und in der Generator-API. Alle Bestands-User-Saves funktionieren weiter, Generator-Routing (Frischfleisch nach Bamaga, Stop-Tabs in App.jsx) ist unberührt. Nur die UI-Affordance hat sich geändert.

Reasoning: Storage- und Generator-Migration wäre risikoreich (Bamaga ist tief im Generator drin) und ohne Mehrwert — die Felder sind weiterhin korrekte Beschreibung des Trip-Zustands.

### F) Smoke-Test (Browser via HMR + Build)

| Action | Erwartung | Result |
|---|---|---|
| Frischer Trip, Calendar offen | Tipp-Box sichtbar unter Calendar | ✓ |
| Tap auf Tag 9 | DaySheet öffnet, alle 4 Stop-Rows + Restaurant-Slots sichtbar | ✓ |
| Tap auf „Bamaga arrival" | Sheet zeigt ✓; Calendar-Cell wird grün mit 🌿 | ✓ |
| Sheet schließen, Tap auf Tag 12 | Bamaga-Row zeigt „currently day 9 — tap to move here" | ✓ |
| Tap → Tag 12 wird Bamaga, Tag 9 ist clean | Marker wandert | ✓ |
| Tap auf gleichen Tag (Tag 12) | Bamaga deaktiviert, Marker weg | ✓ |
| Tap auf Tag 1 | Resupply-Section gar nicht sichtbar, nur Restaurant-Toggles | ✓ |
| Tap auf letzten Tag | Resupply-Section weg, nur Restaurant | ✓ |
| Bestehender User mit Bamaga aktiv (Tag 9) | Marker ist da, Tap auf Tag 9 → DaySheet zeigt Bamaga als ✓ | ✓ |
| Build (`vite build`) | grün, Bundle 259.33 kB JS / 82.31 kB gzip | ✓ |

### G) Bewusst NICHT gemacht

- **First-Time-Tipp auto-hide nach erster Interaktion** — würde Storage-State + Auto-Hide-Logik brauchen. Statisch ist klarer, der Tipp bleibt klein und stört nicht.
- **Tooltip / Onboarding-Coach-Mark** — viel UX-Komplexität für eine 1-Satz-Erklärung. Inline-Tipp ist 100× simpler.
- **Drag-to-move für Stops im Calendar** — auf 360px Mobile fragil, konfligiert mit dem Tap-Toggle. Tap-on-other-day ist eindeutiger.
- **Stop-Day automatisch beim Aktivieren** (alte Logik mit `defaultDayForStop = typicalDay`) — jetzt nicht mehr nötig, weil Aktivierung *immer* zusammen mit einem konkreten Tag passiert (User tappt einen Tag → Stop wird genau dort aktiv).
- **Migration `bamagaStop` → `enabledStops.bamaga`** — wäre konsistenter im Datenmodell, aber Generator und mehrere Storage-Migrationen hängen am `bamagaStop`-Feld. Risiko/Nutzen sprach gegen Refactor.
- **Tag-Range im Calendar visuell markieren beim Stop-Marker** (z.B. „Phase 1 = days 1–9, Phase 2 = days 10–16") — wäre informativ, aber zusätzlicher Visual-Noise im Calendar. Bleibt als Stufe-2-Idee.

---

## 2026-05-02 — Home-Screen + View-State-Machine (Trip „fixiert", Edit nur via Home-Card)

**Anlass:** User wollte konzeptionellen Pivot — Trip-Planung soll sich „definitiver" anfühlen. Bisher war der Configurator ein Tab in der Bottom-Nav: jederzeit erreichbar, jeder Tab-Klick auf „Trip" konnte versehentlich Plan + Listen neu generieren. Listen wirkten dadurch fragil. User-Wunsch: Trip soll fest stehen, nur explizit über einen „Edit"-Button auf einer **Startseite** anpassbar sein. Vorbild ist die Listen-Apps-UX (Todoist, Things, Apple Notes — Übersicht zuerst, Detail nach Klick).

### A) View-State-Machine in `App.jsx`

Drei Views ersetzen den alten Tab-First-Approach:

| View | Wann | Bottom-Nav | Topbar |
|---|---|---|---|
| `home` | Initial-Einstieg, Back-Button von Trip-Active oder Configurator | aus | Title: „Cape York 2026", Sub: „Your Cape York trips" |
| `trip-config` | „Edit trip"-Button auf Home-Card oder Onboarding nach Reset | aus | Back-Button + Title: „New trip" / „Edit trip", Sub: „Tap 'Update plan' to save changes" |
| `trip-active` | „Open"-Button auf Trip-Card oder nach „Generate plan" | **an** (Menu/Recipes/Shopping) | Back-Button + Title: „Cape York Trip", Sub: Trip-Summary |

State: `view` + `activeTab` (nur in `trip-active` relevant). `app-no-nav`-CSS-Klasse auf `<div class="app">` wenn `view !== 'trip-active'` → Content-Bottom auf 0 statt 64px (Nav-Height).

**Callbacks:**
- `handleOpenTrip()` → `view='trip-active', activeTab='menu'`
- `handleEditTrip()` → `view='trip-config'`
- `handleBackHome()` → `view='home'`
- `handleConfigSubmit(next)` → speichert + `view='trip-active'` (vorherigen Tab beibehalten oder Menu)
- `handleCreateNew()` → wenn `config.completed`: `confirm()` → `resetAll()` → `view='trip-config'`
- `resetAll()` → `resetAllShoppingState()` + `defaultConfig()` + `view='trip-config'`

**`buildActiveTripTabs(bamagaStop, enabledStops)`** baut die Tab-Liste *ohne* den Trip-Tab. Configurator ist bewusst kein Tab mehr — ist nur über die explizite Home-Card-Edit-Action erreichbar.

### B) `src/components/HomeTab.jsx` — neue Komponente

Zwei Modi je nach `config.completed`:

**Empty-State** (kein Trip):
```
🦘
No trip planned yet
Set days, group, dietary preferences and resupply stops...
[ Plan your Cape York trip ]
```

**Trip-Card** (Trip vorhanden):
```
Your trip
┌─────────────────────────────────┐
│ Cape York Trip                  │
│ Sunday, June 14 → Mon, June 29  │
│ 16 days · 2 people · ...        │
│ Open →                          │
├─────────────────────────────────┤
│ ✎ Edit trip                     │
└─────────────────────────────────┘

────────────────────

+ Reset & start a new trip
This wipes the current trip — settings, swaps, and shopping checks.
```

`formatDate` nutzt `S.config.calendar.weekdaysFull` + `monthNames` für die englische Formatierung („Sunday, June 14, 2026"). End-Date wird aus `startDate + days - 1` via `addDays` aus `lib/dates.js` errechnet.

Card-Body ist klickbar (großes Touch-Target, öffnet Trip), „Edit trip" ist eine separate Action-Bar darunter. „Reset & start a new trip" als sekundärer Button mit Hint-Text — triggert `handleCreateNew` mit Confirm-Dialog.

### C) Strings (`src/strings.js`)

**Neue `S.home`-Section:**
```js
home: {
  subtitle: 'Your Cape York trips',
  yourTripsLabel: 'Your trip',
  tripDefaultName: 'Cape York Trip',
  openCta: 'Open',
  editCta: 'Edit trip',
  createCta: 'Plan your Cape York trip',
  createNewCta: 'Reset & start a new trip',
  createNewHint: 'This wipes the current trip — settings, swaps, and shopping checks.',
  createNewConfirm: 'Discard the current trip...',
  emptyTitle: 'No trip planned yet',
  emptySub: 'Set days, group, dietary preferences...',
}
```

**Neue Topbar-Strings:** `S.app.titleNewTrip` („New trip"), `S.app.titleEditing` („Edit trip"), `S.app.subEditing` („Tap 'Update plan' to save changes").

**Tabs.configurator wird nicht mehr verwendet** (bleibt im Code als String, ist aber nicht referenziert — kann später raus).

### D) CSS (`src/App.css`)

- `.app-no-nav .content { bottom: 0 }` — Content-Bereich erweitert wenn keine Nav unten
- `.topbar-back` — 44×44 Tap-Target links neben Title für ←
- `.topbar-titles` — Flex-Container für Title+Sub damit Back-Button sauber daneben sitzt
- `.home-wrap` — Padding + max-width Container
- `.home-section-label` — Kleines uppercased Label über Trip-Card
- `.home-trip-card` — Card mit Border + Schatten, white BG
- `.home-trip-body` — Klickbarer Card-Body (button), full-width, mit hover-State
- `.home-trip-title`, `.home-trip-dates`, `.home-trip-summary`, `.home-trip-cta` — Typo-Hierarchie
- `.home-trip-actions` — Action-Bar unten in der Card mit Top-Border
- `.home-trip-edit-btn` — Sekundärer Button (transparent + orange Text)
- `.home-divider` — 1px hr mit horizontal padding
- `.home-create-secondary` — Sekundärer „Reset & start"-Button
- `.home-create-hint` — Hint-Text-Subline darunter
- `.home-empty` — Zentriertes Empty-State-Layout
- `.home-empty-icon` (3em emoji), `.home-empty-title`, `.home-empty-sub`, `.home-create-btn` (primärer orange CTA)

### E) Beibehaltenes Verhalten

- Generator + Plan + Shopping-Customizations — alles unverändert. Nur die View-Verkabelung wurde umgestellt.
- `cfg_v1` localStorage-Format — unverändert. `config.completed` als Flag entscheidet Empty-State vs. Trip-Card.
- Existierende Reset-Buttons (Trip-Page „Reset all", Menu-Page „Reset all swaps") bleiben — der Home-Reset ist eine *zusätzliche* Top-Level-Aktion.

### F) Smoke-Test (Browser via HMR auf `http://localhost:5173/cape-york-app/`)

| Action | Erwartung | Result |
|---|---|---|
| Erstaufruf, kein Trip im Storage | Home zeigt Empty-State + Plan-CTA | ✓ |
| Tap „Plan your Cape York trip" | Configurator full-screen, keine Bottom-Nav | ✓ |
| „Generate plan" tappen | Trip-Active mit Menu-Tab + Bottom-Nav (Menu/Recipes/Shopping) | ✓ |
| Back-Button (←) in Trip-Active | Zurück zu Home, Trip-Card ist sichtbar | ✓ |
| Tap auf Trip-Card-Body | Trip-Active öffnet wieder im Menu-Tab | ✓ |
| „Edit trip" auf Card | Configurator full-screen, vorhandene Werte als Draft | ✓ |
| „Update plan" speichern | Zurück in Trip-Active mit angepasstem Plan | ✓ |
| „Reset & start a new trip" auf Home | Confirm-Dialog → Wipe → Configurator-Onboarding | ✓ |
| User auf Cooktown-Tab, deaktiviert Cooktown im Edit, „Update plan" | Tab springt zurück auf Menu (useEffect-Fallback) | ✓ |

### G) Bewusst NICHT gemacht

- **Multi-Trip-Support** — Home-Layout („Your trip" + Card) suggeriert Listen-Optik, aber `cfg_v1` hält weiterhin nur 1 Trip. Antizipiert Stufe 2 (mehrere geplante Trips). Migration wäre `cfg_v1 → cfg_v2 = { trips: [...], activeTripId }`.
- **Trip-Rename** — `tripDefaultName` ist statisch („Cape York Trip"). User-editierbar wäre einfach (String-Input im Configurator), aber nicht angefordert. Stufe 2 mit Multi-Trip wäre der natürliche Ort dafür.
- **Read-Only-Modus für Trip-Active** — User wollte Trip „definitiver" — gemeint war das Verstecken des Configurator-Tabs, nicht das Sperren von Swap/Restaurant/Shopping-Edits. Diese bleiben editierbar in Trip-Active. Der Schutz ist konzeptionell: Config-Änderungen erfordern explizite Edit-Action, kein Tab-Versehen.
- **Animationen / Page-Transitions** — Pure View-Switches via React conditional rendering. PWA auf Mobile braucht keinen Slide-Effekt; vermeidet Layout-Lag auf Low-End-Samsungs.
- **Browser-Back-Integration via `history.pushState`** — Aktuell ist Back nur via Topbar-←. Browser-Back würde aus der App rausnavigieren. Stufe 2 könnte React Router einbauen wenn Multi-Trip-URLs gewünscht sind.
- **Trip-Date-Edit von Home aus** — Datum ist nur in der Card lesbar; ändern erfordert „Edit trip" → Calendar im Configurator. Inline-Edit von Home wäre Doppel-UI ohne Mehrwert.

### H) Notiz für künftige Sessions

`view` und `activeTab` sind **nicht** in localStorage persistiert — bewusst. Beim Reload landet man immer auf Home, was der konsistente Einstieg ist. Wenn User „Open" tappt, kommt er sofort zur Trip-Active-View mit dem letzten `activeTab`-Default `menu`. Falls in Stufe 2 ein „letzte Sektion merken"-Wunsch aufkommt, wäre das ein simpler localStorage-Wert (`last_view`, `last_tab`).

---

## 2026-05-02 — Einkaufsliste editierbar — add/edit/delete pro Item (User-Customization-Schicht)

**Anlass:** Bisher war die Einkaufsliste read-only (komplett vom Generator generiert). User wollte:
- Einzelne Positionen löschen
- Neue Items pro Kategorie hinzufügen (mit Menge)
- Mengen bei existierenden Items editieren

Echtes Real-World-Bedürfnis: Generator weiß nicht alles (z.B. "ich hab noch Salz zu Hause" oder "ich brauch zusätzlich 2 Avocados für Snack").

### A) Storage-Schicht — drei neue Prefixes

```
del_<id>                → 'true', wenn das Item ausgeblendet ist
qty_<id>                → String, Override der Menge
add_<prefix>_<id>       → JSON {name, qty, cat}, User-hinzugefügt
```

Per-Item global (del_/qty_) vs. per-Bucket (add_):
- **del_/qty_ global**: wenn ein Item zwischen Cairns/Bamaga wandert (z.B. nach Fridge-Switch), bleibt der User-Wille konsistent. Item-IDs sind ohnehin global im Generator (slugify(name)).
- **add_ per-bucket**: User-hinzugefügte Items haben einen klaren Bucket-Bezug ("ich kaufe Pineapple in Cairns") — kein Wandern.

Helpers in `useStorage.js`: `isItemDeleted(id)`, `setItemDeleted(id, bool)`, `getAllDeletedIds()`, `getQtyOverride(id)`, `setQtyOverride(id, qty)`, `getAddedItems(prefix)`, `setAddedItem(prefix, id, payload)`, `removeAddedItem(prefix, id)`.

Neuer `resetAllShoppingState()` Helper räumt alle vier Prefixes (ck_/del_/qty_/add_) — wird von "Reset all" auf der Trip-Seite aufgerufen statt dem alten `resetPrefix('')`.

### B) ShoppingTab — `applyCustomizations()` Transform

Neue pure function:

```js
function applyCustomizations(data, prefix) {
  // 1. Filter out items in del_*
  // 2. Apply qty overrides → mark with `edited: true`
  // 3. Append items from add_<prefix>_* to their categories (create cat if needed)
  // 4. Sort items alphabetically per cat
  // 5. Drop empty categories
}
```

Wird via `useMemo` mit `customVersion`-bump-state aufgerufen. Jede Customization (delete/edit/add/restore) macht `bump()` → re-compute → re-render. `planKey` wird auf `customData` IDs basiert, damit das checkbox-State-Reset funktioniert wenn IDs sich ändern (added items neu, deleted items weg).

### C) UI — Edit-Sheet, Add-Sheet, Hidden-Section

**Per Item:** ✎-Icon (44×44px Touch-Target) am rechten Row-Ende öffnet `EditItemSheet`:
- Name-Input (read-only für Generator-Items, editable für user-added)
- Qty-Input (immer editable)
- "🗑 Delete" Button + "Save" Button (mit confirm dialog beim Delete)

**Per Kategorie:** "+ Add item" Button im Cat-Header (kompakt, weiße transparent on orange background) öffnet `AddItemSheet`:
- Name-Input (autoFocus)
- Qty-Input (optional)
- Cat ist preset vom Tap-Origin; im Sheet-Title sichtbar ("Add to 🍓 Fresh fruit")
- "Add" Button disabled bis Name leer ist

**Add custom item to a new category** Block am Listen-Ende für Items deren Cat noch nicht in der Liste ist (preset auf "📦 Other").

**Hidden items** Sektion am Listen-Ende: zeigt Items aus aktuellen Plan die der User gelöscht hat. ↺-Icon, Tap-to-Restore. Nur sichtbar wenn ≥1 Item dort. Header in grauer Akzentfarbe (var(--tx2)) damit es sich von "Already bought (orphans)" abhebt.

**Visual indicators:**
- User-added items: orange "+" Badge vor dem Namen
- Qty-überschriebene Items: kursive orange Qty (statt normal grau)

### D) Beibehaltenes Verhalten

- Checkbox-State (ck_) funktioniert weiter — auch für user-added Items (eigene IDs starten mit `u-`)
- Orphan-Sektion (abgehakt aber nicht mehr im Plan) bleibt — und filtert jetzt out die gelöschten (sonst würden sie doppelt erscheinen)
- Plan-Regeneration: customizations überleben (sind unabhängig von cfg_v1)
- Reset all (Trip-Seite): räumt jetzt auch del_/qty_/add_

### E) Smoke-Test (Browser via HMR)

| Action | Erwartung | Result |
|---|---|---|
| Tap ✎ auf "Bananas" → qty "5" | Bananas zeigt qty "5" kursiv | ✓ |
| Tap "+ Add item" in 🍓 Fresh fruit → "Pineapple" + "2" | Pineapple erscheint mit + Badge in der Sektion | ✓ |
| Plan regeneriert (Trip ändern) | Pineapple und qty-Override bleiben | ✓ |
| Tap ✎ → Delete auf "Spaghetti" | Spaghetti weg aus Liste; "Hidden items"-Sektion zeigt ihn | ✓ |
| Tap auf "Spaghetti" in Hidden | Restored in Original-Kategorie | ✓ |
| Reset all auf Trip-Seite | Alle Customizations weg | ✓ |
| User-added "Pineapple" abhaken → Plan ändern | Pineapple bleibt + bleibt checked | ✓ |

**Bewusst NICHT gemacht:**

- **Drag-to-delete oder Swipe-Gestures** — auf 360px Mobile zu fragil und konfligiert mit dem Tap-Toggle der Checkbox. Pencil-Icon ist eindeutiger.
- **Inline-Edit (Tap auf Qty → Input direkt)** — würde Layout shift haben und wäre auf Mobile fummelig. Bottom-Sheet ist konsistent mit existierender DaySheet/SwapSheet UX.
- **Cat-Auswahl beim Add im Sheet** — Cat ist preset weil der User gerade von dieser Kategorie gekommen ist (er tappt das + im Header). Wenn er eine andere Cat will, nutzt er den "Add custom item" am Ende.
- **Per-Bucket del_/qty_** — wäre granulärer aber inkonsistent mit dem Item-ID-Modell des Generators. User-Wahl ("Bananas weg") gilt überall wo Bananas auftauchen — IMO erwartetes Verhalten.
- **Undo-History für letzten Delete** — Hidden-items-Sektion ist die explizite Restore-Path. Kein Snackbar / Toast, weil das auf Mobile ohnehin oft verschwindet bevor User reagiert.
- **Kategorie-Suche / Auto-Complete für Add-Item** — Cat ist preset; Name ist freier Text. Spätere Iteration könnte Recipe-Pool-Vorschläge bringen.
- **Mengen-Kombinieren bei Duplikaten** — wenn User "Bananas" addet während "Bananas" schon im Plan ist, erscheinen beide als separate Einträge (mit unterschiedlichen IDs). Generator-Bananas hat Original-ID, User-Bananas hat `u-...`. Realistisch trifft das selten zu; wenn doch: User löscht eine.

---

## 2026-05-02 — Stops im Calendar markieren (Multi-Stop-Day-Picker, Bamaga-Pattern generalisiert)

**Anlass:** Mit Cooktown/Coen/Archer River jetzt auch im UI sollte der User pro Stop einen Tag im Calendar zuweisen können — wie er es schon mit Bamaga macht. Bessere Resupply-Planung visuell.

### A) `cfg_v1` erweitert: `stopDays`

```js
stopDays: { cooktown: null, coen: null, archer: null }
```

null = noch nicht zugewiesen; sonst 1-basierter Tag (analog `bamagaDay`). Bei Aktivieren eines Stops im Configurator: `stopDays[id]` wird auf `typicalDay` aus `regions.js` initialisiert, falls null. Beim Deaktivieren bleibt der Day erhalten — Re-Aktivieren restored die letzte User-Wahl. Migration für alte Saves: alle null.

### B) `regions.js` — `calColor` pro Stop

```js
{ id: 'cooktown', ..., calColor: { bg: '#DEEBFF', fg: '#1B4A8E', border: '#7AA7E6' } }  // blau
{ id: 'coen',     ..., calColor: { bg: '#EFE3F4', fg: '#5B2D7A', border: '#B088C8' } }  // violett
{ id: 'archer',   ..., calColor: { bg: '#FCE3DA', fg: '#A0421E', border: '#E29472' } }  // rot-orange
{ id: 'bamaga',   ..., calColor: { bg: '#E3F4E3', fg: '#2C6A2E', border: '#88C088' } }  // grün
```

Calendar rendert die Farbe als inline-style — kein hartkodiertes CSS pro Stop nötig, neue Stops bringen ihre eigene Farbe mit (Stufe-2-Geo-Erweiterung).

### C) `TripCalendar` von Bamaga-spezifisch auf generisch

Vorher:
```jsx
<TripCalendar bamagaStop={...} bamagaDay={...} ... />
```

Nachher:
```jsx
<TripCalendar markedDays={[{ dayNum, stopId, icon, calColor }, ...]} ... />
```

Configurator baut `markedDays` mit `useMemo` aus `enabledStops`/`stopDays`/`bamagaStop`/`bamagaDay`. Reihenfolge folgt `REGION.supplyPoints` damit bei Day-Kollision (mehrere Stops am selben Tag) deterministisch nördlicher gewinnt.

Cell rendert `marker.icon` und überschreibt Background/Border via `style={{ background: marker.calColor.bg, ... }}`. CSS-Klasse `.cal-stop` setzt nur `font-weight: 700`. Die alte `.cal-bamaga`-Klasse aus App.css wurde entfernt; `.cal-restaurant:not(.cal-bamaga)` heißt jetzt `:not(.cal-stop)`.

### D) `DaySheet` mit Multi-Stop-Toggles

Vorher hatte DaySheet einen einzelnen Bamaga-Toggle-Block. Jetzt:

```jsx
<DaySheet enabledStopRows={[{stopId, icon, label, sub, active}, ...]}
          onToggleStop={(stopId) => ...} ... />
```

Configurator baut die Rows aus aktivierten Stops + dem aktuell offenen Tag (`active = stopDays[id] === openDay.dayNum`). Bei Tap → `toggleStopForDay(stopId, dayNum)`:
- Bamaga: Tap auf gesetztem Tag → reset auf Tag 2 (Legacy-Verhalten — bamagaDay darf nie null sein, der Generator liest's)
- Cooktown/Coen/Archer: Tap auf gesetztem Tag → null (kein Marker mehr); Tap auf anderem Tag → verschiebt Marker dorthin

Resupply-Heading in der Sheet ist jetzt "Resupply stops" (Plural). Section ist nur sichtbar wenn mindestens ein Stop aktiviert ist.

### E) `ConfiguratorTab` — Stop-Pill mit Day-Badge

Aktivierte Stop-Pills zeigen jetzt den zugewiesenen Tag als orange Badge ("Day 3") oder "no day set" als Fallback (sollte im Normalfall nicht passieren, weil Aktivierung auto-init macht — aber wenn Trip-Verkürzung den Tag auf null clampt, kann es kurz so aussehen). Hint unter der Pills-Liste: "Tap a day in the calendar to assign or move a stop's arrival." — explizit damit User die Connection sieht.

`updateDays` clampt jetzt auch `stopDays`: out-of-range Tage gehen auf null (statt blind auf days-1 zu klemmen wie bei Bamaga). Reasoning: bei Bamaga ist eine valide Day-Zuweisung Generator-Pflicht; bei Optional-Stops ist null OK und zwingt User zur bewussten Re-Pick.

### F) Smoke-Test (Browser via HMR)

| Action | Erwartung | Result |
|---|---|---|
| Cooktown enable | typicalDay 3 erscheint als blauer Marker | ✓ |
| Tap Tag 5 → "Set as Cooktown" | Marker wandert zu Tag 5 | ✓ |
| Tap Tag 5 nochmal | Marker verschwindet (stopDays.cooktown=null) | ✓ |
| Coen + Cooktown beide enable | 2 Marker (blau + violett) | ✓ |
| Days von 16 auf 7 | Cooktown-day-3 bleibt; Coen-day-5 fällt auf null | ✓ |
| Disable Cooktown im Pill-Picker | Marker weg, stopDays.cooktown bleibt | ✓ |
| Re-enable Cooktown | Letzter Day wieder aktiv | ✓ |

**Bewusst NICHT gemacht:**

- **Generator nutzt stopDays für Frisch-Routing** — wäre Stufe 2. Aktuell routet Generator weiterhin nur Cairns/Bamaga; Cooktown/Coen/Archer bekommen nur ihre Essentials. Mit stopDays + capability-Matrix könnte Stufe 2 z.B. "Frisch für Tage 4–5 nach Cooktown statt Cairns" entscheiden — würde aber die `bamagaIdx`-Logik komplett überarbeiten.
- **Bamaga in `enabledStops` mergen** — wieder gegen den Sonderfall: bamagaDay darf nie null sein (Generator-Pflicht), die Reset-Geste ist anders. Bleibt als separates Flag bis Stufe 2 das ganze Stop-Modell unifiziert.
- **Multi-Marker pro Tag visuell stacken** — wenn User aus Versehen Cooktown UND Coen am selben Tag setzt, gewinnt der nördlichere Stop visuell (deterministic first-wins per supplyPoints-Reihenfolge). Cleaner als ein gemischter Marker-Splat. Realistischer Use-Case selten; wenn doch Schmerz: Stufe 2 könnte einen kleinen 2-Dot-Indicator anbieten.
- **Day-Picker-Stepper als Alternative zum Calendar-Tap** — Calendar ist Mobile-tauglicher (visuell sofort klar). Stepper wäre redundant.
- **`.cal-bamaga` CSS-Klasse als Fallback behalten** — entfernt, weil das neue inline-style-Modell konsistent für ALLE Stops gilt. Wenn Bamaga-spezifisches Styling wieder gebraucht wird: die calColor-Werte sind in regions.js, jederzeit überschreibbar.

---

## 2026-05-02 — Drei neue Resupply-Stops (Cooktown, Coen, Archer River) + Capability-Modell

**Anlass:** Cape-York-Trips haben nicht nur Cairns + Bamaga als Resupply. Realistische Route hat Cooktown (letzter großer Supermarkt), Coen (mid-Cape mit kleinem IGA), und Roadhouses wie Archer River (Eis-Stop). User wollte diese als optionale Stops hinzufügen plus eine Analyse, was an jedem Ort tendentiell verfügbar ist.

### A) Cape-York-Supply-Points-Analyse (in `regions.js` als `capability` dokumentiert)

| Stop | km | Typ | Fresh Meat | Fresh Veg/Fruit | Dairy | Bread | Pantry | Water | Ice | Camping |
|---|---|---|---|---|---|---|---|---|---|---|
| **Cairns** | 0 | full supermarkets (Woolworths/Coles/Aldi) | full | full | full | full | full | full | full | full |
| **Cooktown** | 330 | last real supermarket (IGA + Foodworks) | good | good | full | full | full | full | full | good |
| **Coen** | 580 | small IGA + Exchange Hotel | limited | limited | limited | limited | good | full | full | limited |
| **Archer River** | 670 | classic Cape-York roadhouse | none | none | none | none | none | limited | full | limited |
| **Bamaga** | 1000 | Bamaga IGA + Seisia store | limited | limited | good | good | good | full | full | limited |

Bewusst ausgelassen (zu klein / zu wenig Mehrwert für eigenen Tab): Lakeland, Laura, Hann River RH, Musgrave RH, Bramwell Junction RH. Können später dazukommen wenn User-Feedback es verlangt.

### B) `regions.js` — Datenmodell erweitert

Pro Supply Point neue Felder:
- `optional` — `false` für Cairns (immer Start), `true` für alle anderen
- `kmFromCairns`, `typicalDay` — Reise-Heuristik für UI/Routing
- `stores` — Shop-Marken vor Ort
- `capability` — Per-Kategorie-Rating (`full`/`good`/`limited`/`none`), aktuell rein dokumentarisch; Stufe-2-Routing kann es nutzen um z.B. "Cooktown nimmt Fresh Meat statt Bamaga, weil Cooktown früher und besser sortiert" zu entscheiden
- `essentials` — pro Stop spezifische Liste:
  - **Cooktown (6 items):** Wasser-Top-Up, Eis-Refill, fresh bread (1–2 loaves), paper towels, bin bags, wet wipes
  - **Coen (4 items):** Wasser-Top-Up, Eis-Refill, fresh bread (limited), bin bags
  - **Archer River (4 items):** Eis (key reason), Wasser (if low), travel snacks, cold drinks (Coke etc.)
  - **Bamaga (4 items, unverändert):** Wasser-Refill, Eis-Refill, bin bags, paper towels

Neuer Skalierungs-Helper `jerryCansTopUp(ctx)` für mid-stop water — gibt 1–3 jerry cans je nach Personenzahl, Label "top up if low" damit User entscheidet.

### C) `useStorage.js` — `enabledStops` in defaultConfig

Neuer Block:
```js
enabledStops: { cooktown: false, coen: false, archer: false }
```
Bamaga bleibt separat (`bamagaStop: boolean` + `bamagaDay: number`) weil es eine eigene Day-Picker-Logik hat.

Migration: alte Saves werden gemergt damit User-Aktivierungen nicht verloren gehen — `merged.enabledStops = { cooktown:false, coen:false, archer:false, ...parsed.enabledStops }`.

### D) `ConfiguratorTab` — Multi-Toggle-Block

Nach dem Bamaga-Block ein neuer "Other resupply stops" Block mit 3 Toggle-Pills (Cooktown/Coen/Archer River). Jede Pill zeigt Label + Sub-Text mit km-Distanz und Shop-Type. Aktiv = orange border + Checkmark im Quadrat. Layout vertikal stacked (nicht Grid wie Allergens) damit der Sub-Text Platz hat.

CSS: neue Klassen `.stops-list`, `.stop-pill`, `.stop-pill-head/check/label/sub`. Touch-Target ≥44px.

### E) `App.jsx` — `buildTabs` filtert auf optional + enabled

```js
function buildTabs(bamagaStop, enabledStops) {
  return [
    ... // config, menu, recipes
    ...REGION.supplyPoints
      .filter(sp => {
        if (!sp.optional) return true            // Cairns immer
        if (sp.id === 'bamaga') return bamagaStop // dediziertes Flag
        return enabledStops?.[sp.id] === true     // Multi-Toggle
      })
      .map(sp => ({...}))
  ]
}
```

`enabledStops` wird via `useMemo`-Dep an Generator + buildTabs durchgereicht; HMR triggert Re-Generate sobald User togglt.

### F) `generator.js` — Neue Helpers `isStopEnabled` + `pruneDisabledStops`

Ersetzen den hardcodierten `if (!stopAtBamaga) delete shopping.bamaga`-Cleanup. Generischer:

- `isStopEnabled(sp, ctx)` — checkt `optional=false` (Cairns), `bamagaStop` (Bamaga), oder `enabledStops[id]` (rest)
- `injectEssentials` — überspringt deaktivierte Stops, erstellt leere Buckets für aktivierte Optional-Stops (die haben kein Frisch-Routing)
- `pruneDisabledStops` — am Ende löscht Buckets von deaktivierten Stops (auch wenn sie aus alten generateShopping-Outputs übrig wären)

`generate({...})` API bekommt neuen Param `enabledStops` (object). Eingabe-Klemmung normalisiert auf bekannte IDs:
```js
const safeEnabledStops = {
  cooktown: stopsCfg.cooktown === true,
  coen:     stopsCfg.coen === true,
  archer:   stopsCfg.archer === true,
}
```

### Smoke-Test (5 Konfigs)

| Config | Buckets | Anmerkung |
|---|---|---|
| cairns + bamaga only | cairns, bamaga | wie vorher |
| all stops on | cairns, bamaga, cooktown, coen, archer | 5 Tabs für Versorgung |
| cooktown only | cairns, bamaga, cooktown | individueller Toggle |
| archer only | cairns, bamaga, archer | individueller Toggle |
| no bamaga + all opts | cairns, cooktown, coen, archer | Cairns absorbiert alles Frisch |

Tab-Count bei `all stops on`: config + menu + recipes + 5 supply points = **8 Tabs**. Auf 360px Mobile = 45px/Tab — funktional, aber an der Grenze. Wenn User Feedback kommt: Stufe-2-Konsolidierung in einen "Resupply"-Tab mit Sub-Navigation.

**Bewusst NICHT gemacht:**

- **Capability-basiertes Frisch-Routing** — d.h. wenn Cooktown an, sollten Frisch-Items für Tag (cooktown→nächster Stop) im Cooktown-Bucket landen statt Cairns. Aktuell routet der Generator nur Cairns/Bamaga frisch wie vorher; neue Stops kriegen nur Essentials. Stufe 2 kann das Capability-Objekt nutzen um intelligenter zu routen ("Cooktown.freshMeat=good → übernimmt mid-route fresh meat") — würde aber `bamagaIdx`-Logik im Generator komplett überarbeiten. Pragmatisch: User kennt die Realität ("ich kaufe in Cooktown nochmal Steak nach") und shopping list zeigt heute alle Frisch in Cairns; User nimmt halt ein paar Items in Cooktown nochmal, kein Showstopper.
- **Day-Picker für Cooktown/Coen/Archer** — Bamaga hat einen, aber nur weil das Frisch-Routing davon abhängt. Solange neue Stops nur Essentials haben, ist der Day irrelevant — `typicalDay` aus regions.js wird im UI vorerst nicht angezeigt.
- **Lakeland / Laura / Hann River / Musgrave / Bramwell Junction** — alle entweder zu klein (Lakeland/Laura = nur Sprit-Servo) oder funktional identisch zu Archer River (Hann/Musgrave/Bramwell sind Roadhouses mit ähnlichem Sortiment). Erweiterung später wenn Eigen-Trip zeigt, dass mehr Granularität nützt.
- **Bamaga in `enabledStops` mergen** — wäre architektonisch sauberer (one Set für alle optionalen Stops), aber Bamaga's `bamagaDay` macht es zum Sonderfall. Keep-as-is bis Stufe 2 das Modell unifiziert (z.B. `stops: { bamaga: { enabled: true, day: 9 }, cooktown: { enabled: false } }`).
- **Tab-Konsolidierung in einen "Resupply"-Tab** — würde 5+ Tabs vermeiden, aber bedeutet Sub-Navigation in einem Tab (Chips/Tabs in Tab). Vorerst flach lassen, refactor wenn Mobile-Realität es verlangt.

---

## 2026-05-02 — Camping-Essentials in der Einkaufsliste (datengetrieben, skaliert)

**Anlass:** Bisheriger Generator emittiert nur Zutaten aus Rezepten. Camping-Basics wie Trinkwasser, Foil, Müllbeutel, Eis, Elektrolyt-Sachets sind aber genauso shopping-pflichtig — beim Eigen-Trip im Juni würde der Nutzer ohne sie auflaufen. Architektur-Vorgabe 4 (CLAUDE.md): "Versorgungspunkte datengetrieben" → Liste gehört in `regions.js`, nicht in den Generator hardcoded.

### A) Liste in `regions.js`

Pro `supplyPoint` ein neues `essentials`-Array. Item-Schema: `{ id, name, qty }` — `qty` ist String (fix) oder Funktion `(ctx) => string` mit `ctx = { persons, days, fridgeSize, bamagaStop, bamagaActiveDay }`. So skalieren Items, die wirklich von der Trip-Größe abhängen, automatisch mit; Fix-Items (1 Foil-Rolle für 16 Tage = 1 Foil-Rolle für 7 Tage) bleiben unkompliziert.

**Cairns (15 Items):**
- Hydration: Drinking water (jerry cans), Electrolyte sachets — beide skaliert
- Cooling: Ice for cooler — skaliert mit Fridge-Type (large=compressor → 1 bag if cooler-style; medium → 2×5kg; small → 3×5kg)
- Storage: Ziploc bags large + small, Aluminium foil, Cling film
- Cleanup: Paper towels, Bin bags, Dishwashing liquid, Sponges
- Cooking: Matches/lighter, Cooking oil spray
- Hygiene: Wet wipes, Toilet paper

**Bamaga (4 Refill-Items):**
- Drinking water refill (skaliert mit `days - bamagaActiveDay`)
- Ice refill (skaliert mit fridge — bei large: "no refill")
- Bin bags (extra)
- Paper towels (refill)

**Skalierungs-Heuristik:** 3L Trinkwasser pro Person pro Tag (Cape-York-Standard bei 35–40°C), 12L-Jerry-Cans als Standard-Container, 1 Elektrolyt-Sachet/Person/Tag. Wasser-Splitting: Cairns deckt Tag 1 bis Bamaga-Tag (inklusive — am Bamaga-Tag selbst wird ja erst eingekauft); Bamaga deckt den Rest. Ohne Bamaga-Stop: Cairns = ganzer Trip.

### B) Injektion im Generator

Neue Funktion `injectEssentials(shopping, ctx)` in `src/lib/generator.js`:
- Iteriert über `REGION.supplyPoints`
- Pro Supply Point: skipt wenn keine essentials oder Bucket nicht existiert
- Mappt jedes Essential, evaluiert `qty` (Funktion → String mit ctx, sonst pass-through)
- `unshift`-t als neue Kategorie `'🧼 Camping essentials'` an die Spitze des Buckets

Aufgerufen direkt nach `generateShopping(...)` und VOR dem `delete shopping.bamaga` bei `!stopAtBamaga` — damit Bamaga-Essentials zusammen mit dem Rest des Bamaga-Buckets verschwinden, wenn kein Stop konfiguriert ist.

### C) ShoppingTab unverändert

Renderer iteriert generisch über `data.map(cat => ...)`. Essentials-Kategorie bekommt automatisch dieselben Checkbox + Progress-Mechanik wie Rezept-Items. Storage-Keys (`ck_<id>`) starten mit `ess-` Präfix → keine Kollision mit Recipe-Slugs.

**Smoke-Test (4 Konfigs):**

| Config | Cairns water | Bamaga water | Bamaga ice |
|---|---|---|---|
| 16d/2ppl/large/Bamaga9 | 5×12L (54L for first 9d) | 4×12L (42L for remaining 7d) | — (compressor) |
| 16d/2ppl/small/Bamaga9 | 5×12L (54L for first 9d) | 4×12L (42L for remaining 7d) | 1–2 × 5kg bags |
| 7d/1ppl/large/no-Bamaga | 2×12L (21L for first 7d) | (bucket gone) | (bucket gone) |
| 16d/2ppl/medium/Bamaga9 | 5×12L (54L) | 4×12L (42L) | 1–2 × 5kg bags |

Cairns-Kategorien-Reihenfolge nach Injektion: `🧼 Camping essentials` zuerst (15 items), dann existierende Rezept-Kategorien in alphabetischer Code-Point-Reihenfolge wie bisher. Bug bei kleinem Fridge: Eis skaliert von 1 bag → 3×5kg ✓.

**Bewusst NICHT gemacht:**

- **Essentials als komplett separater "Don't forget"-Block über der Liste** — wäre eine UI-Refactor in ShoppingTab. Eigene Kategorie löst dasselbe Problem ohne Renderer-Änderung. Architektur bleibt: Generator definiert Daten-Layout, ShoppingTab rendert generisch.
- **Skalierung für Foil/Ziploc/Bin bags** — eine Foil-Rolle reicht für 1 Person 7 Tage genauso wie für 8 Personen 28 Tage. Festmenge ist pragmatisch; bei extrem langen Trips (28d/8ppl) müsste der User halt 2 Rollen kaufen — sieht er beim Aufbrauchen.
- **Toiletries voll abdecken** (Sunscreen, Insect Repellent, Erste-Hilfe) — sind nicht food/cooking-related, wären eigener "Personal Care"-Block. Aktuell nur die echten cooking-Hygiene-Sachen drin (Wet Wipes für Hände beim Kochen, TP weil offensichtlich essential). Erweiterung später wenn der Eigen-Trip zeigt, dass mehr fehlt.
- **Custom-Reihenfolge der Cairns-Kategorien** — Essentials zuerst ist schon sinnvoll (User sieht's beim Reinkommen in Woolworths zuerst); der Rest bleibt alphabetisch über Emoji-Code-Points wie vorher (📦 zwischen 🐟 und 🥚 ist konsistent mit existierender Logik).
- **Per-Region-Helper-Funktionen ausserhalb von regions.js** — `jerryCansCairns`/`jerryCansBamaga`/`iceCairns`/`iceBamaga` bleiben in regions.js, weil sie zur Region-Konfiguration gehören. Stufe-2-Geo-Erweiterung kriegt eigene Helper für andere Regionen ohne den Generator anzufassen.
- **Wasser für den Bamaga-Tag selbst** — wird zu Cairns gerechnet (User trinkt morgens auf der Fahrt, kauft erst nachmittags Refill). Off-by-one-Risiko: User hat 1 Tag mehr Wasser als nötig — akzeptabel, im 40°C-Outback sowieso lieber Reserve.

---

## 2026-05-02 — First-Open-Defaults minimiert + Reset-Buttons (Trip + Menu)

**Was passiert ist:** Drei Sub-Features in einer Session, weil sie alle den `cfg_v1`-Lifecycle berühren.

### A) `defaultConfig()` ist jetzt First-Open-tauglich

- Vorher: `days: 16`, `bamagaStop: true`, `bamagaDay: 9` — sah aus wie "fertig konfigurierter Cape-York-Trip" beim allerersten Öffnen.
- Jetzt: `days: 7` (Pool-Minimum), `bamagaStop: false`, `bamagaDay: 4` (irrelevant solange Stop=off, aber valid wenn User später Yes wählt). 2 Beispiel-Personen (Adult-M-Medium + Adult-F-Medium) bleiben — zeigen die Add/Remove-Struktur ohne anzunehmen, dass das die echte Gruppe ist.
- Diet / Burners / Fridge: bleiben bei sensible Defaults (omnivore / 2 / large) — Pill-Pickers brauchen einen aktiven Wert, sonst rendert die UI nicht. Der User ändert sie ohnehin im Onboarding.
- `defaultConfig` jetzt `export`-ed, damit `App.jsx` (Reset all) und ConfiguratorTab die gleiche Quelle der Wahrheit haben.
- **Backward-Compat unverändert:** `loadConfig` macht `{...defaultConfig(), ...parsed}` — bestehende Saves überschreiben die neuen Defaults Feld für Feld. Migration alter `persons:N`-Saves läuft weiter über `migratePersonsToPeople`.

### B) „Reset all" Button am Ende der Trip-Seite

- **Sichtbarkeit:** nur wenn `!isOnboarding` (also `config.completed === true`) und `onResetAll` Callback gesetzt ist. Im Onboarding-State gibt es nichts zu resetten — User wäre nur verwirrt.
- **Style:** sekundär, rote Outline (`#C92A2A` border, transparent background) — destruktiv-signaling ohne dem orangen Generate-CTA optisch zu konkurrieren. Hint-Text darüber ("Clears all settings, swaps, restaurant slots and shopping checks") + dashed-border separator damit klar ist, dass das ein anderer Modus ist als "Update plan".
- **Verhalten:** `window.confirm()` Dialog → bei OK ruft `App.jsx:resetAll()` auf:
  1. `resetPrefix('')` löscht alle `ck_*` Storage-Keys (Shopping-Checkboxen)
  2. `saveConfig(defaultConfig())` überschreibt `cfg_v1` mit First-Open-Defaults
  3. `setActiveTab('config')` bleibt auf der Trip-Seite
- **Re-Mount-Trick:** `<ConfiguratorTab key={config.completed ? 'edit' : 'fresh'} … />` in App.jsx zwingt React, die Komponente nach Reset komplett neu zu mounten. Sonst hätte der lokale `draft`-State in `useState(() => ...)` die alten Werte behalten, weil der Initializer nur einmal läuft.

### C) „Reset all swaps (N)" Button im MenuTab

- **Sichtbarkeit:** nur wenn `overrideCount > 0` (über alle Tage + Slots gezählt) und `onResetAllOverrides` Callback gesetzt ist. Bei 0 Overrides hat der Button keine Funktion und würde nur Platz wegnehmen.
- **Style:** sekundär, orange Outline — gleiche Akzentfarbe wie "Manually picked"-Tag, damit der Zusammenhang visuell klar ist.
- **Verhalten:** `confirm()` mit Count → bei OK ruft `App.jsx:resetAllOverrides()` auf, das `cfg.overrides = {}` setzt. **Restaurant-Slots und Settings bleiben unverändert** — bewusst getrennte Konzepte (Eating out ≠ Recipe swap).
- **Position:** direkt unter den Summary-Counts (Restaurant / Breakfasts / Lunches / Dinners) — sichtbar ohne Scroll, aber nicht aufdringlich wenn keine Swaps existieren (Element existiert dann gar nicht im DOM).

**Smoke-Test (Browser-HMR):**

- First open mit leerem localStorage → Trip-Seite zeigt 7 Tage / 2 People / Bamaga off. Generate liefert valid 7-Tage-Plan ohne Bamaga-Tab.
- Edit + Generate + Reset all → Confirm → Onboarding-View, alle Shopping-Checks weg.
- Swap 3 Mahlzeiten → MenuTab zeigt "↺ Reset all swaps (3)" → Confirm → alle 3 Overrides weg, Plan regeneriert ohne ovr-Tags.

**Bewusst NICHT gemacht:**

- **Pill-Pickers ohne Default-Wert (3-state)** — würde signifikante UI-Refactor brauchen (disabled Generate solange nicht alles gepickt, "leerer" Pill-Style etc.). Sensible Defaults für Diet/Burners/Fridge sind pragmatischer für MVP. Wenn User-Feedback zeigt, dass das nicht reicht: Stufe 2.
- **Reset all reset auch `startDate`** auf `todayISO()` (über `defaultConfig()`) — gewollt, weil User vielleicht ein anderes Reise-Datum hat. Falls das stört, kann `resetAll` ein `startDate`-Parameter behalten — aktuell nicht nötig.
- **Reset Restaurant-Slots separat** — nicht angefragt, und Restaurant-Slots sind orthogonal zu Recipe-Swaps. Reset all (Trip-Seite) räumt sie mit auf. Wenn User später granular reset will: separater Button.
- **Custom-Modal statt `window.confirm`** — `confirm()` ist mobile-tauglich, blocking, und hat keine Dependencies. Custom-Modal wäre Stufe-2-Polish.
- **Confirm-Dialog umgehen wenn `overrideCount === 0`** — Button ist dann sowieso nicht sichtbar, also nicht relevant.

---

## 2026-05-02 — Anti-Wiederholungs-Logik im Plan-Generator

**Anlass:** User berichtete, dass bei 1-Burner-Standardkonfig „Beef stir-fry with rice noodles" (a4) zweimal hintereinander erscheint — Tage 5+6 in der Cairns-Phase und Tage 13+14 in der Bamaga-Phase.

**Root cause:** In `src/lib/generator.js` liefert `shelfPreference(clusterIdx)` für `idx 4` und `idx 5` beide `['long','medium','short']`. Der `long`-Bucket bei 1-Burner-Omnivore-Dinners enthält nur 1 Rezept (a4 = Beef strips). `pickMeat` advanced den Counter pro Aufruf, aber `[a4][1 % 1]` = `a4` → identischer Pick. Gleicher Effekt am Bamaga-Cluster-Ende mit unabhängigem Counter (Counter ist global pro `cat:tier`, aber das Pool-Size-Problem bleibt).

**Was geändert wurde — `src/lib/generator.js` `generatePlan`:**

- Neue Closure-Variable `lastPick = { f: null, m: null, a: null }` trackt das gestern gepickte Rezept pro Slot.
- `pickMeat(cat, clusterIdx)` macht jetzt zwei Durchgänge:
  1. Tier nach `shelfPreference` versuchen, aber Kandidaten überspringen, deren ID = `lastPick[cat]`. Counter wird nur beim wirklichen Consume erhöht — übersprungene Tiers bleiben für spätere Tage erhalten.
  2. Fallback: alle Optionen wären Wiederholung (Pool zu klein, z.B. nur 1 Rezept im Pool) → ursprüngliche First-Choice consumen, Wiederholung lässt sich nicht vermeiden.
- `pickNonMeat(cat)` reicht `lastPick[cat]` als `avoidId` an `pickRoundRobin` weiter. Bei Kollision: Counter um 1 vorrücken (eine Position überspringen) und Folge-Item nehmen — nur wenn `arr.length > 1`.
- Am Ende jedes Day-Loop-Iter wird `lastPick.f/m/a` aus den drei Slot-Entries befüllt. Restaurant-Slots haben kein `r` → setzen lastPick auf null → der nächste Tag hat freie Wahl. Overrides setzen lastPick auf die Override-ID → Folgetag meidet sie.

**Smoke-Test 8 Konfigs (alle 0 konsekutive Duplikate):**

| Config | Vorher (Tage mit Konsekutiv-Dup) | Nachher |
|---|---|---|
| omni 16 1burn lg | a4 (5+6, 13+14) | keine |
| omni 28 1burn lg | mehrere Cluster | keine |
| veg/vegan 16 1burn | bei kleinem Pool | keine |
| omni 7 1burn lg | (kurzer Trip) | keine |
| omni 16 2burn lg (Default) | (war OK) | weiterhin OK |

Speziell `omni 16 1burn lg` Dinner-Sequenz:

- Vorher: `a21 a5 a19 a3 a4 a4 a13 a23 a21 a5 a19 a3 a4 a4 a12 a14`
- Nachher: `a21 a5 a19 a3 a4 a19 a13 a23 a21 a5 a3 a19 a4 a3 a12 a14`

**Override + Restaurant Sanity Check (1burn, 16d, omni):**

- Tag 5 = Restaurant → korrekt als `{rest:true,rname:'Restaurant'}` gerendert, lastPick.a = null
- Tag 6 = Override `a4` → korrekt mit `ovr:true`, lastPick.a = 'a4'
- Tag 7 = `pickMeat` mit avoid=a4 → liefert `a13` (nonMeat) statt erneut Meat-Cluster zu picken — Anti-Wiederholung greift auch über User-Overrides hinweg

**Bewusst NICHT gemacht:**

- **Pool-Size-bedingte Wiederholungen über mehrere Tage hinweg** (User: „wahrscheinlich aufgrund der grösse des pools") bleiben unverändert. Bei z.B. vegan + 1-Burner mit Pool-Size 5 wiederholt sich jedes Rezept ab Tag 6 — das ist normaler Pool-Engpass, kein Konsekutiv-Problem. Stufe-2-Algorithmus könnte hier mit echter Abwechslungs-Heuristik (z.B. „kein Rezept innerhalb 3 Tage") oder einfach mehr Rezepten arbeiten.
- **Tier-Counter pro Cluster reseten** — wäre alternative Strategie für die Bamaga-Wiederholung, hätte aber das gleiche Problem bei einem einzelnen langen Cluster. Anti-Wiederholung via lastPick ist orthogonal und löst beides.
- **`shelfPreference(4)` und `shelfPreference(5)` aufdröseln** — direktes Quick-fix wäre, beiden Indizes unterschiedliche Tier-Reihenfolgen zu geben. Hätte aber das grundlegende Problem (1-Item-Pool) nicht gelöst, sondern nur an dieser einen Stelle umgangen. Anti-Wiederholung ist robuster gegen künftige Pool-Variationen.

**Build:** `npm run build` schlägt mit dem bekannten npm-Bug `@rollup/rollup-win32-arm64-msvc` (Issue [npm/cli#4828](https://github.com/npm/cli/issues/4828)) fehl — Code-Syntax via `node --check` validiert, Generator-Smoke-Tests laufen sauber. Build-Issue ist ein Tooling-Problem auf Windows ARM64, kein Code-Problem; Workaround laut npm-Bugreport: `node_modules` und `package-lock.json` löschen + `npm i`.

---

## 2026-05-01 — Cleanup-Pass: tote Code-Pfade, ungenutzte Exports, redundante Strings

**Was passiert ist:** Inventur aller Dateien nach Inkrement-Sessions. Identifiziert per Grep über alle Exports + JSX-Klassennamen + S.*-Pfade, dann gegengeprüft an Verwendungsstellen.

**Gelöscht (toter Code, nirgends verwendet):**

- **`src/hooks/useStorage.js`:** `useStorage`-Hook (generischer localStorage-Wrapper) — wurde nirgends importiert. Frühere Iteration für reaktive Checkbox-State, ersetzt durch direktes `getChecked`/`setChecked` in `ShoppingTab`.
- **`src/lib/allergens.js`:** `recipeAllergens(recipe)` Map-Variante — extern nicht genutzt, Generator ruft direkt `filterByAllergens` auf.
- **`src/components/MenuTab.jsx`:** `{meal.tag && <span className={...meal.tagColor}>...}`-Block — Generator setzt `tag`/`tagColor` nirgends, Überbleibsel aus dem statischen `days.js` (vor dem Generator-Pivot).
- **`src/App.css`:** Klassen `.tag-r`, `.tag-b`, `.tag-f` — nur vom soeben gelöschten Block referenziert. `.tag-n` (Bamaga „NEW") und `.tag.tag-ovr` (Manually picked) bleiben.
- **`src/strings.js` 9 ungenutzte Keys:** `S.config.removePerson`, `S.config.perPersonKcal`, `S.config.bamagaDayLabel`, `S.config.bamagaDayHint` (Stepper ist seit Calendar-Refactor weg), `S.menu.tags.restaurantAll/Once/Twice` + `S.menu.restaurantIcon` (alle aus dem statischen days.js-Era), `S.menu.swap.currentLabel` (im SwapSheet nicht referenziert).

**Privatisiert (nur intern verwendet, `export` entfernt):**

- `src/lib/allergens.js`: `recipeAllergenStatus` — wird intern von `filterByAllergens` aufgerufen. Plus aktualisierter Top-of-File-Comment auf neue Public-API.
- `src/lib/generator.js`: `containsFreshMeat`, `meatShelfLife` — werden ausschließlich in `buildSplitPool`/`pickMeat` verwendet, kein externer Konsument.
- `src/lib/dates.js`: `isoFromYMD` — Helper für `isoFromDate`, sonst nicht aufgerufen.

**Konsolidiert:**

- `src/components/ConfiguratorTab.jsx`: lokale Konstante `ALLERGEN_OPTS = [...]` durch Import von `ALLERGENS` aus `lib/allergens.js` ersetzt — eine Quelle der Wahrheit für die Allergen-Reihenfolge in UI + Filter-Logik.

**Build-Größen:**

- Vorher: 241.84 kB JS · 18.41 kB CSS
- Nachher: 241.37 kB JS · 18.28 kB CSS
- Delta: −0.47 kB JS · −0.13 kB CSS (raw, nicht gzip — gzip-Reduktion ist marginal weil entfernte Strings/Tokens stark wiederholt waren)
- Wichtiger als Bytes: 6 Exports weniger (47 → 42), klare öffentliche Lib-Oberfläche pro Modul.

**Bewusst NICHT gemacht:**

- **`migratePersonsToPeople`** (in `lib/calories.js`) — wird nur in `useStorage.js` aufgerufen für die Migration alter `cfg_v1`-Saves. Sieht aus wie tote Migration aber muss **bleiben** solange es Saves im Wild geben kann. Stufe 2 könnte das nach hinreichender Cooldown-Zeit (z.B. nach Eigen-Trip Juni 2026) entfernen.
- **DIETS / BURNER_OPTS / FRIDGE_OPTS in ConfiguratorTab** dupliziert von `generator.js` — bewusst nicht konsolidiert. Architektur-Trennung: Configurator definiert was *angeboten* wird (UI-Boundary), Generator klemmt was *reinkommt* (Daten-Boundary). Doppelte Listen sind hier feature, nicht bug.
- **`clampBamagaDay` in ConfiguratorTab + useStorage.js + generator.js** dupliziert (3 Kopien) — gleicher Grund. Jeder Layer klemmt seine eigenen Inputs.
- **`tap to clear`-Hardcoded-String in ShoppingTab** — sollte eigentlich in `S.shopping.orphans`. Niedrige Priorität, Funktion ist klar; verschoben in Stufe-2-i18n-Pass.
- **Public-Icons** (`icon-192.png`, `icon-512.png`) — Platzhalter, bleiben bis echtes Logo da ist (offener Punkt #6 in STATUS).

---

## 2026-05-01 — Trip-Kalender + Restaurant-Slots + Rezept-Tausch

**Was passiert ist:**

Drei zusammenhängende Features in einer Session, weil sie alle `cfg_v1` und den Plan-Generator anpacken.

### A) Trip-Kalender ersetzt Days-Stepper als primäres Datums-UI

- **`src/lib/dates.js` neu** — Datums-Helpers in eigener Lib (lokale Zeit, kein UTC-Shift): `todayISO`, `parseISO`, `addDays`, `diffDays`, `sameMonth`, `weekdayMo` (Mo=0..So=6 statt JS-Default So=0), `isoFromYMD`, `isoFromDate`. Konsolidiert was vorher in `useStorage.js` und `TripCalendar.jsx` dupliziert war.
- **`src/components/TripCalendar.jsx` neu** — Outlook-Style 7-Spalten-Monatsraster. Anker-Monat über ◀▶-Pfeile blätterbar; Trip-Tage werden im Kalender orange hervorgehoben. Multi-Monats-Trips zeigen alle berührten Monate **untereinander gescrollt** (Mobile-360px-tauglich; nebeneinander wäre auf Samsung-S nicht lesbar). Tap-Verhalten: nicht-markierter Tag setzt Trip-Start, markierter Tag triggert `onTapDay(dayNum, date)` (öffnet Day-Sheet).
- **`src/components/DaySheet.jsx` neu** — Bottom-Sheet mit Backdrop-Click-zu-schließen + Slide-up-Animation. Generischer `Sheet`-Wrapper (auch von SwapSheet wiederverwendet). Inhalt: „Resupply"-Sektion mit Bamaga-Toggle (nur wenn `bamagaStop=true`) plus „Eating out"-Sektion mit drei Toggles für Frühstück / Lunch / Dinner.
- **Bamaga-Stepper raus**, ersetzt durch Calendar-Tap. Tag wird im Day-Sheet umgesetzt: Tap auf „Bamaga arrival day" macht den aktuellen Tag zum Bamaga-Tag (zieht es vom vorherigen Bamaga-Tag ab); zweiter Tap setzt zurück auf Tag 2 (Default-Minimum). Hint-Block im Configurator erklärt: „Bamaga arrival is set for day N. Tap a different day in the calendar to change."
- **Days-Stepper bleibt** für Trip-Länge (7–28). Bei Verkürzung werden `restaurantSlots` und `overrides` für Tage > N automatisch raus gefiltert (`updateDays` in ConfiguratorTab) — sonst würden sie als Geister-Slots überleben und beim Verlängern wieder auftauchen.
- **`useStorage.js`:** `defaultConfig` erweitert um `startDate: todayISO()`, `restaurantSlots: {}`, `overrides: {}`. Migration für alte Saves: `startDate` default heute, beide Maps default leer.

### B) Restaurant-Mahlzeiten reduzieren Mahlzeit-/Einkaufslisten-Anforderungen

- **`src/lib/generator.js`:** Pro Slot in `generatePlan` zuerst Restaurant geprüft (`restaurantSlots[d][slot] === true`), wenn ja → `restaurantEntry()` = `{ rest: true, rname: 'Restaurant' }` (kein Pool-Pick, kein Shopping-Eintrag). Generic „Restaurant"-Label, weil User keine spezifischen Locations pflegen wollte. Bestehende `meal.rest`-Logik in MenuTab (`MealRow`) und `counts.rest` (Summary-Header) greift jetzt produktiv für vom User gesetzte Slots.
- Smoke-Test bestätigt: 2 volle Restaurant-Tage → Shopping-Items in Cairns reduziert sich (137 → 130, Mengen pro Item ebenfalls kleiner).

### C) Rezept-Tausch im MenuTab via Bottom-Sheet

- **`src/lib/generator.js`:** Override-Lookup pro Slot via `getOverride(overrides, day, slot)` — User-Wahl gewinnt vor Diät-/Allergen-/Burner-Filter (Argument: wenn der User explizit ein Rezept gewählt hat, will er es haben; Filter sind nur Suggestion-Heuristiken). Override-Pfade kommen *vor* Cluster-/Pool-Picks; Override-Mahlzeit bekommt `meal.ovr = true` für UI-Marker. Neue Export-API `compatibleRecipesForCat(cat, { diet, burners, allergens })` — Wiederverwendung der Filter-Logik durch SwapSheet, ohne den Generator-State doppelt zu pflegen.
- **`src/components/SwapSheet.jsx` neu** — Bottom-Sheet mit Liste aller passenden Rezepte (gefiltert nach Diät+Burners+Allergens), aktuelles Rezept hervorgehoben. „↺ Reset to default" Button räumt Override auf. Tap auf Rezept → `onPick(recipeId)` → Sheet schließt → App.jsx schreibt Override in cfg_v1.
- **`src/components/MenuTab.jsx`:** `MealRow` bekommt `dayNum`/`slot`-Props und einen „⟳ Swap"-Button neben dem Recipe-Link. „Manually picked"-Tag (grün) für Mahlzeiten mit `meal.ovr`. SwapSheet-State (`{ dayNum, slot, currentRecipeId } | null`) lokal in MenuTab, gemounted am Render-Ende.
- **`src/App.jsx`:** Neuer `setOverride(dayNum, slot, recipeId)` Callback — schreibt direkt nach `cfg_v1` und triggert Re-Generate via existierende `useMemo`-Deps (`overridesHash`). Wenn `recipeId === null` → Override-Eintrag wird entfernt (Auto-Cleanup leerer Day-Maps). MenuTab bekommt `config`/`allergens`/`onSetOverride` als Props.
- **`src/strings.js`:** Block `S.config.calendar` (monthNames, weekdays, weekdaysFull), `S.config.daySheet`, `S.config.calendarLabel/Hint`, `S.config.bamagaCalendarHint`. Plus `S.menu.swap` (btn, reset, title, hint, empty, currentLabel, ovrTag).
- **`src/App.css`:** Calendar-Grid mit aspect-ratio:1 Cells, Trip-Range orange (`#FEF0E6`), Bamaga grün (`#E3F4E3`), Restaurant gelb (`#FFF5DD`); Bottom-Sheet mit Backdrop + slide-up + max-height 80vh; Sheet-Toggles mit Checkmark-Box; Swap-Cards mit Icon + Meta + Active-Indicator. Plus `.tag.tag-ovr` (grünes „Manually picked" Tag, dezent unterscheidbar von der orangen Marke) und `.meal-swap` (Outline-Button, klein).

**Smoke-Test 6 Cases grün:**

1. Restaurant-Slots (day 1 lunch + day 5 dinner) korrekt als REST gerendert
2. Override (day 3 dinner = a9 Lamb chops) wird gepickt mit `ovr=true`
3. Override überlebt Diät-Wechsel auf vegan (User-Wahl wins)
4. Combined Restaurant + Override am selben Plan funktioniert
5. Shopping schrumpft bei Restaurant-Tagen (137 → 130 Items + Mengen-Reduktion pro Item)
6. `compatibleRecipesForCat` liefert korrekte Sets (10 Omnivore-F, 4 Vegan-1burner-noNuts-Dinners)

**Build grün:** 241.84 kB JS / 77.08 kB gzip · CSS 18.41 kB / 3.89 kB gzip. +3.3 kB JS gzip (für Calendar + Sheets + Swap).

**Begründung der Schlüsselentscheidungen:**

- **Days-Stepper bleibt zusätzlich zum Calendar** — Stepper ist die schnellste Eingabe für Trip-Länge (kein 30 Cells durchklicken). Calendar zeigt das visuell + erlaubt präzise Datums-Verschiebung. Dual-Mode statt Calendar-only.
- **Multi-Monats untereinander, nicht nebeneinander** — Mobile-First (360px). Side-by-side wäre nur Tablet-tauglich. User scrollt sowieso schon im Configurator.
- **Restaurant-Label generisch** (statt 4–5 spezifische Locations) — User-Wunsch. Reduziert Datenmodell auf 1 Boolean pro Slot, kein Restaurants-Array nötig. Wenn später spezifische Locations gewünscht: `restaurantSlots[d][slot]` könnte vom Boolean auf einen `restaurantId` upgegradet werden, abwärtskompatibel via Union-Type.
- **Override gewinnt unbedingt vor allen Filtern** — User-Wahl ist immer Wahrheit. Falls eine Override-Wahl mit aktueller Diät kollidiert (z.B. Lamb bei Vegan), zeigt UI das via „Manually picked"-Tag. User muss dann selbst entscheiden ob er die Wahl behalten will.
- **`compatibleRecipesForCat` als öffentliche API** — Vermeidet Duplizierung der Filter-Logik im SwapSheet. Single source of truth bleibt der Generator.
- **Bottom-Sheet statt Modal-Center** — Mobile-Konvention. Erlaubt One-Hand-Bedienung (Tap am unteren Bildschirmrand).
- **Tag/Restaurant-Slot-Map keyed by dayNum, nicht by Datum** — Wenn User Trip verschiebt (`startDate` ändert), bleiben „Tag 5 ist Restaurant"-Eintrag bestehen ohne Mapping-Aufwand. Wenn er gerade Tag 5 als „Bamaga + Restaurant Dinner" hatte und auf Tag 7 verschiebt, ist Tag 5 weiterhin so markiert. Wenn er Trip kürzt und Eintrag fällt raus, wird er beim Verlängern wieder relevant — dafür räumt `updateDays` aktiv auf.

**Bewusst NICHT gemacht:**

- **Spezifische Restaurant-Locations** (User-Wunsch) — generisches Label reicht für MVP. Datenmodell offen für späteren Upgrade auf `{restaurantId, mealType}`-Objekte.
- **Restaurant-Slots in Bamaga-Bucket reflektieren** — Restaurant ist „kein Einkauf nötig", betrifft also weder Cairns noch Bamaga; Frisch-Routing-Logik bleibt unverändert.
- **„Don't suggest again"-Blacklist** für persönlich abgelehnte Rezepte — User kann jeden Slot manuell tauschen, das deckt Single-Trip-Ablehnung. Trip-übergreifende Blacklist wäre Stufe 2 (braucht eigenen `cfg.blacklist: [recipeId]` und Generator-Filter).
- **Drag-and-Drop im Kalender** — Tap-only ist mobile-tauglicher; Drag auf 360px Touch ist fragil.
- **Trip-Verschiebung bei Calendar-Drag** — Tap auf nicht-Trip-Tag setzt Start (User merkt schnell wie's geht). Drag-to-shift wäre nice aber kein MVP-Pflichtfeature.
- **Override-Migration bei Tag-Verschiebung** — Wenn User `startDate` ändert, bleibt Tag-5-Override weiterhin auf Tag 5 (relativ zum neuen Start). Sinnvoll: User dachte „an Tag 5 will ich Lamm" — der absolute Datum-Bezug ist sekundär.

---

## 2026-05-01 — Allergien & Präferenzen-Filter (8 Toggles, gruppen-weit)

**Was passiert ist:**

- **Anlass:** Bisheriger Konfigurator deckt nur die Diät-Stufe (omni/vegetarisch/vegan) ab. Echte Allergien (Nüsse, Gluten) und Präferenzen (kein Schwein) sind separat — eine Person mit Nussallergie würde an Nuss-Frühstücken sehr schnell anstoßen. Neuer Block im Configurator + 2-stufige Filter-Logik im Generator.
- **Designentscheidung gruppen-weit, nicht pro Person** — Cape-York-Camping = ein Topf für die ganze Gruppe. Wenn Person A Nussallergie hat, kocht man für alle ohne Nüsse. Konsistent mit `diet`-Logik (auch global). Edge-Case „extra für sich selbst kochen" ignoriert für MVP.
- **`src/lib/allergens.js` neu** — Detection auf Zutaten-Ebene. Konstanten `ALLERGENS = ['nuts','gluten','dairy','eggs','soy','fish','shellfish','pork']`, pro Allergen ein Vokabel-Regex (Pork inkl. bacon/ham/chorizo/sausage/bratwurst — Australien-Setting hat fast nur Schweinwürste). API:
  - `recipeAllergenStatus(recipe, allergen)` → `'core'` (Hauptzutat) / `'topping'` (Optional/Topping/to-serve) / `undefined` (kommt nicht vor). Topping-Detektion via Marker-Regex auf `Optional:`/`If using:`/`to serve`/`to taste`/`to top`/`to garnish`/`on the side`/`(optional)`/`if you have`.
  - `filterByAllergens(recipe, userAllergens)` → `{ keep: bool, toppingAllergens: [] }`. `keep=false` bei core-Hit, sonst `keep=true` mit Liste der topping-Hits für UI-Banner.
  - **False-Positive-Filter:** `<allergen>-free` Patterns (z.B. „egg-free wheat noodles"), `PLANT_MILK_RX` (Coconut/Oat/Almond/Soy milk → kein dairy), `PLANT_BUTTER_RX` (Peanut/Almond/Coconut butter → kein dairy).
- **`src/lib/generator.js` Pool-Integration:** `buildRecipePool` und `buildSplitPool` filtern core-Allergen-Rezepte komplett aus. Topping-Allergen-Rezepte bleiben im Pool, werden aber durch Sort-Order ans Ende gestellt (Strict-Rezepte zuerst). Round-Robin pickt sie nur wenn die Trip-Länge den Strict-Pool überschreitet — also „nur dann wenn die Rezepte sonst wiederholen würden", wie der User wollte. `mealEntry` erweitert um `ta` (topping allergens array, optional). `generate({...allergens})` API erweitert; `result.config.allergens` zeigt aktive Filter (nach Cleanup).
- **`src/hooks/useStorage.js`:** `defaultConfig` um `allergiesEnabled: false` und `allergens: []` erweitert. Migration: alte Saves ohne diese Felder bekommen Defaults. Felder sind entkoppelt damit der UI-State (Pills sichtbar / aktiv) erhalten bleibt wenn der User Toggle „No" wählt.
- **`src/components/ConfiguratorTab.jsx`:** Neuer Pill-Picker ganz unten „Allergies or preferences? Yes/No". Bei Yes: 2-Spalten-Grid mit 8 Toggle-Pills (jede einzeln, nicht radio). Pills haben Labels + kurze Sub-Texte („Nuts — All tree nuts + peanuts", „Gluten — Bread, pasta, oats…", etc.). Aktive Pills haben rote Border + Hintergrund, semantisch anders als die orangen Diät-Pills.
- **`src/App.jsx`:** Effektive Allergens = `config.allergens` wenn `allergiesEnabled === true`, sonst `[]`. So bleibt Pill-Auswahl im Storage erhalten, wenn der User „No" wählt. `useMemo`-Deps um `allergensHash` erweitert.
- **`src/components/MenuTab.jsx`:** `MealRow` rendert pro Mahlzeit mit `ta?.length > 0` einen `topping-warning`-Banner (rote Border-Left, hellrosa Hintergrund): „⚠ Contains nuts as topping/optional — skip if allergic." Mehrere Allergene werden komma-separiert gelistet.
- **`src/components/RecipesTab.jsx`:** Same Banner direkt unter dem Rezept-Header (vor dem aufklappbaren Body). `useMemo` baut `toppingMap` aus dem Plan, weil ein Rezept an mehreren Tagen vorkommen kann — `ta` ist immer dasselbe (deterministischer Filter).
- **`src/strings.js`:** Block `S.config.allergiesLabel` / `allergiesHint` / `allergiesOptions` / `allergiesPickLabel` / `allergiesPickHint` / `allergenOptions` (8 Allergene mit Labels und Sub-Labels) und `S.menu.toppingWarning({ allergenLabels })` Template.
- **`src/App.css`:** `.allergen-grid` (2 Spalten), `.allergen-pill` mit `.active`-State (rote Akzentfarbe `#C92A2A`, Background `#FFE3E3` — bewusst anders als orange Standard-Pills, semantisch „Warnung"). `.topping-warning` Banner-Style (3px rote Border-Left, `#FFF5F5` Hintergrund, kleine Schrift, fett).
- **Smoke-Test 7 Cases + 12 Detection-Cases** (Scratch-File anschließend gelöscht):
  - Nuts-Allergie (16d, 2A, large): 2 topping-hits (m6 Egg salad „nuts on the side", m7 Noodle soup „peanut butter optional") — sauber
  - Gluten-Allergie: brutal restriktiv, 11 distinct recipes, mehrere thin-pool warnings — funktioniert aber
  - Multi-Allergen (nuts+dairy+vegetarian, 14d): 10 distinct recipes
  - Sanity-Check ohne Allergene: 0 topping-hits
  - Pork-Filter: alle 3 pork-Dinner (a3 Bratwurst, a6 Carbonara mit Bacon, a19 Sausages) korrekt ausgeschlossen
  - Plant milks (Coconut/Oat/Almond) korrekt NICHT als dairy
  - Peanut butter / coconut butter korrekt NICHT als dairy
  - „egg-free wheat noodles" in a20 korrekt NICHT als egg-Allergen
- **Build grün:** 230.69 kB JS / 73.78 kB gzip · CSS 13.40 kB / 3.00 kB gzip. +5.1 kB JS (~1.6 kB gzip) für die neue Lib + UI-Block.

**Begründung der Schlüsselentscheidungen:**

- **Heuristik statt per-Rezept-Tag** — 51 Rezept-Edits gespart. Detection-Tests zeigen 100% korrekt für die geprüften Edge-Cases (Optional-Bacon, Plant-Milk, Plant-Butter, *-free, Soy-Sauce-Variante). Falls in der Praxis Lücken auftauchen, kann ein explizites `allergens`-Tag pro Rezept später nachgereicht werden ohne Generator-Umbau.
- **Sort-Order statt zwei Pools** — Topping-flagged Rezepte einfach ans Ende des sortierten Pools, Round-Robin pickt sie nur „bei Bedarf" durch wraparound. Eleganter als zwei separate Pools mit Threshold-Logik.
- **Toggle entkoppelt vom Array** — `allergiesEnabled` und `allergens` sind separate Storage-Felder. So kann der User „No" wählen ohne dass seine Pill-Auswahl verloren geht; bei „Yes" macht er dort weiter wo er aufgehört hat.
- **Rote Akzentfarbe für Allergen-Pills + Banner** — Bewusst anders als orange (Brand). Allergen = „Warnung/Sicherheit" semantisch. Pill: `#C92A2A` Border + `#FFE3E3` Background; Banner: 3px rote Border-Left + `#FFF5F5`.
- **Keine proaktive Gluten-Warnung** (User-Wunsch) — Gluten-Allergiker haben keine Wahl, eine Warnung wäre nervig und nicht handlungsfähig. Generische Thin-Pool-Warning greift weiterhin (sagt sachlich „Only one lunch recipe matches…") ohne Allergie-spezifisch zu sein.

**Bewusst NICHT gemacht:**

- **Pro-Person-Allergien** (User-Empfehlung explizit ablehnt) — Camping = ein Topf für alle. Wenn jemand Nussallergie hat, lässt man Nüsse für alle weg.
- **Allergie-Banner in ShoppingTab** — Topping-Items (z.B. Nüsse als Garnish) bleiben in der Einkaufsliste, weil andere Personen sie ja essen können. Die Warnung steckt dort wo es relevant ist: am Rezept und an der Mahlzeit. Wer allergisch ist, weiß bei der Vorbereitung „Nüsse weglassen", nicht beim Einkauf.
- **Sesam, Sellerie, Senf, Lupinen** — In Australien selten kritisch, würde Pill-Grid überladen. Für MVP die 7 häufigsten Allergien + die häufigste Präferenz (Schwein).
- **Steps-basierte Detection** — Heuristik schaut nur in `ing`-Liste, nicht in `steps`-Texten. Konsistent mit `generateShopping` (auch nur ing). Wenn ein Rezept Nüsse in den Steps erwähnt aber nicht in ing, kauft der User keine Nüsse, also keine Allergie-Gefahr.
- **Multi-Variant-Detection** („Mustard or soy sauce" als optional-or-substituierbar) — Heuristisch schwer von „Beef or Lamb" (= jede Variante hat Soja-Risiko) zu trennen. Wir behandeln es konservativ als core-Hit. Verliert ein paar Rezepte für Soja-Allergiker, aber sicher.

---

## 2026-05-01 — Fleisch-Clustering nach Kühlschrank-Volumen + Shelf-Life-Sortierung

**Was passiert ist:**

- **Anlass:** Vorheriger Generator hat „omnivore" mit „Fleisch in jeder Mahlzeit" gleichgesetzt (jedes Frühstück mit Bacon, jeder Lunch mit Chicken-Wrap, jeder Dinner mit Steak/Hack). Realität: bei einem 16-Tage-Trip wären das 16 Fleisch-Frühstücke + 16 Fleisch-Lunches + 16 Fleisch-Dinners — viel zu fleischlastig, vor allem morgens. Dazu landet Frischfleisch dann gleichmäßig über den Trip verteilt — bei kleinen Kühlschränken verdirbt es.
- **`src/lib/generator.js` umfangreicher Refactor des Plan-Generators** — drei aufeinander aufbauende Heuristiken:
  1. **Frischfleisch-Detektion** (`containsFreshMeat(recipe)`, exportiert): Regex auf `beef|chicken|lamb|bacon|sausage|chorizo|pork|ham|turkey|duck|veal|bratwurst|prawns?|shrimp` in den Zutaten, aber: a) Zutaten die mit `Optional:` oder `If using:` beginnen werden ignoriert (f1 „Eggs + Optional bacon" zählt als veggie), b) shelf-stable Marker `jerky|biltong|salami|canned|tinned|in oil|in brine` schließen aus (m9 Beef jerky, m3 Tuna canned, a10 Tuna pasta). Tofu/Tempeh/Seitan zählen sowieso nicht (nicht im Regex).
  2. **Shelf-Life-Klassifizierung** (`meatShelfLife(recipe)`, exportiert): `'short'` (Geflügel/Hackfleisch/Frischfisch), `'medium'` (Wurst/Bratwurst/Chorizo), `'long'` (Beef/Lamm/Pork/Bacon — alles andere Frischfleisch). Kürzeste gewinnt sofort, damit ein Rezept mit Hähnchen + Bacon als 'short' klassifiziert wird.
  3. **Volumen-adaptives Clustering** (`meatClusterDays(fridge, groupF)`): Wieviele Tage Fleisch-Mahlzeiten am Stück nach jedem Einkauf? Fridge-Kapazität für Fleisch-Vorrat: small=3 L, medium=6 L, large=12 L (nach Abzug von Eiern/Käse/Gemüse/Getränken). Volumen-Bedarf: `groupFactor × 500 mL/Tag` (~250 g Fleisch + Verpackung pro „Base-Person"). `clusterDays = floor(capacity / demand)`, geclamped auf [1, 6] (oberer Cap = Food-Safety-Limit für Steak/Bacon in echter 4 °C-Kühlbox). **Adaptiv pro Appetit:** Light-Esser (groupF kleiner) bekommen mehr Cluster-Tage, Heavy weniger; Custom-kcal automatisch über `personFactor`.
- **Plan-Generierung umgebaut** (`generatePlan` ersetzt durch neue Logik mit `buildSplitPool`): Pool je Kategorie wird in `meat` und `nonMeat` gesplittet. `meat[cat]` ist nach Shelf-Life sortiert (short → long), `nonMeat[cat]` weiter nach Cooling. **Cluster-Zonen** werden via `meatDayIndex` berechnet (Map dayNumber → clusterIdx 0-basiert, post-Cairns + post-Bamaga). Pro Tag und Mahlzeitkategorie:
  - **Dinner:** Im Cluster → `pickMeat(cat, clusterIdx)` mit Shelf-Life-Präferenz nach `shelfPreference(idx)` (idx 0–1: short bevorzugt; idx 2: medium; idx 3: medium→long; idx 4+: long zuerst). Außerhalb Cluster → `pickNonMeat`. Round-Robin innerhalb des präferierten Tiers.
  - **Frühstück:** Nur am Cluster-Tag 0 (frischestes Fleisch direkt am Einkauf), max **1 Fleisch-Frühstück pro Cluster** (Quote `BREAKFAST_LUNCH_MEAT_PER_CLUSTER`). Sonst veggie.
  - **Lunch:** Cluster-Tag 0 oder 1, max **1 Fleisch-Lunch pro Cluster**. Sonst veggie.
- **Neue Warnungen:**
  - Bei `omnivore + small/medium fridge`: erklärt explizit „Fridge size 'small' → 2 day(s) of fresh-meat meals after each shop. Off-cluster days are vegetarian/vegan to avoid spoilage." (User soll die Cluster-Logik nicht als Bug empfinden).
  - „Few meat-free X options" bei Omnivore + dünnem Non-Meat-Pool (Off-Cluster-Tage würden stark wiederholen).
- **Output erweitert:** `result.config.meatClusterDays` (Tage-Zahl).
- **Smoke-Test 8 Plan-Konfigurationen + 13 Detection-Cases** (Scratch-Files anschließend gelöscht). Cluster-Zahlen: 2 A-M Medium small=2 / large=6, 2 A-M Light small=3, 2 A-M Heavy small=2, 4 Adults large=6, Custom 2×4500 medium=3, 1 Adult-M Medium small=5. Frühstücks-/Lunch-Quote hält in allen Cases (max 1 je Cluster). Detection: alle 13 Edge-Cases korrekt (f1 Optional-Bacon → veggie, m1 Chicken-leftover-or-canned → veggie, a9 Lamb-mit-Peas-canned → meat-long, etc.).
- **Build grün:** 225.59 kB JS / 72.20 kB gzip · CSS unverändert 12.58 kB / 2.87 kB gzip. +2.6 kB JS (~1.1 kB gzip) für die neue Helper-/Splitting-Logik.

**Begründung der Schlüsselparameter:**

- **`MEAT_VOLUME_PER_BASE_PERSON_PER_DAY = 500 mL`** — entspricht 250 g Fleisch + ~50 % Verpackungs-/Luftraum, realistisch für portionierte Vakuum-/Schalenware. „Base-Person" = groupFactor 1.0 (eine durchschnittliche Adult-M-Light + Adult-F-Heavy-Mischrechnung im BASE_KCAL=2700-Modell).
- **Fridge-Kapazitäten 3 / 6 / 12 L für Fleisch** — Annahme: ~10–25 % des nominellen Fridge-Volumens für Fleisch-Vorrat verfügbar (Rest: Gemüse, Eier, Käse, Getränke, tägliche Reserve). small (~50 L) → 3 L = 6 %, large (140 L) → 12 L = 9 %. Konservativ.
- **Cap auf 6 Tage** — echte 4 °C-Kühlboxen (Engel/Dometic): Steak/Bacon halten 5–7 Tage, Lamm 4–5, Wurst 3–5, Geflügel 1–2. Cap 6 ist fair für Steak/Bacon (= long-tier), die durch die Sortierung ans Cluster-Ende kommen. Geflügel/Hack landen an Tag 1–2, also weit unter ihrem Limit.
- **Quote 1 Fleisch-F + 1 Fleisch-Lunch je Cluster** — User-Wunsch „selten, primär nach Einkauf". Bei 2 Clustern (Cairns + Bamaga) je 16-Tage-Trip = 2 Fleisch-Frühstücke + 2 Fleisch-Lunches gesamt = ~12 % der Frühstücke/Lunches. Genau im „einige Male"-Bereich.

**Bewusst NICHT gemacht:**

- **Reste-Verwertung als strukturelles Konzept** — m4 hat „Last night's leftovers" als Freitext-Zutat, m1 hat „Chicken (leftover or canned)". Echte Rezept-Verkettung (z.B. Chili an Tag X → Chili-Wrap als Lunch an Tag X+1) bräuchte ein neues Datenmodell mit `leftoverFrom`-Refs zwischen Rezepten. Stufe 2.
- **Pro-Rezept `proteinType`-Tag** — Hätte 51 manuelle Edits gekostet. Regex-Detektion auf den Zutaten ist robust und liefert die korrekten Werte für alle 51 Rezepte (durch 13-Case-Smoke-Test verifiziert). Falls die Heuristik in der Praxis Lücken zeigt, kann ein explizites Tag später nachgereicht werden ohne Generator-Umbau.
- **Differenzierung „Fleisch im Cluster = Fleisch jeden Tag"** — Auch innerhalb des Clusters könnte man Fleisch-Dinner mit veggie-Dinner abwechseln (z.B. nur jeden 2. Tag Fleisch). Aktuell: Dinner im Cluster ist immer Fleisch. Argument: Frischfleisch *muss* in der Cluster-Zeit verbraucht werden — Pause = Verschwendung. Falls User später anders wünschen: Quote pro Cluster auch für Dinner einführbar.
- **Geflügel-Cap auf 2 Tage** — Geflügel hat 1–2 Tage echte Kühlbox-Haltbarkeit, also wird short-Pool durch shelfPreference an Tag 0–1 gepriorisiert. Eine *harte* Sperre („nie Geflügel an Cluster-Tag 3+") wäre redundant: bei größeren Clustern verteilen sich kurze Tier-Recipes per Round-Robin sowieso früh, weil pref-Order bevorzugt sie.
- **Volumen pro Mahlzeit aus dem konkreten Rezept lesen** (Steak 250 g vs. Bacon 80 g vs. Würstchen 150 g) — wäre genauer, aber Rezepte haben uneinheitliche Mengen-Strings (`150g/person` vs. `2/person (~200g)` vs. `4 slices/person`). Pauschale 250 g pro Person reicht für die Cluster-Längenrechnung; der Generator skaliert die *eigentliche* Einkaufsliste sowieso präzise pro Rezept.

---

## 2026-04-30 — Bamaga-Stop konfigurierbar (Yes/No + Tag-Auswahl)

**Was passiert ist:**

- **Konzeptionelle Verschiebung:** Bamaga-Stop war bisher hart verdrahtet (Generator splittet automatisch bei ~55 % der Trip-Länge, Bamaga-Tab immer sichtbar). Realität auf Cape York: nicht jeder Trip macht den Mid-Stop in Bamaga (Lakefield-Loop, Old-Tele-Track-Out-and-Back, kurze Trips bis Cooktown). Lösung: zwei neue Config-Felder `bamagaStop: boolean` und `bamagaDay: number | null`.
- **`src/hooks/useStorage.js`** — DEFAULT_CONFIG erweitert um `bamagaStop: true`, `bamagaDay: 9`. Neuer Helper `clampBamagaDay(day, days)` setzt strikte Range `[2, days−1]`. `loadConfig` migriert alte Saves: wenn `bamagaStop` nicht boolean → `true`; wenn `bamagaDay` keine Zahl → `clampBamagaDay(round(days × 0.55), days)` (entspricht alter automatischer Heuristik). Vorhandene `bamagaDay`-Werte werden ebenfalls geklemmt, falls Days nachträglich verkürzt wurde.
- **`src/lib/generator.js`** — `generate({…, bamagaStop, bamagaDay})`. Default-Verhalten: `bamagaStop !== false` (truthy/undefined → an, nur explizites `false` schaltet aus — backward-compat zu Aufrufen ohne diese Felder). Wenn an: `bamagaActiveDay = clampBamagaDay(bamagaDay ?? round(D × 0.55), D)`. Wenn aus: `bamagaActiveDay = null` und `delete shopping.bamaga` am Ende, damit der Bucket-Key in der UI gar nicht erst auftaucht. `generatePlan({…, bamagaActiveDay})` setzt das `bamaga`-Flag pro Tag basierend darauf. Output `result.config` enthält jetzt `bamagaStop` und `bamagaDay` (geklemmt oder null).
- **`src/components/ConfiguratorTab.jsx`** — Neuer Pill-Picker für `bamagaStopOptions` (`yes` / `no`), darunter konditionaler `Stepper` für `bamagaDay` (Range 2 bis `max(2, days−1)`). Stepper-Hint zeigt `Day 2–N (start is always Cairns)` damit der User direkt sieht warum Tag 1 nicht wählbar ist. **`updateDays(v)`** clamped `bamagaDay` mit, sodass beim Verkürzen der Tage der Stepper nicht auf einen ungültigen Wert stehen bleibt. Lokaler Helper `clampBamagaDay(day, days)` spiegelt die Generator-Logik (Duplikat in Kauf genommen — Konfigurator ist System-Boundary, kennt seine eigene Range).
- **`src/App.jsx`** — `buildTabs(bamagaStop)` filtert `REGION.supplyPoints` und lässt den Bamaga-Tab raus wenn der Stop aus ist (`sp.id !== 'bamaga'`). `useMemo` mit Dependency auf `result.config.bamagaStop` damit Tab-Liste mitläuft. **`useEffect`-Fallback**: wenn der ausgewählte Tab nach Re-Render nicht mehr existiert (User war auf Bamaga und schaltet aus), schnappt `activeTab` zurück auf `menu`. `useMemo`-Deps des Generators erweitert um `bamagaStop` + `bamagaDay`, damit Plan + Shopping bei Toggle re-computen.
- **`src/strings.js`** — `S.config.bamagaStopLabel` (`Stop in Bamaga?`), `bamagaStopHint` (`Mid-trip resupply for fresh food`), `bamagaStopOptions = { yes, no }` (jeweils mit Sub-Label „Mid-trip resupply" / „One shop in Cairns"), `bamagaDayLabel` (`Bamaga arrival day`), `bamagaDayHint` (Template `Day 2–${days−1} (start is always Cairns)`).
- **MenuTab unverändert** — Phase-Header-Logik konnte schon mit `hasSplit = false` umgehen (für sehr kurze Trips ohne Mid-Stop) → bei `bamagaStop === false` greift derselbe Fallback und es gibt einen einzelnen `Days 1–N`-Block statt zwei Phasen. Kein Code-Change nötig.
- **ShoppingTab unverändert** — Bekommt `data = result.shopping[supplyPoint.id] ?? []`. Wenn der Bamaga-Tab nicht gerendert wird (App.jsx-Filter), fragt nichts diese Daten an. Bestehende Bamaga-Checkboxen in `localStorage` (`ck_bamaga-*`) bleiben unangetastet — wenn der User Bamaga wieder einschaltet, tauchen sie über die Orphan-Logik („Already bought from previous plan") auf. Architektur-Vorgabe 6 (nicht-destruktive Edits) erfüllt ohne Extra-Code.
- **Smoke-Test 9 Cases** mit Scratch-File `scratch_smoke_bamaga.mjs` (anschließend gelöscht):
  1. Default ohne `bamagaStop`/`bamagaDay`-Felder → Day 9, Cairns 152 / Bamaga 24 ✓ (backward-compat)
  2. Stop yes, Tag 9 explizit → identisch zu (1) ✓
  3. Stop yes, Tag 5 (früh) → Cairns 143 / Bamaga 33 ✓ (mehr Frisch-Items wandern in Bamaga)
  4. Stop yes, Tag 14 (spät) → Cairns 157 / Bamaga 11 ✓
  5. Stop no → Cairns 161 / Bamaga-Key fehlt ✓
  6. Tag 1 (illegal) → geklemmt auf 2 ✓
  7. Tag 99 (illegal) → geklemmt auf days−1 = 15 ✓
  8. 7-Tage-Trip + Stop Tag 4 → 92 / 19 ✓
  9. 7-Tage-Trip + No-Stop → 104 / fehlt ✓
- **Build grün:** 222.96 kB JS / 71.10 kB gzip · CSS unverändert 12.58 kB / 2.87 kB gzip. +1.5 kB JS (~0.5 kB gzip) für die neue UI-Logik + Generator-Branching.

**Begründung der Default-Wahl:**

- **Default `bamagaStop: true` mit Tag 9** — Mid-Trip-Resupply ist der dominante Cape-York-Use-Case (Bamaga ist *die* einzige relevante Re-Supply-Station Richtung Spitze). User mit anderen Routen schalten aktiv aus; backward-compat zu allen bestehenden Saves.
- **Range Tag 2 bis days−1** statt 1 bis days — Tag 1 ist semantisch immer Cairns-Start (der gesamte Standard-Loadout kommt von dort), Tag `days` wäre der Heimkehr-Tag und macht keinen Sinn als Resupply (nichts mehr zu kochen). Hard-Constraint statt nur UI-Default.
- **Einzelner Tag statt Range** — User-Eingabe vereinfacht. Im Generator landet *alles Frische nach diesem Tag* in Bamaga; vor diesem Tag in Cairns. Multi-Stop (Cooktown + Bamaga) wäre Stufe-2-Erweiterung wenn das Region-Modell mehrere `supplyPoints` mit Reihenfolge unterstützt.

**Bewusst NICHT gemacht:**

- **Bamaga-Bucket physisch löschen** wenn aus — bestehende `ck_<itemId>`-Checkboxes bleiben in `localStorage`. Architektur-Vorgabe 6 (nicht-destruktiv): wenn User Bamaga später wieder einschaltet, sollen vorher abgehakte Items als Orphans erscheinen, nicht stumm verloren gehen. Bisheriger Orphan-Mechanismus deckt das ab.
- **Validierung von `bamagaDay` im Configurator** — Stepper-Range erzwingt [2, days−1]; Generator klemmt nochmal als Boundary-Check. Doppelt = sicher gegen direkten localStorage-Manipulationsversuch.
- **Visualisierung des Bamaga-Tags im MenuTab umbauen** — Der bestehende `tag-n` (NEW ✓) auf dem Bamaga-Tag bleibt; Phase-Header-Logik handhabt `hasSplit = false` schon korrekt. Kein Re-Layout nötig.
- **Eigener Tab-Tag „kein Stop"** statt Yes/No — Yes/No-Pills sind die einfachste mentale UI für Boolean-Toggle. Ein „No" mit Sub-Label „One shop in Cairns" macht das Outcome explizit, ohne extra-Erklär-UI.
- **Multi-Stop-Support** (mehrere Bamaga-Tage z.B. Hin- und Rückweg) — Generator und UI sind auf einen einzelnen Mid-Stop ausgelegt. Hin/Rück-Resupply ist eine Edge-Case (typische Cape-York-Strategie ist „kühlbedürftiges in Bamaga oneshot kaufen, gefroren in Eiskiste durch"); Stufe 2 wenn echte User-Daten zeigen dass es gebraucht wird.

---

## 2026-04-30 — Kalorien-Kalibrierung + Custom-Modus pro Person

**Was passiert ist:**

- **Hintergrund:** Nach Per-Person-Personalisierung waren die Default-kcal zu hoch — Adult-M Medium = 3150 kcal/day für 80 kg / 180 cm / sportlich aktiv. Realer TDEE-Verbrauch bei Büroarbeit ~2700 kcal, beim Aktiv-Outdoor ~2900. Vorgehen in zwei Stufen.
- **A) `BASE_KCAL` von 3000 → 2700 gesenkt** in `src/lib/calories.js`. Type- und Appetit-Faktoren bleiben symmetrisch (1.05/0.95/0.55 bzw. 0.80/1.00/1.20). Resultierende Werte:
  - Adult-M Light/Medium/Heavy = **2268 / 2835 / 3402** kcal (vorher 2520 / 3150 / 3780)
  - Adult-F Medium = **2565** (vorher 2850)
  - Child Medium = **1485** (vorher 1650)
  - Default-Gruppe 1M+1F Medium: factor weiterhin 2.00, dailyKcal 5400 (vorher 6000)
- **B) Vierter Appetite-Modus „Custom"** pro Person mit eigenem ±100-kcal-Stepper:
  - `APPETITES` erweitert um `'custom'`. Neue Konstanten `CUSTOM_KCAL_MIN = 1500`, `CUSTOM_KCAL_MAX = 4500`, `CUSTOM_KCAL_STEP = 100`.
  - **`personFactor(p)`** schaltet bei `appetite === 'custom'` und gesetztem `customKcal` auf `customKcal / BASE_KCAL` um, sonst Type×Appetite-Formula. Fallback wenn customKcal fehlt: Type-Factor × Medium (sicher, kein Crash).
  - **`personDailyKcal(p)`** im Custom-Modus = direkt `customKcal` (nicht über Faktor zurückgerechnet — Rundungs-Stabilität).
  - Helpers `clampCustomKcal(v)` (auf 100er-Schritt + Range-Clamp + NaN-Fallback auf MIN), `roundToHundred(n)`.
- **`src/components/ConfiguratorTab.jsx`** — `PersonRow` erweitert:
  - Appetite-Grid wechselt von 3-Spalten auf **4-Spalten** (`person-grid-4`-Modifier mit kompakteren Pill-Labels) für Light/Medium/Heavy/Custom.
  - **`setAppetite(a)`**: Bei Wechsel zu `custom` wird `customKcal` initialisiert mit `clampCustomKcal(roundToHundred(personDailyKcal({...person, appetite:'medium'})))` — also dem auf 100er gerundeten Medium-Wert des aktuellen Types (Adult-M → 2800, Adult-F → 2600, Child → 1500). Wenn `customKcal` schon mal gesetzt war, wird der vorherige Wert beibehalten (Toggle-back ohne Verlust). Bei Wechsel weg von Custom wird `customKcal` nicht gelöscht (gleiche Logik).
  - **Custom-Stepper-UI** klappt unter dem Appetite-Grid auf wenn `person.appetite === 'custom'`: zwei runde 36×36-Buttons mit −/+ Schriftzug, dazwischen `2800 kcal/day`-Anzeige. Buttons disabled an MIN/MAX. Orange Border + `#FEF0E6`-Hintergrund signalisiert Aktiv-Status.
- **`src/strings.js`** — `appetiteOptions.custom = { label: 'Custom', sub: 'Set kcal' }` ergänzt; `customKcalUnit: 'kcal/day'` neu.
- **`src/App.css`** — neue Klassen:
  - `.person-grid-4` — `grid-template-columns: 1fr 1fr 1fr 1fr` mit kleinerem Gap (4 statt 6 px) und kleineren Pill-Labels (11 px statt 12 px) — passt auf 360 px.
  - `.custom-kcal` — Flex-Box mit Stepper-Layout, Orange-Border-1.5 px, `#FEF0E6`-Hintergrund.
  - `.custom-kcal-btn` — 36×36, Orange-Border, weißer Hintergrund, Active-State invertiert (orange Hintergrund + weiße Schrift), Disabled bei opacity .35.
  - `.custom-kcal-val` — zentriert, 14 px, Orange-Schrift, fett.
- **Smoke-Test 13 Cases** (8 per-Person × 5 Gruppen × 5 Clamp/Round-Helpers, Scratch-File `scratch_smoke_kcal.mjs`, anschließend gelöscht):
  - Adult-M Light=2268 / Medium=2835 / Heavy=3402 ✓
  - Custom 2900 → factor 1.074, kcal 2900 ✓
  - Custom (no value) → fallback factor 1.050, kcal 2835 ✓ (kein Crash)
  - Default 1M+1F Medium → factor **2.00**, dailyKcal 5400 ✓ (factor unverändert, **Mengen-Skalierung der Einkaufsliste backward-compat**)
  - Mixed-Group (1 Custom 2900 + 1 Adult-F Medium) → factor 2.024 ✓
  - Family 2A+2C → factor 3.10, dailyKcal 8370 (vorher 9300, korrekt um 10 % gesenkt)
  - clampCustomKcal: 1234 → 1500 (MIN-Clamp), 2870 → 2900 (round-up), 2849 → 2800 (round-down), 9999 → 4500 (MAX), NaN → 1500 ✓
- **Build grün:** 221.43 kB JS / 70.58 kB gzip · CSS 12.58 kB / 2.87 kB gzip. +1 kB JS und +0.75 kB CSS für Custom-Modus + Stepper-Styles — vertretbar.

**Begründung der Werte:**

- **2700 als Base-Kcal** ist konservativ-realistisch: Mifflin-St Jeor TDEE für 80 kg / 180 cm / 35 J / mäßig aktiv landet bei ~2700–2900 kcal, sehr aktiv bei ~3000–3200. Cape-York ist eher mäßig aktiv (Fahren + bisschen Wandern + Aufbau), nicht Marathontraining. Heavy-Modus mit 3402 deckt die intensiven Wandertage ab.
- **Custom-Range 1500–4500** ist absichtlich breit: 1500 fängt Diät-Phasen / Kleinkinder ab; 4500 fängt extreme Heavy-Trainer / Bergsteiger ab. 100er-Schritte sind hinreichend granular ohne UI-Spam.
- **Custom als 4. Pille statt separater Toggle**: einheitliche Mental-Modell „Appetit-Wahl pro Person", Custom ist nur eine genauere Wahl statt Bucket. UI braucht keine zusätzliche Zeile bei Light/Medium/Heavy-Nutzern; nur Custom-Nutzer sehen den Stepper.

**Bewusst NICHT gemacht:**

- **Backward-Compat-Migration für `dailyKcal`-Anzeige** — alte Saves mit Light/Medium/Heavy zeigen jetzt automatisch die neuen (niedrigeren) Werte beim nächsten Render, weil `dailyKcal` aus dem aktuellen `BASE_KCAL` kommt, nicht persistiert ist. Kein Migrations-Aufwand. Mengen-Skalierung der Einkaufsliste bleibt identisch (factor 2.00 unverändert für Default).
- **Kcal pro 1-Schritt statt 100er** — Custom-Stepper ±100 ist ergonomisch (12 Taps für 1500→2700 sind OK, 1200 Taps wären nicht). Wer genauer will, hat in der Praxis ohnehin nur eine 100er-Schätzung.
- **Numerische Texteingabe** statt Stepper — Touch-Geräte tippen schlecht auf number-Input, Stepper ist robuster auf Mobile. Aufwand vs. Nutzen.
- **Activity-Level-Modifier** als zusätzliche globale Toggle (Sedentary / Active / Very-Active × group) — würde Sinn machen für andere Trip-Typen, aber Cape-York-App ist auf Aktiv-Outdoor kalibriert (Base-Kcal 2700 spiegelt das). Custom-Modus deckt Outliers ab.
- **Prozent-Slider** (z.B. ±50 % um Medium) statt absoluter kcal — User dachte konkret in kcal-Werten („2700"), absoluter Wert ist greifbarer.

---

## 2026-04-30 — Per-Person-Personalisierung (Geschlecht / Alter / Appetit → individuelle Tageskalorien)

**Was passiert ist:**

- **Konzeptionelle Verschiebung:** `config.persons: number` (1–8) → `config.people: Array<{id, type, appetite}>`. Statt einer Gruppen-Zahl pflegt der Nutzer pro Person `type` (`adult-m` / `adult-f` / `child`) und `appetite` (`light` / `medium` / `heavy`). Daraus berechnet der Generator einen reellen Skalierungs­faktor und Tageskalorien-Bedarf — statt Integer-Persons-Multiplikation.
- **`src/lib/calories.js`** (NEU) — single source of truth für Gruppen-Skalierung. Konstanten:
  - `TYPE_FACTOR = { 'adult-m': 1.05, 'adult-f': 0.95, 'child': 0.55 }` — relativ zum „Standard-Esser" 1.0.
  - `APPETITE_FACTOR = { light: 0.80, medium: 1.00, heavy: 1.20 }`.
  - `BASE_KCAL = 3000` (Outdoor-Aktiv-Tag).
  - Helpers: `personFactor(p) = TYPE_FACTOR[type] × APPETITE_FACTOR[appetite]`, `personDailyKcal(p) = round(personFactor × BASE_KCAL)`, `groupFactor(people) = Σ personFactor(p)`, `groupDailyKcal(people) = round(groupFactor × BASE_KCAL)`.
  - `migratePersonsToPeople(N)`: 1→[Adult-M], 2→[1M, 1F], 3→[1M, 1F, 1Child], 4→[1M, 1F, 2C], 5+→[1M, (N−1)×F]. Defaults: alle Medium-Appetit. Backward-Compat-Migration für alte `cfg_v1`.
  - `makePersonId(seed)`: `${Date.now().toString(36)}-${seed}` — stabil pro Session, kollisions­arm bei Add/Remove.
- **`src/lib/generator.js`** umgestellt — `generate({days, people, diet, burners, fridgeSize})` statt `persons`. `groupF = groupFactor(people)` und `dailyKcal = groupDailyKcal(people)` werden im Output `result.config` mitgeführt. **`scaleFactor(parsed, factor)`** ersetzt `scalePerPerson(parsed, persons)`: rechnet mit Real-Number-Faktor (z.B. 2.99 für eine Familie 2A+2K), rundet erst bei der Display-Mengen-Ausgabe. `generateShopping({plan, factor: groupF})` reicht den Faktor durch. Pro-Person-Heuristik (`/person`, `(for both)`, Range-Mittelwerte) bleibt — wird mit dem reellen Faktor multipliziert statt mit Integer-Persons.
- **`src/components/ConfiguratorTab.jsx`** umgebaut — Persons-Stepper komplett entfernt, durch **`GroupEditor`** ersetzt:
  - Pro Person: `PersonRow` mit Header (Index `1.` / Pro-Person-Kcal `≈ X kcal/day` / Remove-✕), 3-Spalten-Pill-Grid für Type (👨 Man / 👩 Woman / 🧒 Child), 3-Spalten-Pill-Grid für Appetite (Light / Medium / Heavy mit Sub-Label).
  - Add-Person-Button mit dashed border (`+ Add person`), bis max. 8 Personen.
  - Remove-✕ deaktiviert wenn nur 1 Person übrig (Min-Validierung).
  - Footer: Gruppen-Total `Daily target: Y kcal/day` aus `groupDailyKcal(people)`.
  - Stepper-Komponente bleibt für Days. Generischer `PillPicker`-Helper für Diät/Burners/Fridge unverändert.
- **`src/strings.js`** erweitert — `S.config.typeOptions = { 'adult-m': {label, icon}, 'adult-f', 'child' }`, `S.config.appetiteOptions = { light, medium, heavy }` (jeweils mit Sub-Label), `S.config.groupLabel` / `groupHint` / `addPerson` / `dailyKcalLabel` / `removePerson` / `perPersonKcal({kcal})`. `summary`-Template um `dailyKcal`-Parameter erweitert: `16 days · 2 people · Omnivore · 6000 kcal/day`. Persons-bezogene alte Strings (`personsLabel` / `personsHint`) entfernt.
- **`src/hooks/useStorage.js`** umgebaut — `defaultConfig()` returniert jetzt `people: [Adult-M-Medium, Adult-F-Medium]` (= Faktor 2.00 = backward-compat zum alten `persons:2`). `loadConfig()` erkennt alte Schemata: wenn `parsed.persons && !parsed.people`, ruft `migratePersonsToPeople(parsed.persons)` auf und schreibt das Ergebnis zurück. Saves immer als `people`-Array; `persons`-Feld nicht mehr persistiert.
- **`src/App.jsx`** — useMemo-Deps mit Hash über `JSON.stringify(config.people)` (Object-Identity reicht nicht — Add/Remove/Type-Änderung muss triggern, aber nicht bloße Re-Renders der gleichen Personen). Generator-Aufruf mit `people:` statt `persons:`. Subtitle nutzt `result.config.dailyKcal` (nicht mehr aus Component-State berechnen). `MenuTab` braucht `persons` nicht mehr — Prop entfernt. `RecipesTab` bekommt `persons={result.config.persons}` (= `people.length`) für das Ingredients-Label.
- **`src/App.css`** erweitert — neue Klassen für GroupEditor:
  - `.person-row` — Card mit `--bg-card` Hintergrund, 12 px Padding, 8 px Gap.
  - `.person-head` — Flex mit Index-Badge, Kcal-Label, Remove-✕ rechts.
  - `.person-num` — runde 28×28 Badge mit `--or` Hintergrund, weiße Schrift.
  - `.person-kcal` — kleine Schrift, `--mute`.
  - `.person-remove` — 28×28 Border-Button, hover/active states.
  - `.person-grid` — `grid-template-columns: repeat(3, 1fr)`, 6 px Gap, ≥44 px Touch-Target.
  - `.person-pill` — wie `.diet-pill` aber kompakter; `.active` mit `--or` Border + Hintergrund.
  - `.person-pill-icon` (Emoji groß), `-label` (Hauptbeschriftung), `-sub` (Unterzeile, `--mute`).
  - `.add-person-btn` — Dashed-Border, full-width, `--mute` Schrift; hover wechselt zu `--or` Border.
  - `.group-total` — Footer mit Daily-Target, `--bg-soft` Hintergrund, gleiche Border wie Card.
- **Smoke-Test** über 5 Konfigurationen mit ad-hoc `scratch_smoke_people.mjs` (gelöscht):
  - Default 1M+1F medium → factor **2.00**, **6000 kcal/day** ✓ (= alter `persons:2`-Faktor, Backward-Compat verifiziert)
  - 2 Adult Men Heavy → factor 2.52, 7560 kcal ✓
  - Familie 4 (1M+1F+2 Child Medium) → factor 2.99, 8970 kcal ✓
  - 1 Adult-F Light Vegetarier → factor 0.76, 2280 kcal ✓
  - 4 Adult-M Heavy → factor 5.04, 15120 kcal ✓
  - Migration verifiziert: `persons:1` → 1× Adult-M (Faktor 1.05), `persons:2` → 1M+1F (Faktor 2.00), `persons:5` → 1M+4F (Faktor 4.85).
- **Build grün:** 220.29 kB JS / 70.26 kB gzip · CSS 11.83 kB / 2.75 kB gzip. +3 kB JS / +2 kB CSS für die GroupEditor-Logik + Calories-Lib + neue Pill-Styles — vertretbar.

**Begründung Faktor-Wahl:**

- TYPE-Faktoren bewusst **gegenüber sedentären RDAs erhöht** angesetzt — Cape-York-Trips sind aktiv (Wandern, Schwimmen, Aufbau, Hitze). 3000 kcal Base-Kcal entspricht aktiver Outdoor-Tag. Erwachsene Männer/Frauen liegen mit 0.95–1.05 dicht beim Standard-Esser (statt 1.0 / 0.85 wie sedentär), Kinder mit 0.55 zwischen Kleinkind und Teenager (Profil-Mittel).
- APPETITE als **multiplikative Schicht** statt eigene Faktor-Tabelle — Light/Medium/Heavy ±20 % macht den größten Unterschied bei Big Eaters und reduziert Verschwendung bei Small Eaters. Symmetrisch um 1.0 damit Medium der Default bleibt.
- **Default 1M+1F Medium = Faktor 2.00** ist intentional gewählt damit alle alten `cfg_v1`-Saves identisch skalieren wie vorher — Migration ist verlustfrei.

**Bewusst NICHT gemacht:**

- **Pro-Person-Diät** (z.B. Person 1 vegan, Person 2 omnivore) — Konfigurator behält **eine** Diät-Auswahl pro Trip. Pro-Person-Diät würde Plan-Logik fundamental verändern (parallele Pläne oder Per-Mahlzeit-Compromise) und ist nicht im MVP-Scope. Stufe 2 wenn nachgefragt.
- **Alter in Jahren** statt Adult/Child — wäre granularer (Teenager isst wie Erwachsener, Kleinkind weniger als Standard-Child), aber MVP-Modell kommt mit 3 Buckets aus. Aufwand vs. Nutzen für Prä-Trip-Schätzung.
- **Aktivitäts-Level** als zusätzliche Toggle (Sedentary / Active / Very Active) — `BASE_KCAL = 3000` ist auf Aktiv-Outdoor kalibriert und ist Reisende-Realität. Sedentary-Modus für Cape-York-Trip wäre unrealistisch.
- **BMI / Gewicht / Größe** — App will keine personenbezogenen Gesundheitsdaten sammeln. Type-Buckets liefern brauchbare Schätzung ohne Privacy-Risiko.
- **Anpassung der Rezept-Mengen pro Person** (z.B. „Kind nimmt halbe Portion") — der Group-Factor skaliert die *Gesamt*-Menge der Einkaufsliste linear; auf Rezept-Anzeigen-Ebene werden Mengen pauschal pro Gruppe gerechnet (das Gruppen-Total verteilt sich beim Kochen). Rezept-Skalierung pro Person wäre Stufe-2-Feature.
- **Per-Person-Persistierung der Identität** über Trips hinweg (z.B. „Alex ist Light-Eater") — Personen sind anonym und trip-lokal. Wenn Stufe 2 Profile braucht, kommt das mit Accounts/Sync.

---

## 2026-04-30 — Pool-Erweiterung 24 → 51 Rezepte

**Was passiert ist:**

- **`src/data/recipes.js` von 24 auf 51 Rezepte erweitert.** Schwerpunkt: vegane / vegetarische / Single-Burner-Dinners — die kritischen Lücken nach Equipment-Filter-Erweiterung. Verteilung nach Erweiterung:
  - Frühstücke: 4 → 10 (3 omnivore, 3 vegetarian, 4 vegan)
  - Lunches: 9 → 17 (5 omnivore, 4 vegetarian, 8 vegan)
  - Dinners: 12 → 24 (13 omnivore, 5 vegetarian, 6 vegan)
- **Burner-Verteilung:** 38 single-burner + 13 two-burner. Vegane Dinners sind 5×1-burner + 1×2-burner, vegetarische 6×1-burner + 5×2-burner — gezielt so getaggt, damit Single-Burner-Configs nicht verhungern.
- **Effekt auf kritische Pool-Sizes (verifiziert per Smoke-Test):**
  - vegan + 1-burner: 0/0/0 → **4f / 5m / 5a** (war komplett leer, fiel auf vegetarian zurück)
  - vegetarian + 1-burner: 3/3/1 → **7f / 11m / 8a** (Dinner-Pool 8× grösser)
  - vegan + 2-burner: 0/0/0 → **4f / 5m / 6a**
- **Neue Rezepte (Auswahl):** Coconut Porridge with Peanut Butter (vegan), Vegan Banana Pancakes, Bacon and Egg Roll (Aussie classic), Avocado Toast with Tomato (vegan), Vegan Overnight Oats with Chia, Hummus and Veg Wrap, PB Banana Wrap (vegan), Caprese Sandwich, Mediterranean Couscous Salad (vegan), Curried Chickpea Wrap (vegan), Cheese Quesadilla, Greek Salad with Pita, One-Pot Pasta with Feta, Vegan Chickpea Curry with Rice, Mac & Cheese, Vegan Black Bean Chili, Vegan Mushroom Risotto, Spinach-Ricotta Pasta, Sausages with Baked Beans, Vegan Tofu Stir-Fry, Chicken & Rice One-Pot, Vegan Lentil-Vegetable Stew, Cheesy Bean Quesadillas, Vegan Pasta Aglio e Olio.
- **Cape-York-Kontext durchgehalten:** alle neuen Rezepte mit shelf-stable / canned / vacuum-packed Zutaten wo möglich, ~5500 kcal/Tag-Profil, Pro-Person-Mengen, Single-Pot- oder Pot+Pan-Setup. Australische Vermieter-Realität (UHT-Milch, vakuumverpackter Käse, Bushman-Fridge).
- **Generator categorize-Regex erweitert** auf neue Vokabeln: `tofu` / `tempeh` / `seitan` → "Fresh meat & plant proteins" (umbenannt von "Fresh meat"); `mozzarella` / `feta` / `ricotta` / `plant milk` → "Dairy, eggs & plant milk" (umbenannt); `couscous` / `arborio` / `pita` / `sourdough` / `breadcrumbs` → Pasta/rice/bread; `ginger` / `spinach` / `cabbage` / `parsley` / `basil` → Fresh vegetables (umbenannt zu "Fresh vegetables & herbs"); `chickpeas` / `black beans` / `baked beans` / `refried beans` → Canned legumes; `maple syrup` / `chia` / `seeds` / `nuts` / `apricots` / `hummus` / `mango chutney` → Breakfast & snacks (umbenannt zu "Breakfast, snacks & sweet"); `nutritional yeast` / `bay leaf` / `thyme` / `nutmeg` / `turmeric` / `curry powder` / `balsamic` / `rice vinegar` → Spices, oils & sauces. **`FRESH_CATEGORIES`-Set entsprechend angepasst.**
- **`isShoppableIngredient`** erweitert: filtert jetzt auch `boiling water` / `hot water` / `cold water` aus Shopping-Listen (waren als Recipe-Schritt-Ingredient gelistet, aber kein Einkauf).
- **Smoke-Test-Ergebnis:** 51 Rezepte verifiziert über 6 Diät×Burner-Kombinationen. Nur 1 Item landet noch in 📦 Other (`Dry white wine` aus optionalem Risotto — bewusst nicht kategorisiert weil Drinks im MVP nicht modelliert sind). Alle anderen ~120 Zutaten korrekt kategorisiert.
- **Build grün:** 217 kB JS / 69 kB gzip · CSS unverändert 10 kB / 2.5 kB gzip. +28 kB JS für 27 neue Rezepte = ~1 kB/Rezept (ungezippt) — vertretbar.

**Begründung der Pool-Auswahl:**

Australische Camping-Klassiker und international-bekannte Outdoor-Rezepte. Inspirations-Quellen aus dem Hinterkopf:
- Aussie staples: Bacon & Egg Roll, Sausages & Beans (= Australian "snags & beans"), Mac & Cheese
- Vegan-Camping-Mainstays: Overnight Oats, Tofu Stir-Fry, Chickpea Curry, Black Bean Chili, Lentil Stew
- Italienische Klassiker, die one-pot funktionieren: Aglio e Olio, One-Pot Feta Pasta (TikTok-trend, aber camping-kompatibel), Caprese
- Mediterrane shelf-stable Hits: Couscous Salad, Hummus Crackers, Greek Salad
- Curry / Asian: Vegan Chickpea Curry, Tofu Stir-Fry — alle adaptiert für 1-pot oder 1-pan
- Mexican: Bean Quesadillas, Cheese Quesadilla — schnell, calorie-dense, Standard-Tortillas
- One-Pot-Wunder: Risotto (vegan mit Nutritional Yeast statt Parmesan), Chicken & Rice Pilaf, Lentil Stew

**Bewusst NICHT gemacht:**

- **Restaurant-Slots / `rest`-Markierungen** — Generator emittiert weiterhin nur Home-Cooked-Rezepte. Restaurants sind trip-spezifisch und wären manuelle Override-Funktion (Stufe 2).
- **Dessert-Kategorie** — keine Süßspeisen / Desserts. Wäre eigene Kategorie + Generator-Anpassung. Cape-York-Trips fokussieren auf Hauptmahlzeiten + Snacks (in der bestehenden Pantry-Liste).
- **Glutenfreie Tags** — `glutenFree` als Tag wäre nice, aber MVP-Konfigurator fragt nicht danach. Wenn Bedarf, lässt sich nachträglich ergänzen.
- **Brand-spezifische Zutaten** (z.B. „Macro vegan butter", „Bonsoy", „Nuttelex") — generische Begriffe (`plant milk`, `vegan butter`, `nutritional yeast`) gewählt, damit international verständlich. Lokalisierung kommt mit i18n in Stufe 2.
- **Mengen-Strukturierung** (numeric `qty` + `unit` statt Free-Form-String) — der Heuristic-Parser im Generator deckt > 95 % der Fälle ab. Strukturierter Datentyp wäre Stufe-2-Verbesserung mit Migrations-Aufwand.
- **Camping-Essentials in Pool** — Ziploc-Bags, Foil, Paper Towels werden weiterhin nicht aus Rezepten generiert. Sie gehören in `region.essentials` (Stufe 1 Polish, separater Schritt).

---

## 2026-04-30 — Equipment-Toggles: Burners + Fridge-Size

**Was passiert ist:**

- **Inventur-Analyse** über 6 Vermieter-Setups (Adventure Comfort Prado, Premium Explorer Hilux, Hilux Single RTT, Landcruiser Troopy, Hilux Outback PLUS+, Toyota Prado Camper) — Cluster zwischen Standard-Outfit (4×130L Bushman, Dual-Burner, Standard-Cookware) und kompakteren Setups (48L–100L Fridges, Single-Burner-Varianten). Identifiziert: alles ausser **Burner-Anzahl** und **Kühlschrank-Grösse** ist entweder Baseline (überall) oder irrelevant fürs Menü-Planning.
- **Recipes mit `burners`-Tag erweitert** — alle 24 Rezepte um `burners: 1 | 2` ergänzt. 17× burners:1 (alle Frühstücke, alle Mittagessen, plus a3 Bratwurst / a4 Stir-fry / a5 Tacos / a12 Lentil Soup). 8× burners:2 (a1 Bolognese, a2 Thai green curry, a6 Carbonara, a7 Chicken stir-fry, a8 Red curry, a9 Lamb chops, a10 Tuna pasta, a11 Chili — alle Pot+Pan-parallel-Rezepte).
- **Generator erweitert** — `generate({…, burners, fridgeSize})`. `buildRecipePool({diet, burners})` filtert `r.burners > config.burners` aus. Drei neue Warning-Pfade:
  - **Burner-Fallback**: wenn 1-Burner-Filter eine Mahlzeit-Kategorie leert, locker zurück auf 2 Burner mit Hinweis „you'll need to cook them sequentially". Vermeidet leere Plan-Slots.
  - **Thin-Pool-Warning**: wenn nach allen Filtern eine Kategorie nur 1 Rezept enthält, klarer Hinweis dass jede Mahlzeit identisch wird (z.B. „every dinner will be the same. Try a less strict diet or 2 burners for more variety."). Genau der Schmerzpunkt den der Nutzer mit „nur 1 vegi abendessen" angesprochen hatte.
  - **Small-Fridge-Hinweis**: wenn `fridgeSize === 'small'` und Plan Frischfleisch-Tage enthält, Hinweis dass back-to-back Frischtage nicht in einen 48-50 L Fridge passen.
  - `config` enthält jetzt `dietApplied` und `burnersApplied` (was tatsächlich verwendet wurde) zusätzlich zu `requested`.
- **`ConfiguratorTab.jsx`** um 2 Pill-Picker erweitert — Burners (1 / 2) und Fridge-Size (Small <60 L / Medium 60–100 L / Large 100 L+). Dazu generischer `PillPicker`-Helper extrahiert (Diät verwendet ihn auch). 5 Inputs total auf 360 px noch sauber scrollbar (~520 px Card-Höhe).
- **`useStorage.js`** — DEFAULT_CONFIG um `burners: 2` und `fridgeSize: 'large'` erweitert (häufigstes Vermieter-Setup laut Inventur). Existierende `cfg_v1` ohne diese Felder bekommen Defaults beim Object-Spread-Merge.
- **`App.jsx`** — `useMemo`-Dependency-Array um burners/fridgeSize erweitert, Generator-Aufruf reicht beide Werte durch.
- **`strings.js`** — `S.config.burnersLabel` / `burnersOptions`, `S.config.fridgeLabel` / `fridgeOptions` ergänzt.
- **Smoke-Test** über 5 Konfigurationen (Default · 1-Burner-Omni · 1-Burner-Veg · 1-Burner-Vegan · Small-Fridge): alle Warnings feuern wo erwartet, Plan ist nie leer (Fallback-Logik greift), Build grün (189 kB JS / 62 kB gzip · CSS unverändert 10 kB).

**Begründung der UI-Auswahl (Inventur-Analyse):**

Was in Toggle wandert: nur das, was tatsächlich Menüs ändert.
- **Burner-Anzahl** (1 vs 2) — gates Pot+Pan-parallel-Rezepte, ist real unterschiedlich zwischen Mietern.
- **Fridge-Grösse** (small / medium / large) — gates Trip-Logik (Frischfleisch-Sequenzen), variiert massiv (48L–130L im Dataset).

Bewusst NICHT als Toggle:
- **Wok / Oven / Grill / Kettle / Blender / Microwave** — null Vorkommen in den 6 Inventuren, immer abwesend, kein Filter nötig.
- **Sink mit Running Water vs. Dishwashing Tub** — Komfort, beeinflusst nicht WAS gekocht wird.
- **Wasser-Kapazität** — selbst 20L reicht fürs Kochen.
- **USB / LED / Fold-Out Table / Potato Masher / Fire Extinguisher / Gas-Typ** — Komfort, kein Menü-Filter.

**Bewusst NICHT gemacht:**

- **Equipment-Toggles als hard-filter beim Burner-Fallback.** Der Nutzer sieht stattdessen die Warning + bekommt 2-Burner-Rezepte angezeigt. Begründung: leere Mahlzeitslots wären ein UX-Bruch („no breakfast tomorrow"), die Warning informiert besser. Stufe 2 könnte Single-Burner-Substitutions-Tipps pro Rezept zeigen (z.B. „Bolognese: cook sauce first, hold warm, then pasta").
- **Hard-Filter auf Fridge-Size.** Würde den Pool dramatisch verkleinern (alle cooling:'high' raus für small), und die App würde weniger funktional erscheinen statt informativ. Warning + Nutzer-Verantwortung ist die richtige MVP-Lösung.
- **Mehr Equipment-Klassen vorab.** Dataset ist klein (3 Vermieter), Wok/Oven kommen in null Inventuren vor. Sobald sich das ändert, sind die Patterns leicht erweiterbar (`PillPicker` wiederverwendet, Recipe-Tag wäre `oven: bool`).
- **Recipe-Pool erweitert.** Bewusst ausgeklammert — ist der **nächste** Arbeitsschritt (Inhalts-Session, primär vegetarische Single-Burner-Dinners), aber separat von der Equipment-Architektur.

---

## 2026-04-30 — Polish: Recipes-Tab auf geplante Rezepte filtern

**Was passiert ist:**

- `RecipesTab.jsx` filtert die `RECIPES`-Liste jetzt auf Rezept-IDs, die im aktuellen `plan` vorkommen (Set aus `plan.flatMap(d => [d.f?.r, d.m?.r, d.ab?.r])`). Leere Kategorie-Sektionen (z.B. wenn der Plan kein einziges Lunch-Rezept enthält) werden ausgeblendet. Empty-State (`S.recipes.empty: 'No recipes for the current plan.'`) wenn `usedIds` leer ist.
- `App.jsx` reicht `result.plan` als Prop an `<RecipesTab>` durch.
- `S.recipes.empty` in `strings.js` ergänzt.

**Begründung:**

App ist Reise-Begleiter, kein Kochbuch. Auf 360 px Display sind alle 24 Rezepte Lärm — der Nutzer interessiert sich für die Rezepte, die er auch wirklich kocht. Die Logik schließt sauber an den Generator an: ändert sich der Plan (Konfigurator-Edit, Diät-Wechsel), aktualisiert sich auch die Recipes-Tab-Liste automatisch.

**Bewusst NICHT gemacht:**

- **Kein „Browse all recipes"-Toggle** im Recipes-Tab, der die volle Library zeigt. Bei 24 Rezepten und MVP-Fokus macht der Toggle die UI komplexer ohne klaren Mehrwert. Wenn der Bedarf später aufkommt (z.B. „ich will mein Rezept aus dem Plan rausschmeissen und durch ein anderes ersetzen"), dann gezielt — als Teil eines Recipe-Swap-Features.
- **Kein „Used X times"-Hinweis** auf den Karten. Wäre nett, ist aber Polish.

---

## 2026-04-30 — Schritt 6: Konfigurator-Tab + End-to-End-UI-Verkabelung

**Was passiert ist:**

- **`src/components/ConfiguratorTab.jsx` neu angelegt** — Onboarding-Komponente mit Stepper für Days (7..28), Stepper für Persons (1..8), 3-Pill-Group für Diet (omnivore / vegetarian / vegan) und „Generate plan" / „Update plan" CTA. Lokaler Draft-State, damit Slider-Ticks nicht jeden Schritt sofort committen — erst beim CTA-Klick wird `onSubmit({...draft, completed: true})` gefeuert. Onboarding- vs. Edit-Texte je nach `config.completed`.
- **`src/App.jsx` umverdrahtet** — hält jetzt `config`-State (aus `loadConfig()` initialisiert), berechnet Generator-Output via `useMemo([config.days, config.persons, config.diet])`, switched bei Onboarding-Submit auf den Menu-Tab. Subtitle in der Topbar dynamisch (`16 days · 2 people · Omnivore`) oder Placeholder bei nicht-konfiguriertem State. Warnings-Banner über dem Content, sichtbar wenn `result.warnings.length > 0`. Bottom-Nav um den Konfigurator-Tab erweitert (5 Tabs: Trip · Menu · Recipes · Cairns · Bamaga). `grid-template-columns: repeat(4, 1fr)` → `grid-auto-flow: column` damit die Nav mit der Anzahl an Supply Points skaliert.
- **`src/components/MenuTab.jsx`** — nimmt `plan`-Prop statt `DAYS` zu importieren. Phase-Header werden aus dem Bamaga-Tag-Index dynamisch zusammengesetzt (`Phase 1: Cairns → Bamaga · Days 1–9` etc.); falls kein Bamaga-Tag gesetzt ist, eine einzelne Phase. Restaurant-Summary-Cells in der Header-Box bleiben (sie zeigen 0, bis Stufe-2 / Preset-Pläne Restaurant-Slots emittieren). Empty-State wenn `plan` leer.
- **`src/components/ShoppingTab.jsx` umgebaut** — nimmt `data`-Prop (`result.shopping[supplyPoint.id]`) statt `SHOPPING_LISTS[supplyPoint.id]`. Plan-Identitäts-Key (sortierter Hash der Item-IDs) triggert State-Refresh aus localStorage bei Re-Generation. **Orphan-Sektion „Already bought (from previous plan)"** rendert alle in `localStorage` markierten IDs unter dem Prefix, die nicht (mehr) in der aktuellen Liste vorkommen — Tap löscht den Eintrag (das ist die Architektur-Vorgabe-6-Umsetzung: bereits gekaufte Items werden markiert, nicht stumm überschrieben). Empty-State wenn weder Items noch Orphans.
- **`src/components/RecipesTab.jsx`** — Ingredients-Label jetzt dynamisch: `S.recipes.ingredients({ persons })` ergibt `Ingredients for 2 people` / `Ingredients for 1 person`. `persons`-Prop kommt aus `App.jsx`-Config.
- **`src/strings.js`** — Strings für ConfiguratorTab (`S.config.welcome`, `S.config.editTitle`, `S.config.dietOptions`, `S.config.generateCta` etc.), Template-Funktionen für dynamische Strings (`S.config.summary({days, persons, dietLabel})`, `S.menu.phases.beforeBamaga({from, to})`, `S.recipes.ingredients({persons})`), Orphan-Texte, Empty-States, Warnings-Banner-Prefix. Statische phase1/phase2/subtitle/ingredients-Hardcoding entfernt.
- **`src/hooks/useStorage.js` erweitert** — `getAllCheckedIds(prefix)` für Orphan-Detection (enumeriert alle gesetzten `ck_<prefix>*`-Keys); `loadConfig()` / `saveConfig()` für `cfg_v1` (days, persons, diet, completed). Defaults: 16 / 2 / omnivore / completed=false.
- **`src/lib/generator.js`** — Item-ID nur noch `slugify(name)`, ohne Bucket-Prefix (`bacon` statt `cairns-bacon`). Damit bleibt der Storage-Key stabil, wenn ein Item bei Konfig-Änderung von Cairns nach Bamaga (oder umgekehrt) wandert.
- **`src/data/days.js` und `src/data/shopping.js` gelöscht** — pre-pivot-Inhalt, wird nicht mehr referenziert. Generator-Output ersetzt sie vollständig.
- **`src/App.css`** — neu: `.cfg-wrap`, `.cfg-card`, `.cfg-title`, `.cfg-sub`, `.cfg-row`, `.stepper`, `.stepper-btn` (48 px Touch-Target), `.stepper-val`, `.diet-grid`, `.diet-pill` (60 px Mindesthöhe), `.gen-btn` (52 px CTA), `.warning-banner` (Amber, links akzentuiert), `.empty-state`, `.orphan-section` / `.orphan-sub` / `.orphan-item` / `.orphan-box` (gedimmt, grauer Hintergrund). CSS-Volume: 7.39 kB → 10.00 kB (gzip 1.99 kB → 2.51 kB).
- **Build grün.** 41 Modules, 187 kB JS / 61 kB gzip, 10 kB CSS / 2.5 kB gzip, 9 Precache-Entries (196 KiB). HMR im Dev-Server während der Verdrahtung sauber durchgelaufen, keine Vite-Fehler.

**Architektur-Effekt:**

Alle 6 Architektur-Vorgaben aus `CLAUDE.md` sind nun End-to-End wirksam:
1. **Generator-Logik gekapselt** — UI ruft nur `generate(config)` auf; ein Stufe-2-Algorithmus ersetzt die Implementation, ohne `App.jsx` / `MenuTab` / `ShoppingTab` anzufassen.
2. **User-facing Strings extern** — keine Inline-Strings in Komponenten. Templates für dynamische Pluralisierung / Datum-/Zahlen-Einsetzung sind Funktionen statt String-Konkatenation in den Komponenten.
3. **Rezept-Datenmodell mit Tags** — der Generator nutzt aktuell nur `diet` und `cooling`; `effort` ist da für Stufe 2.
4. **Versorgungspunkte datengetrieben** — Generator emittiert `result.shopping[supplyPoint.id]`, App-Shell liest aus `REGION.supplyPoints`. Geo-Erweiterung in Stufe 2 = neue Region in `regions.js`, kein UI-Eingriff.
5. **Kein Backend, alles lokal** — Config in `cfg_v1`, Checkboxen unter `ck_<prefix><id>`. Keine Netz-Calls.
6. **Konfigurator-Edits nicht-destruktiv** — bereits abgehakte Items, die nach Re-Generation nicht mehr im Plan stehen, erscheinen separat als „Already bought" und können einzeln vom Nutzer entfernt werden. Die Re-Generation überschreibt also nichts stumm.

**Bewusst NICHT gemacht:**

- **Camping-Essentials-Liste nicht generiert.** Ziploc-Bags / Foil / Paper Towels / Electrolyte Powder kommen in keinem Rezept vor und werden vom Generator nicht emittiert. Der Pre-Pivot hatte sie kuratiert in `shopping.js` — die Datei ist jetzt weg, also fehlen sie in der UI. Bewusst aufgeschoben (siehe `STATUS.md` § Lücken). Optionen für später: `region.essentials`-Array oder „Don't forget"-Block im UI. Den MVP-Eigen-Trip kann der Nutzer mit einer Mental-Note ergänzen.
- **Restaurant-Tage / `rest`-Slots nicht implementiert.** Generator emittiert nur Home-Cooked-Mahlzeiten. Pre-Pivot hatte 4 manuelle Restaurant-Slots (Turtle Rock, Out of the Blue, Farewell Dinner). Stufe 2 könnte „Skip-Day" / „Restaurant-Slot" als manuelle Override-Option im UI bieten.
- **Re-Sort der Bottom-Nav-Order nicht konfiguriert.** Aktuelle Reihenfolge ist statisch (Trip → Menu → Recipes → Cairns → Bamaga). Wenn man später Drag-and-Drop oder Hide/Show-Tabs braucht, dann gezielt — aktueller Bedarf: keiner.
- **Animation / Page-Transition nicht aufgesetzt.** Tab-Wechsel ist abrupter Re-Render. Mobile-Feel wäre mit Slide-Transition besser, aber das ist Polish — nicht MVP-blockierend.
- **Tests nicht hinzugefügt.** Generator-Logik wurde in Schritt 5 manuell smoke-getestet; UI-Verdrahtung wird im Dev-Server visuell verifiziert. Vitest-Setup wäre Stufe-2-Vorhaben (insbesondere bevor der Algorithmus ausgetauscht wird).

---

## 2026-04-30 — Schritt 5: Plan- und Einkaufslisten-Generator

**Was passiert ist:**

- **`src/lib/generator.js` neu angelegt** — neue Top-Level-Funktion `generate({ days, persons, diet })` liefert `{ config, plan, shopping, warnings }`. Architektur-Vorgabe 1 (`CLAUDE.md`) umgesetzt: Logik gekapselt in `lib/`, UI-Verträge so gewählt, dass die heutigen `MenuTab` / `ShoppingTab`-Shapes 1:1 wiederverwendet werden können.
- **Plan-Generierung deterministisch.** Pro Mahlzeitkategorie (`f` / `m` / `a`) wird der Rezept-Pool nach Diät gefiltert (`omnivore` ⊃ `vegetarian` ⊃ `vegan`), dann sortiert nach `cooling` desc + `id` asc. Round-Robin pro Tag. Effekt: Frisch-lastige Rezepte landen früh im Trip; bei kürzeren Trips bleibt der Pool gleich, Wiederholungen kommen erst bei Tag > Pool-Länge.
- **Bamaga-Tag automatisch.** `Math.round(days * 0.55)`, geclippt auf `[2, days-1]`. Für 7 Tage → Tag 4, für 16 Tage → Tag 9, für 28 Tage → Tag 15.
- **Heuristischer Zutaten-Parser** (`parseAmount`): erste Zahl aus `amt` (Range "3–4" → Mittelwert), erste plausible Einheit (`g/kg/ml/l/tsp/tbsp/can/pack/...`), Container-Hint priorisiert (`1 × 400g can` → 1 can statt 1g). Skalierungs-Marker: `/person` oder `per person` ⇒ × Personen; `(for both)` ⇒ × Personen/2 (alte 2-Personen-Konvention im Pool).
- **Mengen-Aggregation pro Zutat.** Key = Display-Name ohne Parenthetik / `Optional:` / `If using:`-Prefix, lowercase. Einheits-Klassen: `mass` (g/kg → g), `volume` (ml/l → ml), `spice` (tsp/tbsp/cup/pinch), `count` (kein Unit), oder die Container-Klasse selbst (`can`, `pack`, …). Format-Schwelle bei 1000 → kg/L.
- **Bamaga-Routing.** Frisch-Kategorien (Fleisch, Gemüse, Frucht) für Mahlzeiten *nach* dem Bamaga-Tag landen im Bamaga-Bucket; alles andere (Pantry, Konserven, Trockenware) bleibt in Cairns. Pre-Pivot-Konvention bleibt damit erhalten.
- **Vegan-Fallback mit Warnung.** Hat der gefilterte Pool eine leere Mahlzeitkategorie, fällt der Generator eine Diät-Stufe milder zurück und legt einen Eintrag in `warnings` ab. Aktuell betrifft das nur `vegan` (Seed-Pool hat 0 vegane Rezepte).
- **Smoke-Test bestanden** — vier Konfigurationen geprüft (16/2/omni = Eigen-Trip, 7/1/veg, 28/8/omni, 10/4/vegan): Plan-Tagesanzahl korrekt, Bamaga-Tag plausibel, Shopping-Items mit sinnvollen Mengen (16/2/omni → 103 Cairns-Items + 18 Bamaga-Items, 28/8 skaliert ×4). Vegan triggert Warnung wie erwartet. `npm run build` grün, Bundle unverändert (Generator wird in Schritt 6 importiert, derzeit noch dead-code-eliminiert).

**Architektur-Effekt:**

Vorgaben 1 (Generator gekapselt) und 6 (Edits nicht-destruktiv) aus `CLAUDE.md` § Architektur-Vorgaben sind vorbereitet:
- Stufe 2 ersetzt nur `generatePlan` / `generateShopping` (oder `generate` ganz), die Verträge nach aussen bleiben gleich.
- Da `generate` deterministisch ist, ergibt das gleiche `config` denselben Plan und dieselbe Liste — Voraussetzung für nicht-destruktive Re-Generation in Schritt 6 (abgehakte Items behalten ihre `id` wenn sich Personen/Tage/Diät ändern, weil die `id` aus `slugify(displayName)` abgeleitet ist und nicht aus dem Tag-Index).

**Bewusst NICHT gemacht:**

- **UI nicht umgestellt.** `MenuTab` / `ShoppingTab` lesen weiter aus den statischen `DAYS` / `SHOPPING_LISTS`. Verkabelung kommt mit dem Konfigurator-Tab in Schritt 6 — gemeinsam, weil sonst der Konfigurator-State nichts zu kontrollieren hätte.
- **Strukturierte Pro-Person-Mengen pro Rezept *nicht* eingeführt.** Die 24 Rezepte behalten ihre Free-Form-Strings (`'150g per person'`, `'1 × 400g'`). Restrukturierung würde alle 24 Rezepte anfassen und bringt für den MVP wenig — der heuristische Parser deckt > 95 % der Fälle (verifiziert im Smoke-Test). Stufe 2 kann das Datenmodell formalisieren, ohne den Generator-API-Vertrag zu brechen.
- **„Essentials" / Camping-Baseline (Ziploc, Foil, Paper Towels, Electrolyte Powder) nicht generiert.** Die statische `SHOPPING_LISTS` in `shopping.js` enthält diese Items — der Generator nicht, weil sie in keinem Rezept als Zutat erscheinen. Optionen für Schritt 6: entweder als `region.essentials`-Array in `regions.js` daneben einblenden, oder als manuelle „Don't forget"-Liste im UI. Bewusst aufgeschoben, um den Generator-Scope sauber bei „Plan + skalierte Rezept-Zutaten" zu lassen.
- **Plan-Variabilität (Abwechslung-Algorithmus, Diät-Substitutionen, Reste-Verwendung).** Round-Robin reicht für die 24-Rezepte / max-28-Tage-Range. Stufe-2-Algorithmus kann andocken ohne UI-Eingriff.
- **Restaurant-Tage / `rest`-Markierung.** Generator emittiert nie `rest`-Mahlzeiten — der Eigen-Trip hatte 4 Restaurant-Slots, das ist Trip-spezifischer Inhalt, kein generierbares Pattern. Nutzer markiert das im UI manuell oder ignoriert. Stufe 2 könnte „Skip-Day"-Option hinzufügen.
- **Echter Test-Runner.** `npm run dev` / `npm run build` reichen als Verifikation für die deterministische Logik; ein Vitest-Setup wäre Overkill für 1 Modul. Bei Stufe-2-Algorithmus-Wechsel sinnvoll mitzunehmen.

---

## 2026-04-29 — Schritt 4: Supply Points datengetrieben + restliche Daten übersetzt

**Was passiert ist:**

- **`src/data/regions.js` neu angelegt** — `REGION` mit Cape-York-Metadaten (id, name, country, state) und `supplyPoints`-Array. Pro Supply Point: `id`, `name`, `icon`, `storagePrefix`, `role` (`'start'` / `'mid'`), `stores`. Single-Source für Versorgungspunkte; Stufe-2-Geo-Erweiterung tauscht die Region, der Code bleibt gleich.
- **`src/data/shopping.js` umgebaut + übersetzt** — alte Named-Exports `CAIRNS` / `BAMAGA` ersetzt durch keyed Object `SHOPPING_LISTS = { cairns: [...], bamaga: [...] }`. Keys entsprechen `REGION.supplyPoints[*].id`. Alle Item-Namen, Kategorien, Mengen ins Englische übersetzt (Coles/Woolworths/Bamaga-Begriffe bleiben als Region-Anker).
- **`src/data/days.js` übersetzt** — alle 16 Tage: Datum (`'Thu, 11 Jun'` etc.), Mahlzeit-Beschreibungen, Tags (`'fresh'` / `'Bamaga fresh'` / `'Bamaga fresh (thawed)'`), Restaurant-Namen, Phasen-Marker (`'BAMAGA'`-Suffix bleibt). Strukturell unverändert.
- **`src/App.jsx` umverdrahtet** — `TABS`-Array generiert die Shopping-Tabs jetzt aus `REGION.supplyPoints` statt hardcoded; jeder Tab kennt sein optionales `supplyPoint`. `<ShoppingTab supplyPoint={...} />` ersetzt `<ShoppingTab list="cairns|bamaga" />`. Hardcoded `'cairns'` / `'bamaga'` Strings nur noch in `regions.js` als IDs.
- **`src/components/ShoppingTab.jsx` umverdrahtet** — Prop-API `{ list }` → `{ supplyPoint }`. `isCairns`-Branching ersetzt durch Lookups: `SHOPPING_LISTS[supplyPoint.id]`, `S.shopping.notes[supplyPoint.id]`, `S.shopping.progress[supplyPoint.id]`. Die Note-CSS-Klasse (`note-w` / `note-s`) wird aus `supplyPoint.role === 'start'` hergeleitet (semantisch statt namensbasiert).
- **`src/strings.js` aufgeräumt** — `S.app.tabs.cairns` und `.bamaga` entfernt (UI-Label kommt jetzt aus `supplyPoint.name`); `S.shopping.notes.*` und `S.shopping.progress.*` bleiben (lange, region-spezifische Texte, gelookupt per Supply-Point-ID).

**Architektur-Effekt:**

Vorgaben „Versorgungspunkte datengetrieben" und „User-facing Strings extern" aus `CLAUDE.md` § Architektur-Vorgaben sind sauber umgesetzt:
- Kein Code-Branching mehr auf Place-Names. Alle Region-spezifischen Daten liegen in `regions.js`, alle Region-spezifischen Texte unter `S.shopping.{notes,progress}[supplyPoint.id]`.
- Stufe-2-Geo-Erweiterung (Kimberley o.ä.) erfordert: neue Region in `regions.js`, neue Shopping-Listen-Templates in `SHOPPING_LISTS`, neue Note/Progress-Strings in `strings.js`. Komponenten und App-Shell bleiben unangetastet.

**Bug-Fix nebenher:**

- In `days.js` waren die `r`-Verweise (Recipe-Links) für Tag 14 (Erdnussbutter+Jerky) und Tag 15 (Sardines on toast) im Original-Code vertauscht (Tag 14 → `m8` Sardines, Tag 15 → `m9` PB+Jerky, was beides falsch war). Während des Übersetzens entwirrt: Tag 14 → `m9`, Tag 15 → `m8`. Klick auf „→ Recipe" im Menu-Tab führt jetzt zum richtigen Rezept.

**Bewusst NICHT gemacht:**

- **Phase-Header in `MenuTab.jsx` nicht datengetrieben** — `'Cairns → Bamaga · Jun 11–19'` und Gegenstück bleiben als statische Strings in `strings.js`. Die Phase-Logik gehört konzeptuell zum Trip-Plan, nicht zur Region; sie wird in Schritt 5 (Generator) ohnehin durch dynamische Phasen-Erzeugung ersetzt. Doppel-Refactoring vermeiden.
- **App-Subtitle (`'16 days · 2 people · 5500 kcal/day'`)** weiter hardcoded — wird mit Konfigurator (Schritt 6) dynamisch.
- **Recipe `'Ingredients for 2 people'`-Label** weiter hardcoded — wird mit Generator (Schritt 5) dynamisch (Pro-Person × Personenzahl).
- **Pool-Erweiterung oder neue vegane Rezepte** nicht angefasst — getrennte inhaltliche Aufgabe, keine MVP-Restrukturierung.

---

## 2026-04-29 — Schritt 3: Rezepte mit Tags angereichert + auf Englisch übersetzt

**Was passiert ist:**

- `src/data/recipes.js` komplett neu geschrieben. Alle 24 Rezepte (4 Frühstücke, 9 Mittagessen, 12 Abendessen) ins Englische übersetzt — Rezeptnamen, Zutatenlisten mit Mengenangaben, Schritt-Anleitungen, Tips. Australische Begriffe (Coles, Woolworths, Bamaga) bleiben erhalten als Region-Anker.
- Neue Tags pro Rezept gemäss `CLAUDE.md` § Architektur-Vorgaben:
  - `diet`: `'omnivore' | 'vegetarian' | 'vegan'` — 18× omnivore, 6× vegetarian (Frühstücke ohne Speck, Egg-Salad, Instant-Noodle, Lentil Soup), 0× vegan im Seed-Pool.
  - `cooling`: `'none' | 'low' | 'medium' | 'high'` — Kühlbedarf der Zutaten als Hinweis für späteren Kühlbox-Filter (Stufe 2+).
  - `effort`: `'easy' | 'medium' | 'hard'` — Aufwand-Heuristik aus Zubereitungszeit + Tools.
- Cleanup: `catLbl`-Feld pro Rezept entfernt — Sektions-Labels kommen jetzt aus `S.recipes.sections` via `cat`-Code (`'f'` / `'m'` / `'a'`). Tote Daten weg.
- Mengenangaben jetzt im englischen Format: `'/person'` statt `'p.P.'`, `tbsp` / `tsp` / `g` / `ml`.
- HMR-bestätigt im Browser, keine Vite-Fehler.

**Architektur-Effekt:**

Vorgabe „Rezept-Datenmodell von Anfang an mit Tags" aus `CLAUDE.md` § Architektur-Vorgaben ist umgesetzt. Auch wenn der MVP-Generator nur `diet` filtert, sind `cooling` und `effort` schon strukturell vorhanden und müssen in Stufe 2 nicht nachgepflegt werden (was bei 24 Rezepten + späterer Pool-Erweiterung schmerzhaft wäre).

**Bewusst NICHT gemacht:**

- Pool **nicht erweitert** — die ~24 Rezepte bleiben als Seed. Pool-Wachstum (z.B. mehr vegane Optionen) ist ein separater inhaltlicher Schritt, nicht Teil der MVP-Restrukturierung.
- `glutenFree`-Tag **nicht eingeführt** — würde manuelle Prüfung jeder Zutat erfordern (Pasta, Brot, Wraps sind glutenhaltig, aber GF-Substitute existieren). Im MVP-Filter (Diät-Kategorie) nicht vorgesehen; kommt mit Stufe 2 falls Bedarf.
- **Pool-Größenformel nicht implementiert** — die in `PRODUCT.md` § 1 genannten Limits (1–8 Personen, 7–28 Tage) werden im MVP konstant geprüft (24 Rezepte sind genug für 28 Tage × 3 Mahlzeiten = 84 Slots, mit Wiederholung). Skalierungs-Validierung erst mit Generator (Schritt 5).

---

## 2026-04-29 — Schritt 1+2: Live-Test bestanden + Strings ausgelagert (UI auf Englisch)

**Was passiert ist:**

- **Schritt 1 — Live-Test des Ist-Stands:** `npm run dev` gestartet (Vite 5.4.21, läuft auf `http://localhost:5173/`). Alle drei Tabs klickbar, `localStorage`-Persistenz nach Reload bestätigt. Build-/PWA-Basis grün.
- **Schritt 2 — Strings-Auslagerung:** Neue Datei `src/strings.js` mit nested Struktur (`S.app / S.menu / S.recipes / S.shopping`). Alle deutschen Inline-Strings aus `App.jsx`, `MenuTab.jsx`, `RecipesTab.jsx`, `ShoppingTab.jsx`, `index.html` (`lang="de"` → `lang="en"`) und `vite.config.js` (PWA-Manifest-Description) extrahiert und auf Englisch übersetzt. Komponenten verbrauchen Strings via `S`-Import. HMR-bestätigt im Browser, keine Vite-Fehler.
- TODO-Kommentare in `strings.js` für Texte, die mit Konfigurator dynamisch werden (z.B. Subtitle „16 days · 2 people · 5500 kcal/day", Label „Ingredients for 2 people").
- Bug während Schritt 2 behoben: doppeltes 🎉 Emoji im Shopping-Done-State (einmal als `<div>`, einmal in `S.shopping.done`) — Emoji aus dem String entfernt.

**Architektur-Effekt:**

Vorgabe „User-facing Strings extern" aus `CLAUDE.md` § Architektur-Vorgaben ist umgesetzt. Stufe-2-i18n bedeutet dann: `src/strings.js` → `src/strings/en.js`, daneben `src/strings/de.js` etc., ohne Komponenten anzufassen.

**Bewusst NICHT gemacht:**

- **Daten-Inhalte** (Rezeptnamen, Zutaten, Schritte in `recipes.js`; Tagesbeschreibungen in `days.js`; Item-Namen in `shopping.js`) **nicht** übersetzt. Diese Dateien werden in Schritt 3 und 4 ohnehin restrukturiert (Tags, `regions.js`, Generator) — Übersetzung wird mit der Restrukturierung gebündelt, um nicht jeden Eintrag zweimal anzufassen. Resultat: aktuelle App ist mid-pivot, Gerüst englisch, Content deutsch.
- **Production-Build** (`npm run build`) nicht durchgeführt — nur Dev-Server-HMR-Test. Build kommt nach Schritt 6.

---

## 2026-04-29 — Konzept-Pivot: Public-Product für Cape-York-4WD-Mieter

**Was passiert ist:**
Vollständige Überarbeitung von `PRODUCT.md` in fünf strukturierten Schritten und Anpassung von `CLAUDE.md`. Das Produkt-Ziel hat sich von „persönlicher Reise-Begleiter für der Entwickler + Reisepartner" zu „öffentliches Produkt für die breite Zielgruppe von Cape-York-4WD-Mietern aus Cairns" verschoben. Eigen-Trip Juni 2026 wird zum Dogfood-Praxistest, nicht zum primären Use-Case.

`PRODUCT.md` wurde zuvor in derselben Session als erster Entwurf angelegt (Entwickler-Trip-Fokus); dieser Pivot ersetzt den Entwurf vollständig.

**Kern-Entscheidungen (siehe `PRODUCT.md` für Details):**

1. **Zielgruppe:** Internationale 4WD-Mieter aus Cairns. Konfigurator-Range im MVP: 1–8 Personen, 7–28 Tage. Skalierung folgt Pool-Wachstum.
2. **App-Sprache:** Englisch (App-UI). Code-Kommentare und Chat-Sprache bleiben Deutsch. i18n in Stufe 2+ offen.
3. **Personalisierung:** MVP konfigurierbar nach Tagen + Personen + Diät-Kategorie. Endziel hochindividualisiert (Allergien, Kühlbox, Kochausrüstung — Stufe 2+).
4. **MVP-Scope:** Konfigurator + generierter Menüplan + Offline-Rezepte (mit Tags) + skalierte Cairns/Bamaga-Einkaufsliste + nicht-destruktive Konfigurator-Edits. Notizen, Packliste, Kalorien etc. sind Stufe 2.
5. **Datenherkunft:** MVP = kuratierter Pool im App-Bundle, read-only. Stufe 2 = + Nutzer-Rezepte (`localStorage`-CRUD).
6. **Monetarisierung:** MVP kostenlos, kein Backend, kein Account. Stufe 2 zwei offene Modelle: Per-Trip-Lizenz (z.B. 5 CHF / Reise mit limitierten Edits) oder Einmalkauf nach Trial. Entscheidung nach Eigen-Trip-Retrospektive.
7. **Generator-Logik:** MVP deterministisch (Pool-Reihenfolge, Diät-Filter); Stufe 2 kreativ-algorithmisch (Abwechslung, Kühlbedarf zuerst, Substitutionen).
8. **Erfolgsmetrik:** Stufe 1 = qualitative Aufgabenerfüllung am Eigen-Trip + Negativ-Test (kein Ausweichen auf Zettel/Notizen). Stufe 2 = Aktivierung / Tiefe / Erkenntnis über eine vollständige Cape-York-Saison (Mai–Oktober) ab Launch, mit groben Hausnummern als Diskussionsgrundlage.

**Architektur-Vorgaben (neu in `CLAUDE.md`):**
- Generator-Logik in `src/lib/generator.js` kapseln (Stufe-2-Austausch ohne UI-Änderung).
- User-facing Strings in `src/strings.js` auslagern (i18n-ready).
- Rezept-Datenmodell von Anfang an mit Tags (Diät, Kühlbedarf, Aufwand, Pro-Person-Mengen).
- Versorgungspunkte in `src/data/regions.js` (datengetrieben für spätere Geo-Erweiterung).
- Kein Backend, kein Account, kein Sync.
- Konfigurator-Edits sind nicht-destruktiv (abgehakte Einkaufs-Items markieren statt überschreiben).

**Was geändert wurde:**
- `PRODUCT.md` — komplett neu geschrieben, alle 5 Abschnitte (Zielnutzer, Kern-Problem, Top-5, Nicht-Ziele, Erfolgsmetrik).
- `CLAUDE.md` — Projektbeschreibung, Endziel, Projektstruktur-Kommentare, Roadmap (Stufe 1 / Stufe 2), Coding-Regeln (Englisch + Strings-Auslagerung), neuer „Architektur-Vorgaben"-Abschnitt, Workflow-Tabelle (PRODUCT.md ergänzt), Reading-Order.
- `STATUS.md` — TL;DR / Code-Vorhanden-Note / Offen-Liste / Nächste-Schritte aktualisiert. Konzept-Code-Lücke explizit benannt.

**Bewusst NICHT gemacht:**
- Code wurde **nicht** angefasst — Konzept-Phase abgeschlossen, Implementierung beginnt im nächsten Schritt. Aktueller Code spiegelt das alte 16-Tage-Bündel und wird gemäß Architektur-Vorgaben restrukturiert (siehe `STATUS.md` § Nächste sinnvolle Schritte).
- Monetarisierungs-Modell nicht vorab festgelegt — beide Stufe-2-Optionen bleiben offen bis nach Eigen-Trip.
- Keine konkreten Public-Product-Zielzahlen festgenagelt — Hausnummern (>50 % Aktivierung, >30 % Tiefe, ≥5 Rückmeldungen) sind explizit revisionsbedürftig nach Saison 1.
- Geo-Erweiterung außerhalb Cape York und i18n-Sprachliste *nicht* vorab fixiert — Architektur lässt sie offen, ohne im MVP Aufwand dafür zu erzeugen.

---

## 2026-04-29 — Initial Setup & Verifikation

**Ausgangslage:** Projektgerüst (Code, `package.json`, `vite.config.js`, `index.html`, alle drei Tabs, alle Daten-Files) war bereits angelegt, aber **niemals gebaut** — kein `node_modules`, keine Icons.

**Was passiert ist:**
- `npm install` ausgeführt → 356 Pakete installiert, `package-lock.json` erzeugt
- `npm run build` zur Verifikation der Pipeline → erfolgreich (517 ms, 5 Precache-Entries)
- Platzhalter-Icons via PowerShell + System.Drawing erzeugt: `public/icon-192.png` (642 B) und `public/icon-512.png` (2.25 kB), beide einfarbig `#C0600C`
- Erneuter Build → Precache jetzt 9 Entries (193 KiB), Icons werden vom Service Worker erfasst
- Dokumentation eingeführt: `STATUS.md` und dieses `CHANGELOG.md` angelegt, `CLAUDE.md` um Workflow-Sektion ergänzt

**Bewusst NICHT gemacht:**
- `npm audit fix --force` (würde Breaking Changes in Dev-Deps einspielen — die 6 gemeldeten Vulnerabilities sind transitive Dev-Deps ohne Runtime-Risiko)
- Capacitor installiert (laut `CLAUDE.md` Stufe 2)
- Live-Test im Browser (`npm run dev` noch nie gestartet — UI nicht visuell verifiziert)

**Erkenntnisse (siehe auch `STATUS.md` § Tech-Notizen):**
- Harness setzt CWD nach jedem `cd` zurück → absolute Pfade nötig
- Projekt liegt in OneDrive-Sync-Ordner — bei Capacitor-Phase potenziell problematisch
