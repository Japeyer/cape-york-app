# Product — Cape York 2026

> Produkt-Brief: **wofür** die App existiert und für **wen**.
> Tech-Brief und Coding-Regeln stehen in `CLAUDE.md`, Status in `STATUS.md`.
> Diese Datei ist der Filter für Feature-Entscheidungen: Wenn ein Vorschlag hier nicht reinpasst, wird er nicht gebaut.

---

## 1. Zielnutzer-Profil

**Primär:** Internationale Abenteurer, die in Cairns ein 4WD-Offroad-Fahrzeug mieten und damit Cape York erkunden. Typische Cape-York-4WD-Mieter reisen zu zweit oder zu viert; der Konfigurator unterstützt im MVP **1 bis 8 Personen** und **Trip-Längen von 1 bis 4 Wochen** (7–28 Tage). Diese Obergrenzen sind eine Funktion der Pool-Größe (~24 Rezepte im Seed) und können bei wachsendem Rezept-Pool erweitert werden. Englischsprachige UI, weil die Mehrheit der Cairns-4WD-Mieter international ist (australische Inlandsreisende eingeschlossen — Englisch funktioniert für alle).

- **Sprache:** **Englisch** (App-UI und User-facing Strings). Chat-Sprache und Code-Kommentare bleiben Deutsch.
- **Gerät:** Android-Smartphone, Hochformat, ~360 px Viewport (Samsung S-Serie als Referenz). PWA in Stufe 1, Capacitor-APK für Play Store / Galaxy Store in Stufe 2.
- **Umgebung:** Outdoor, Camp, Auto. Sonnenlicht, schmutzige Hände, einhändige Bedienung beim Kochen oder im Supermarkt.
- **Konnektivität:** Tagelang **offline**. Cairns und Bamaga haben Netz, dazwischen praktisch nichts. Alles Reisekritische muss im Cache liegen.
- **Tech-Affinität:** mittel. Standard-App-Nutzer, kein Konfigurations-Aufwand zumutbar.
- **Mental-Modell:** „Reise-Begleiter im Hosentaschenformat" — Konfigurator am Anfang, danach läuft's offline ohne weitere Eingabe.

**Sekundär (Dogfooding-Tester, Stufe 1):** der Entwickler + Reisepartner. Eigener 16-Tage-Trip im Juni 2026 ist der erste reale Praxistest. Wenn die App in *seiner* Hand auf *seinem* Trip funktioniert, ist sie reif für fremde Mieter. der Entwickler benutzt die App **wie ein Mieter** (Konfigurator durchlaufen, generierten Plan akzeptieren), nicht über Hardcoding-Abkürzungen.

**Nicht-Zielgruppe:** Multi-User-/Familien-Sync, kommerzielle Tour-Veranstalter, Web-Desktop-Nutzer, iOS-Nutzer in Stufe 1, andere australische Regionen außerhalb Cape York (Geo-Annahmen wie Cairns-Start, Bamaga-Mitte, Outback-Konnektivität sind eingebrannt).

---

## 2. Kern-Problem

**Wer in Cairns ein 4WD mietet und Cape York erkunden will, steht vor einem regions-spezifischen Versorgungs- und Planungsproblem, das generische Camping-Apps nicht lösen.**

Konkret:
- **Vor dem Trip:** Wie viele Tage Vorräte für wie viele Personen? Welche Mahlzeiten sind realistisch ohne Kühlschrank ab Tag 3? Wie viel kaufe ich in Cairns, wie viel hebe ich mir für den Bamaga-Stopp auf? Diese Mengenrechnung machen Mieter heute auf Zetteln oder im Kopf — fehleranfällig und ohne Cape-York-Vorwissen.
- **Während des Trips:** Tagelang offline. Wer am Camp eine Mahlzeit kochen will, braucht Rezept, Schritte und „was hab ich noch?"-Übersicht **ohne Netz**. Notizen-Apps und Google-Tabs scheitern hier.
- **Beim Einkauf:** Cairns und Bamaga sind die einzigen ernsthaften Versorgungspunkte. Eine zweigeteilte, abhakbare Liste (was jetzt, was später) verhindert Doppelkäufe und vergessene Basics.

Bestehende Lösungen (generische Meal-Planner, AllTrails, Notion, Google Sheets) decken Teile ab — keine ist Cape-York-spezifisch, keine kombiniert konfigurierbare Mengen-Skalierung mit Offline-Rezepten und einer Cairns/Bamaga-Logik.

