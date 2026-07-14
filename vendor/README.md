# Vendor — Manuelle Daten-Snapshots

Daten-Quellen die NICHT automatisch via build-time-Skript gefetcht werden können
(meist wegen Login-Wand oder Lizenz-Auflagen) liegen hier als manuelle Snapshots.

**Aktuell leer** — alle externen Daten kommen über automatisierte Pipelines:

- OSM (Roads/Rivers/NPs/Forests/**Camps**): `npm run geo:refresh` → `src/data/cape-york-geo.js`
- OSM-Tankstellen: `npm run osm:refresh` → `src/data/route-pois.js`

## QPWS-Daten — wieso nicht hier?

Die offiziellen QPWS-Datasets von qldspatial.information.qld.gov.au stehen unter
CC-BY 4.0, aber der Download-Workflow im QSpatial-Catalogue ist **nur nach Login**
verfügbar (Probe via Playwright bestätigt: kein Download-Button ohne registriertes
Konto, ISO-Metadata hat kein `<distributionInfo>`-Element, WFS-Endpoints returnen
HTTP 499). Stand 2026-05-15.

Statt dessen verwenden wir **OSM `tourism=camp_site`** in der Cape-York-bbox —
gleiche ODbL-Lizenz wie die übrigen OSM-Daten in der App, ~233 named Cape-York-Camps,
inkl. QPWS-Camps + private Camps + Roadhouses + Aboriginal-Community-Camps.

Wer später echte QPWS-Daten dazu nehmen will:

1. Account auf https://qldspatial.information.qld.gov.au erstellen
2. „Queensland Parks and Wildlife Service points" / „areas series" finden
3. Add to MyList → MyList → Download → Format KMZ → Whole of Queensland
4. KMZ runterladen, hier als `vendor/qpws-points-YYYY-MM-DD.kmz` speichern
5. Eigenes Parser-Skript schreiben (KMZ ist nur ZIP+KML, einfach zu parsen)