---

## 3. Top-5 Features — priorisiert

Reihenfolge = Daten-Abhängigkeit + Wertstiftung. Erst Konfigurator (Eingabe), dann Plan (Output), dann das Daten-Fundament Rezepte, dann die abgeleitete Einkaufsliste, schließlich die Anpassbarkeit.

| # | Feature | Status | Warum diese Priorität |
|---|---|---|---|
| 1 | **Trip-Konfigurator (Onboarding)** — Tage, Personen, Diät-Kategorie. Einmal beim ersten Start erfasst, danach editierbar. | offen, neu | Ohne Konfigurator kein generierter Plan. Tor zur App. Muss in <60 Sekunden durchlaufbar sein. |
| 2 | **Generierter Menüplan** — basierend auf Konfigurator-Eingaben werden Tage mit passenden Rezepten aus dem Pool bestückt. Aufklappbare Tagesansicht mit den 3 Mahlzeiten. | teilweise (statisches 16-Tage-Bündel vorhanden, Generator fehlt) | Kern-Output der App. Was der Mieter sieht, wenn er die App öffnet. |
| 3 | **Offline-Rezepte mit Schritten** — alle Pool-Rezepte mit Zutaten (mit Pro-Person-Mengen) + Schritt-Anleitung, gefiltert auf den eigenen Plan. | teilweise (~24 statische Rezepte vorhanden, brauchen Tags) | Daten-Fundament für Plan und Einkaufsliste. Gekocht wird täglich am Camp, oft offline — muss ohne Netz und ohne Reload funktionieren. |
| 4 | **Skalierte Einkaufsliste Cairns + Bamaga** — aus dem Plan abgeleitet, Mengen × Personen, gesplittet nach den zwei Versorgungspunkten, persistent abhakbar. | teilweise (statische Listen vorhanden, Generator fehlt) | Wird im Supermarkt benutzt — einmaliges, kritisches Use-Window. Cairns/Bamaga-Split ist das Cape-York-spezifische Detail. |
| 5 | **Konfigurator nachträglich anpassen** — Personen/Tage/Diät ändern, Plan + Liste regenerieren. Bereits abgehakte Einkaufs-Items werden markiert, nicht stumm überschrieben. | offen, neu | Realität: Pläne ändern sich (Mitfahrer kommt dazu, Trip wird verkürzt). Ohne Anpassbarkeit ist die App nach 1 Stunde unbrauchbar. |

**Generator-Logik im MVP:** deterministisch — Pool hat eine vorgegebene Reihenfolge / Wochen-Rotation, bei n Tagen werden die ersten n passenden Rezepte (Diät-Filter) genommen. Architektur wird so angelegt, dass ein **kreativer Algorithmus** (Abwechslung, Kühlbedarf zuerst, etc.) als Stufe-2-Erweiterung sauber andocken kann.

**Konfigurator-Felder im MVP:** Tage, Personen, Diät-Kategorie. Trip-Start-Datum bewusst ausgespart (würde „Tag 4 von 16"-Anzeige ermöglichen, ist aber Komfort und kein Kernproblem-Hebel).

**Implikation für aktuellen Code:** Die ~24 vorhandenen Rezepte bleiben als Seed-Inhalt für den Pool, müssen aber strukturell mit Tags angereichert werden (Diät, Kühlbedarf, Pro-Person-Mengen). Das fest verdrahtete 16-Tage-Bündel in `src/data/days.js` wird durch Generator-Logik ersetzt.

> Tages-Notizen, Packliste, Kalorien-Tab, Tipps-Tab und Routenplan stehen in der Roadmap (`CLAUDE.md`), sind aber **nicht in den Top-5** — sie lösen nicht das Kern-Problem (Versorgung + Mahlzeit-Planung für Cape-York-4WD-Mieter), sondern sind Komfort. Sie kommen, wenn die Top-5 stabil sind und der Eigen-Trip im Juni 2026 bestätigt, dass das Kern-Erlebnis trägt.

---

## 4. Was wir NICHT bauen

Zwei Kategorien: **harte Ausschlüsse** (auch nach MVP nicht geplant) und **MVP-Ausschlüsse** (im MVP nicht enthalten, in späteren Stufen offen). Die Trennung ist wichtig, damit die Architektur die offen gehaltenen Themen mitdenkt, ohne im MVP Aufwand dafür zu erzeugen.

### Hart ausgeschlossen (auch in Stufe 2+ nicht geplant)

- **Kein Multi-User-/Familien-Sync, keine Accounts, kein Login, kein Cloud-Sync.** Daten leben lokal pro Gerät. Wenn ein Mieter auf zwei Geräten parallel plant, ist das sein Problem — die App löst es nicht.
- **Keine Karten-/Navigations-Lösung.** Maps.me, Gaia GPS, Hema sind dafür da. Maximal ein statischer Routen-Überblick als Komfort-Feature später, aber keine Live-Navigation.
- **Keine Echtzeit-GPS-/Tracking-Funktion.** Die App weiß nicht, wo der Mieter gerade ist. „Heute ist Tag X" wird (wenn überhaupt) aus Konfigurator-Eingaben berechnet, nicht aus GPS.
- **Keine kommerzielle Veranstalter-/Multi-Trip-Verwaltung.** App ist für Endkunden-Mieter, nicht für Tour-Veranstalter, die viele Trips für viele Kunden parallel verwalten.
- **Kein TypeScript, kein UI-Framework, keine State-Management-Library.** Vanilla React + eigenes CSS reicht für den Umfang. Tech-Stack-Entscheidung aus `CLAUDE.md`.
- **Keine Ad-hoc-Erweiterung des Tech-Stacks.** Neue Dependencies brauchen einen `CHANGELOG.md`-Eintrag mit Begründung.

### Im MVP nicht enthalten — in späteren Stufen offen

Der MVP zielt auf den Eigen-Trip im Juni 2026 als Praxistest. Folgendes ist absichtlich vertagt, damit das Kern-Erlebnis (Konfigurator → Plan → Rezepte → Liste) zuerst steht. Die Architektur soll diese Erweiterungen aber **nicht ausschließen**.

- **i18n / weitere Sprachen.** MVP ist Englisch only. Stufe 2+: weitere Sprachen je nach Bedarf — Architektur-Effekt: User-facing Strings von Anfang an in einer separaten Datei halten, keine Inline-Strings in Komponenten.
- **Geo-Erweiterung außerhalb Cape York.** MVP ist Cape-York-spezifisch (Cairns + Bamaga als Versorgungspunkte). Stufe 2+: andere Regionen mit eigener Versorgungslogik möglich — Architektur-Effekt: Versorgungspunkte und Region-spezifische Daten datengetrieben, nicht hardcoded.
- **Live-Daten** (Wetter, Verkehr, Outback-Conditions, Wildlife-Warnungen). Im MVP nicht. Stufe 2+ als Option offen — *aber* mit der Vorwarnung, dass dies entweder ein Backend oder eine Drittanbieter-API erfordert und damit das aktuelle „kein Backend"-Prinzip kippt.
- **Backend / API / Datenbank.** Im MVP gibt es kein Backend; alle Daten sind in `src/data/` gebündelt, Nutzerstand in `localStorage`. Stufe 2 kann das relativieren, falls Live-Daten oder Monetarisierung über Play-Billing das nötig machen — aber nicht ohne explizite Entscheidung im `CHANGELOG.md`.
- **Bezahlfunktion / Play-Billing-Integration.** Im MVP kostenlos, kein In-App-Kauf. Stufe 2: Per-Trip-Lizenz (Modell A) oder Einmalkauf nach Trial (Modell B) als offene Optionen — Entscheidung nach Eigen-Trip Juni 2026.
- **Eigene Rezepte (Nutzer-CRUD).** Im MVP ist der Pool read-only, nur im Bundle. Stufe 2: Nutzer kann eigene Rezepte ergänzen (`localStorage`).
- **Adaptiver / kreativer Plan-Generator.** Im MVP deterministisch (siehe § 3). Stufe 2: Algorithmus mit Abwechslung, Kühlbedarf-Logik, Diät-Substitutionen.
- **Tages-Notizen, Packliste, Kalorien-Tab, Tipps-Tab, Routenplan.** Komfort-Features, nicht Kern. Reihenfolge und Aufnahme nach Eigen-Trip-Retrospektive.
- **iOS-Build.** Stufe 1: nur Android (Capacitor → Play Store / Galaxy Store). Stufe 2+: iOS möglich, sobald Apple-Developer-Account + Mac-Toolchain verfügbar.
- **Tests / CI.** Im MVP manueller Praxistest auf Zielgerät. Stufe 2+ je nach Komplexitätswachstum.
- **Soziale / Sharing-Features.** Foto-Galerien, öffentliche Reise-Tagebücher, Community-Rezepte. Aktuell kein Bedarf, aber nicht auf ewig ausgeschlossen.

---

## 5. Erfolgsmetrik

Zwei Ebenen, weil das Produkt zwei Lebensphasen hat: **MVP-Validierung am Eigen-Trip** und **Public-Product-Validierung in einer Cape-York-Saison**.

### 5.1 Eigen-Trip-Validierung (Stufe 1, Juni 2026)

> **Die App übersteht den 16-Tage-Eigen-Trip vom Entwickler + Reisepartner als alleiniges Werkzeug für Menüplanung, Rezeptabruf und Einkaufsliste — ohne Rückfall auf Notizen-App, Google Sheet oder Zettel.**

Operationalisiert:

- **Vorab-Schwelle (Mai 2026, vor Abflug):** Vollständiger Offline-Durchlauf auf dem Zielgerät (Samsung S, Flugmodus): Konfigurator → generierter Plan → Rezepte → skalierte Einkaufsliste funktionieren ohne Netz. `localStorage` überlebt Neustart und App-Update. Konfigurator-Edit (z.B. Personenzahl ändern) regeneriert Plan + Liste sauber, ohne abgehakte Items stumm zu überschreiben. **Wenn das nicht steht, fliegt die App nicht mit.**
- **Hauptmetrik während des Trips (qualitativ):** An jedem Tag, an dem eine Trip-Aufgabe anstand (Mahlzeit kochen, einkaufen, Plan checken), wurde sie in der App erledigt — nicht in einer Notizen-App, auf Zettel oder im Kopf. Tage ohne anstehende Trip-Aufgabe (reine Fahrtage, Restaurant-Tage) zählen nicht gegen die Metrik.
- **Begleitmetrik (Negativ-Test):** An keinem Tag musste auf ein externes Werkzeug ausgewichen werden, weil die App eine Trip-Aufgabe nicht abdeckte. Jedes Ausweichen ist ein dokumentierter Funktions-Lücken-Befund für Stufe 2.
- **Retrospektive (Juli 2026):** Eintrag in `STATUS.md` — was wurde wirklich genutzt, was lag brach, was fehlte, welche Stufe-2-Features priorisiert die Praxis? Daraus leitet sich der Stufe-2-Plan ab.

### 5.2 Public-Product-Validierung (Stufe 2, erste Cape-York-Saison nach Launch)

Zeitfenster: **eine vollständige Cape-York-Saison (Mai–Oktober)** ab Play-Store-Launch. Saison statt „12 Monate", weil die Zielgruppe nur in dieser Zeit existiert — Launch außerhalb der Saison heißt einfach: Saison-Uhr beginnt im darauffolgenden Mai.

Drei Metrik-Kategorien mit **groben Hausnummern als Diskussionsgrundlage** — diese Zahlen sind explizit zu ersetzen, sobald aus der ersten Saison echte Daten vorliegen:

| Kategorie | Was wird gemessen | Hausnummer (TBD nach Saison 1) |
|---|---|---|
| **Aktivierung** | Anteil der Installs, die den Konfigurator komplett durchlaufen und einen Plan generieren. | >50 % |
| **Tiefe** | Anteil der erzeugten Pläne, die im Trip-Zeitraum mehrfach geöffnet werden (≥5 Sessions verteilt über ≥5 Tage = realer Trip-Einsatz). | >30 % |
| **Erkenntnis** | Qualitative Rückmeldungen: Store-Reviews, Bug-Reports, Feature-Wünsche von echten Mietern. | ≥5 substanzielle Rückmeldungen |

### Was wir nicht messen

DAU/MAU, Session-Dauer, Performance-Scores, Download-Zahlen alleine. Cape-York-Mieter benutzen die App ein paar Wochen pro Trip und dann nie wieder — Engagement-Metriken aus Wachstumsprodukten passen nicht. Erfolg heißt hier: **die App hat in der Hand eines Mieters auf einem realen Trip funktioniert**, nicht „der Mieter kommt täglich zurück".
