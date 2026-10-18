# Skipper-Assistent Ostsee – SPEC v1

Stand 18.10.2026 · Grundlage: GROBKONZEPT_Skipper-Ostsee.md (18.10.2026), Vorlage `skipper-sardinien` v2 (Code im Nachbarordner `/home/claude/skipper-sardinien`).
Diese Spec ist verbindlich. Wo sie schweigt, gilt das Verhalten der Sardinien-App v2. **Nichts erfinden:** Kein Wert, keine Telefonnummer, keine Frequenz und keine Regel darf in den Code, die nicht in `data/*.json` oder in dieser Spec steht. Regeln ohne Quelle heißen in UI und Code „Faustregel“.

---

## 1. Lieferumfang und Struktur

```
skipper-ostsee/
  index.html              # GEBAUT – eine Datei, offline lauffähig, alle Daten inline
  sw.js, manifest.webmanifest, icon.svg, icon-192.png, icon-512.png, .nojekyll
  src/app.html            # Quelle: HTML/CSS/JS mit Platzhalter /*@@DATA@@*/
  data/harbours-*.json    # 9 Regionsdateien (fertig, NICHT von Hand ändern)
  data/bridges.json, hazards.json, radio.json, seaareas.json, boats.json (fertig)
  tools/build.js          # node tools/build.js → liest src + data → schreibt index.html
  tests/logic.test.js     # Akzeptanztests §9 (Playwright, Chromium /opt/pw-browsers/chromium)
  tests/build-pdf.js      # → Bordkarte_Ostsee_v1.pdf (A4)
  tests/screens.js        # → screens/*.png (390×844)
  .github/workflows/pages.yml (bereits kopiert)
  CHANGELOG.md, README.md (kurz, Deutsch)
```

- `tools/build.js` fügt alle `data/harbours-*.json` zu `DATA` zusammen (Reihenfolge egal, Sortierung macht die App), sowie `BRIDGES`, `HAZARDS`, `RADIO`, `SEAAREAS`, `BOATS`. Es bricht mit Fehler ab bei: doppelter `id`, `bridgeIds`-Verweis ohne Brücke, Hafen ohne `lat/lon`.
- `index.html` bleibt **eine** Datei (wie Sardinien), keine externen Requests, kein CDN.
- Service Worker: Kopie der Sardinien-Logik, `CACHE='skipper-ostsee-v1-20261018'`, dieselbe FILES-Liste.
- Manifest: name „Skipper-Assistent Ostsee“, short_name „Skipper Ostsee“, Farben wie Sardinien.
- Öffentliche API wie Sardinien: `window.SKIPPER = { DATA, BRIDGES, HAZARDS, RADIO, SEAAREAS, BOATS, CONST, state, update, normalize, evaluate, harborStatus, rank, recommend, reffLevel, reffStufe, apparentWind, generalLevel, haversineNm, bearingDeg, formatDM, parseDM, isOutOfArea, euOffset, utcToLocal, sunTimes, seaAreaOf, countryOf, boatNeeds, bridgeCheck, effThresholds }`.

## 2. Daten (fertig in `data/`, nur lesen)

### 2.1 Hafen (`harbours-*.json`, 430 Einträge)
Felder: `id, name, country (DE|DK|SE), region, type (marina|hafen|nothafen), lat, lon, prot {N..NW: full|part|open|null}, protSource (quelle|quelle+plan|plan|abgeleitet|null), entranceOpen [dirs]|null, swellOpen [dirs]|null, depthEntrance_m, depthBerthMin_m, depthBerthMax_m, maxDraft_m, maxLoa_m, maxBeam_m, catFriendly, bridgeIds [], surge {high:[{dirs,m}], low:[{dirs,m}]}|null, season {open:"MM-DD", close:"MM-DD"}|"ganzjährig"|null, vhf, tel, web, note, verified {…}, src, refuge (bool), refugeLevel (belegt|plan|abgeleitet|grenzfall|notfall|null), plans, distHeiligenhafen_sm, distBreege_sm, zone (kern|rand|se)`.
- Alle Tiefen in m bei Mittelwasser, `null` = unbekannt.
- `null` in `prot` heißt **unbekannt**, nicht offen.
- `distHeiligenhafen_sm`/`distBreege_sm` sind Luftlinie und nur für die Anzeige „≈ X sm ab …“. In der App selbst wird immer mit `haversineNm` gerechnet.

### 2.2 Weitere Listen
- `bridges.json → BRIDGES[]`: `id, name, country, lat, lon, kind (fest|klapp|dreh|schiebe|freileitung), clearanceClosed_m, clearanceRef, clearanceOpen_m, opening, vhf, tel, note, verified, src` (+ ggf. zeitliche Einschränkung in `note`).
- `hazards.json → HAZARDS[]`: `id, name, country, type, geom {type:"circle", center:[lat,lon], radius_nm}|null, warn, …`. Nur 15 haben einen Mittelpunkt; **kein** Radius ist belegt.
- `radio.json → RADIO[]` je Land (DE, DK, SE, PL-Einträge) mit `{value, verified, src}`-Feldern; `sources` für URLs.
- `seaareas.json → SEAAREAS[]`: Name, `bbox [lonMin, latMin, lonMax, latMax]`, `bbox_verified:false`.
- `boats.json`: Dehler-35-Varianten (Quelle sailboatdata).

Die Struktur der Untereinträge in `radio.json`/`hazards.json` ist uneinheitlich (verschiedene Agenten). `build.js` normalisiert nicht; die App liest robust (fehlende Felder → nicht anzeigen). **Keine** Felder ergänzen.

## 3. Bootsprofil (Tab „Boot“, `localStorage` mit try/catch)

| Feld | Default | Wirkung |
|---|---|---|
| Profil | „Dehler 35 (ab 2010, Standardkiel)“ | Vorauswahl aus `boats.json` |
| Name / Rufzeichen / MMSI | leer | MAYDAY-Text |
| Typ | Einrumpf | Katamaran: Hinweis „Kat: Boxen oft zu schmal – längsseits/Stirnseite“, `catFriendly===false` → gelb |
| Länge (m) | 10,51 | `maxLoa_m` |
| Breite (m) | 3,49 | `maxBeam_m` |
| Tiefgang (m) | 1,95 | Tiefenlogik |
| Masthöhe über WL inkl. Antenne (m) | 18,5 | Brücken |
| Tiefen-Zuschlag unter Kiel (m) | 0,3 | Tiefenlogik |
| Brücken-Sicherheitsabstand (m) | 1,0 | Brücken (Faustregel) |
| Kinder an Bord | aus | −3 kn |
| Saison | „automatisch“ | §4.2 |
| Fahrt (kn) | 5,5 | ETA |

- Profile zur Auswahl: Dehler 35 ab 2010 Standardkiel (10,51 / 3,49 / 1,95), Flachkiel (1,62), Regattakiel (2,15), Dehler 35 CWS 1993–98 (10,50 / 3,30 / 1,90), „Katamaran (eigene Werte)“ (alle Maße leer → Pflichteingabe), „Eigene Werte“.
- Masthöhe 18,5 m ist eine **Annahme** (sailboatdata 17,64 m ohne Antenne + Zuschlag). Im Boot-Tab Hinweis „Masthöhe am Boot messen (inkl. Antenne/Windex) – Default ist geschätzt“.
- Erster Start (kein Profil gespeichert): Boot-Tab zuerst zeigen mit Button „Profil übernehmen“.
- Ohne vollständiges Profil: Tiefen-/Brückenprüfung liefert grau „Bootsdaten fehlen“.

## 4. Bewertungslogik

### 4.1 Eingaben (Tab „Lage“)
Wie Sardinien: Position (GPS / manuell Grad+Dezimalminuten / Revier-Auswahl), Windrichtung (8), Wind wahr, Böen wahr (Böen < Wind → auf Wind anheben + Hinweis), Kurs (am Wind / halber Wind / raum / vorm Wind), Kinder, Trend „Winddrehung/Front erwartet“.
Ersetzt/neu:
- **Seegang**: Richtung (8) + Höhe 0–3 m in 0,25-Schritten (statt Dünung 0,5).
- **Pegel** in cm relativ zu Mittelwasser, −200…+200, Schritt 10, Default 0. Hinweis „BSH/DMI-Wasserstandsvorhersage“.
- **Sicht**: gut / mäßig / Nebel. Default gut.
- **Gewitter erwartet** (Checkbox).
- **Starkwind seit > 12 h aus** (optional, Richtung oder „—“).
- Revier-Auswahl ersetzt die Sardinien-SEGMENTS: Liste der Regionen (aus `region` der Häfen, gruppiert nach Land), Position = Mittelpunkt der Häfen dieser Region.

### 4.2 Schwellen (in `CONST`, Regeln-Screen wird daraus erzeugt)
```
reff:      base [18,23,28], Namen wie Sardinien
course:    am Wind 1.15, halber Wind 1.05, raum 0.9, vorm Wind 0.8 (aufrunden)
traffic:   yellow 18, red 28
offsets:   kids 3, season 3   (kumulativ)
floor:     yellow ≥ 12, red ≥ 22, reff base ≥ [12,17,22]
sea:       yellow 1.25 m, red 2.0 m          (Faustregel: kurze, steile Ostseewelle)
harborSea: yellow 0.5 m, red 1.0 m            (Seegang aus swellOpen ∪ entranceOpen)
harborGust: marina [30,38], hafen [30,38], nothafen [30,38]
entrance:  yellow 16, red 22 (Böen, Wind aus entranceOpen; Offsets gelten)   (Faustregel)
crossing:  gust 22, sea 1.5 m, Nebel          (Offsets gelten; Faustregel)
pegel:     info ≤ −60 cm; yellow ≤ −100 cm; yellow ≥ +100 cm; red ≥ +150 cm   (BSH-Stufen, Quelle radio.json)
bridgeNearNm 8, hazardNearNm 15 (Mittelpunkt-Näherung), crossingNearNm 15, farNm 20, speed 5.5
area: lat 53.6–56.95, lon 9.3–15.8
```
- `effThresholds(state)` liefert alle verschobenen Schwellen: Offset = 3·kids + 3·season, danach Untergrenzen (`floor`). **Jede** Schwelle der Logik läuft über diese Funktion (Lehre §9: Kinder-/Saisonregel wirklich im Code).
- Saison „automatisch“: Sommer 01.06.–31.08., sonst Vor-/Nachsaison (Faustregel, im Regeln-Screen so benannt). Manuell umschaltbar.

### 4.3 Gesamtampel `generalLevel`
Wie Sardinien mit `effThresholds`. Seegang statt Dünung mit `sea`. Zusätzlich:
- Sicht Nebel → mindestens gelb „Nebel: Radar/AIS, Schallsignale, Verkehrstrennungsgebiete meiden“.
- Gewitter → mindestens gelb „Gewitter: Hafen vorher erreichen, Reff früh“.
- Pegel nach `pegel`-Stufen (Text nennt BSH-Stufe: ≥ +100 leichte, ≥ +125 mittlere, ≥ +150 schwere Sturmflut; ≤ −100 Niedrigwasserwarnung).
- Vor-/Nachsaison: Info (nicht Ampel) „Kälteschock – Rettungsweste tragen; früher Sonnenuntergang; viele Häfen/Services geschlossen“.

### 4.4 Revier-Gates (`gates`)
Alle Gates greifen **vor** der Gefahrenzone (Lehre Orosei): Auslösung über Nähe zu Absprunghäfen **oder** Lage in der Zone.

1. **Bornholm-Überfahrt** (`id:'bornholm'`). Absprunghäfen: `de-sassnitz, de-lohme, de-glowe, de-breege, dk-klintholm-havn, dk-gedser-lystbaadehavn, se-ystad, se-simrishamn, se-kaaseberga, dk-roenne-havn, dk-hasle-havn, dk-allinge-havn, dk-nexoe-havn, dk-svaneke-havn, dk-gudhjem-havn, dk-christiansoe-havn`. Aktiv, wenn Position ≤ 15 sm von einem davon **oder** in Box lat 54.45–55.6, lon 13.5–14.6. Rot, wenn Böen ≥ crossing.gust(eff) **oder** Seegang ≥ 1.5 m **oder** Sicht Nebel. Titel auf Bornholm-Seite (lon ≥ 14.5): „ÜBERFAHRT NICHT BEGINNEN – AUF BORNHOLM BLEIBEN“, sonst „BORNHOLM-ÜBERFAHRT NICHT BEGINNEN“. Text: offene See, Großschifffahrt, unterwegs kein Zufluchtsort, Auslöser.
2. **Anholt-/Kattegat-Überfahrt** (`id:'anholt'`). Absprunghäfen: `dk-anholt-havn, dk-grenaa-marina, dk-grenaa-havn, dk-boennerup-havn, dk-ebeltoft-havn, dk-ebeltoft-skudehavn, dk-hundested-havn, dk-gilleleje-havn, dk-odden-havn`; Box lat 56.35–56.85, lon 11.0–11.95. Gleiche Schwellen.
3. **Verkehrstrennungsgebiet** (`id:'vtg'`): Hazards `type:'vtg'` mit Mittelpunkt ≤ 15 sm → Info „VTG/Großschifffahrt: rechtwinklig queren, AIS“; bei Nebel gelb.
4. **Brücke in der Nähe** (`id:'bridge-<id>'`): Brücken ≤ 8 sm. `bridgeCheck(bridge, boat, pegel)`:
   - `kind fest|freileitung`, Höhe bekannt: `frei = clearanceClosed_m − max(0, pegel/100)`; `frei < mast + sicherheitsabstand` → rot „Mast X m passt nicht unter <Name> (Y m bei <Ref>)“; sonst Info grün „passt (Reserve Z m)“.
   - Höhe unbekannt → gelb „Durchfahrtshöhe unbekannt – Seekarte prüfen“.
   - `klapp|dreh|schiebe` → Info „nur zu Öffnungszeiten: <opening>“ (gelb, wenn Mast > geschlossene Höhe); bekannte vorübergehende Sperren aus `note` mit Datum anzeigen.
5. **Gefahrengebiete in der Nähe**: Hazards mit Mittelpunkt ≤ 15 sm → Info-Banner mit `warn` und Hinweis „Abstand zum Mittelpunkt – Gebietsgrenze nicht belegt“. Hazards ohne Geometrie erscheinen nur im Regeln-Screen (nach Land/Typ) und – falls `name`/`warn` eine Region nennt, die der Region des nächsten Hafens entspricht – als Info.
6. **Trend/Winddrehung**: wie Sardinien (gelb).
7. **Starkwind > 12 h**: Info. Für DE/West (lon < 12.5): Wind aus SW/W → „Pegel fällt in der westlichen Ostsee (Faustregel)“; N–E → „Pegel steigt“. Für Häfen mit `surge` siehe §4.5.
8. **Stettiner Haff** (lat < 53.95 und lon > 14.0): Info „Grenze DE/PL im Haff; polnische Zuständigkeit MRCC Gdynia“ (Daten aus `radio.json`).

### 4.5 Hafenstatus `harborStatus(h, state)`
Liefert `{level: g|y|r|n, items:[{level,text}], reasons, unverified, refugeLabel}`. Reihenfolge der Prüfungen, schlechteste gewinnt; Gründe absteigend sortiert:

1. **Windschutz**: `prot[dir]` full → g; part → y; open → r; `null` → n „Schutz bei Wind aus X unbekannt“. Alle 8 `null` → n „Schutz unbekannt – nicht einplanen“.
2. **Ansteuerung**: `dir ∈ entranceOpen` und Böen ≥ entrance.red(eff) → r „Ansteuerung bei auflandigem Wind gefährlich“, ≥ entrance.yellow(eff) → y.
3. **Seegang**: `seaDir ∈ (swellOpen ∪ entranceOpen)`, Höhe ≥ harborSea.red → r, ≥ yellow → y.
4. **Böen je Typ** (`harborGust`).
5. **Tiefe** (`boatNeeds`): `need = Tiefgang + Zuschlag`, `p = pegel/100`.
   - `maxDraft_m` bekannt und < Tiefgang → r „Hafen nennt max. Tiefgang X m“.
   - Einfahrt bekannt: `depthEntrance_m + p < need` → r.
   - `depthBerthMax_m + p < need` → r; `depthBerthMin_m + p < need ≤ depthBerthMax_m + p` → y „nur an den tiefsten Plätzen“.
   - Einfahrt **und** Liegeplatz unbekannt → n „Tiefe unbekannt“. Nur eines unbekannt → höchstens y „Einfahrtstiefe unbekannt“ bzw. „Liegeplatztiefe unbekannt“.
   - Starkwind > 12 h aus `surge.low.dirs` → zusätzlich `p − m` prüfen: wird es zu flach → y „bei anhaltendem Wind aus X bis −m m (Lotse)“. Aus `surge.high.dirs` → Info „bis +m m Hochwasser (Lotse)“.
6. **Brücken auf der Zufahrt** (`bridgeIds`): `bridgeCheck` → r / y wie §4.4.
7. **Maße**: `maxLoa_m < Länge` oder `maxBeam_m < Breite` → r. Kat und `catFriendly===false` → y.
8. **Saison**: `season` bekannt und heute außerhalb → y „außerhalb der Saison (TT.MM.–TT.MM.) – Service evtl. geschlossen“.
9. **Zuflucht-Einstufung** (`refugeLevel`):
   - `belegt` → Label „Zuflucht (Quelle)“
   - `plan` → „Zuflucht (aus amtlichem Hafenplan abgeleitet)“
   - `abgeleitet` → „Zuflucht (abgeleitet, ungeprüft)“
   - `grenzfall` → Level höchstens y, Label „Grenzfall“ + Begründung aus `note` (Text nach „Grenzfall:“)
   - `notfall` → Level höchstens y, Label „Berufshafen – nur im Notfall, Hafenkontor rufen“
   - `null` → zusätzliches Item n „nicht als Zuflucht eingestuft“; das Level wird trotzdem berechnet (Hafen kann für normale Planung grün sein), aber er zählt **nicht** für Zuflucht-Empfehlungen.
10. **Ungeprüft**: `unverified = protSource ∉ {quelle}`. Bei Level g und unverified: Item „Sektoren aus Plan/Lage abgeleitet“ bzw. „ungeprüft“ (Badge sichtbar).

Kein Hafen ist „immer grün“ (Lehre §9). Fehlt die Windrichtung → n „Windrichtung wählen“.

**Rangfolge (Abnahme-Korrektur 19.10.2026):** r > n > y > g. Ein bekannter roter Grund wird nie durch „unbekannt“ verdeckt.

**Ungeprüfte Brückenhöhe (Abnahme-Korrektur):** `bridgeCheck` liefert bei `verified.clearance !== true` nie g. Reicht die Höhe rechnerisch, aber die Reserve ist < 3,0 m → y „Höhe ungeprüft, Reserve nur X m – Seekarte/Bekanntmachung prüfen“; Reserve ≥ 3,0 m → y „Höhe ungeprüft“ nur als Info-Item. Gilt in Gate (§4.4/4) und Hafenstatus (§4.5/6).

### 4.6 Liste und Empfehlung
- `rank`: alle Häfen nach Entfernung (Haversine) mit Kurs (rwK, Grad) und ETA (`dist / speed`).
- `recommend`: `green` = nächster Hafen mit Level g **und** `refugeLevel ∈ {belegt, plan, abgeleitet}`; `belegt` = nächster g mit `refugeLevel==='belegt'`; `far` wenn kein green < 20 sm; dann `fallback` = nächster Zuflucht-Hafen mit Level y.
- Filter im Tab „Zuflucht“: Standard „nur Zuflucht“ an; außerdem „passt für mein Boot“ (Tiefe/Brücke/Maße nicht r und nicht n wegen Bootsdaten), „jetzt geöffnet“, Land (DE/DK/SE), Region. Anzahl-Anzeige „N von M“.
- Karte: Name, Land-Flagge als Text (DE/DK/SE), Level, Gründe, Kompassrose (wie Sardinien; `null`-Sektoren grau gestrichelt), Entfernung/Kurs/ETA, „≈ X sm ab Heiligenhafen / ab Breege“, Tiefen (E / L min–max), Brücken mit Höhe, VHF, Tel (tel:-Link), Saison, Zuflucht-Label, Badges je `verified`-Feld, Quelle (`src`) einklappbar.
- **Sonnenuntergang**: Wenn `jetzt + ETA` nach Sonnenuntergang −30 min liegt → Item y „Ankunft nach Sonnenuntergang (HH:MM)“.

### 4.7 Hell/Dunkel, Seegebiet, Land
- `sunTimes(lat, lon, date)`: NOAA-Sonnenstandsalgorithmus (Zenit 90,833°), Ausgabe Ortszeit (MEZ/MESZ via `euOffset`). Lage-Screen zeigt Sonnenaufgang/-untergang und bürgerliche Dämmerung (96°).
- `seaAreaOf(pos)`: alle `SEAAREAS` mit bbox, die die Position enthalten; kleinste bbox gewinnt. Anzeige „Seegebiet ≈ <Name> (Grenzen ungeprüft)“. Keine Treffer → nichts anzeigen.
- `countryOf(pos)`: Land des nächsten Hafens; im Haff (§4.4/8) zusätzlich PL. Liegt der nächste Hafen eines anderen Landes ≤ 15 sm, beide Länder anzeigen.

## 5. Notfall & Funk (Tab „Notfall“)
- Blöcke je Land aus `RADIO`, Reihenfolge: Land(er) aus `countryOf` zuerst, dann übrige. Nur Felder mit Wert anzeigen; `verified:false` → Badge „ungeprüft“. Keine Nummer aus dem Gedächtnis.
- Fester Kopf wie Sardinien: DSC-Distress zuerst (5 s), dann MAYDAY auf CH 16; 112 mit Hinweis „nur mit Mobilfunknetz, küstennah“.
- DE: 124 124 mit dem Hinweis aus `radio.json` („nur deutsche Netze, küstennah, keine offizielle Notrufnummer“).
- MAYDAY-Schema mit Bootsprofil (Name, Rufzeichen, MMSI), Position in Grad/Dezimalminuten (`formatDM`), Personen an Bord (Eingabe), Art des Notfalls; PAN PAN analog.
- Wetter/NAVTEX/UKW-Seewetter: aus `RADIO` (Kennungen, Frequenzen, UTC-Zeiten → `utcToLocal`). **Kein** Deutschlandfunk-Seewetterbericht (eingestellt 28.02.2023 – im Regeln-Screen als Hinweis).
- Seegebiet zur Position (§4.7) im Notfall-Tab oben.

## 6. UI
Wie Sardinien v2 (Nachtmodus rot/schwarz, `prefers-color-scheme`, große Tap-Ziele, Stepper mit Halten). Tabs: **Lage · Zuflucht · Notfall · Regeln · Boot**.
- Lage: Eingaben §4.1, Ergebnis-Banner (overall), Gates, Info-Banner (Hazards, Brücken, Saison), Reff-Stufe, Hell/Dunkel, Seegebiet, Top-Empfehlung (green / belegt / fallback).
- Regeln: aus `CONST` erzeugt (Schwellen-Tabellen inkl. Kinder-/Saison-Spalten), Faustregeln als solche benannt, Brückenliste „feste Hindernisse < 26 m“ mit Ampel gegen Masthöhe, Klappbrücken mit Öffnungszeiten, Hazards nach Land, Nationalpark-Regeln (aus HAZARDS), Datenstand-Zähler (je `verified`-Feld: n/430, je `refugeLevel` Anzahl, je `protSource`), Disclaimer wie Sardinien.
- Ausreißer-Plausibilität bei manueller Position: außerhalb `area` → Hinweis.

## 7. Bordkarte (PDF, A4, Print-Stylesheet aus derselben Datenquelle)
- Seite 1: Notfall + Funk aller Länder (DE, DK, SE, PL-Haff) mit MAYDAY-Schema, NAVTEX, UKW-Seewetter, BSH-Pegelstufen, Disclaimer.
- Hafentabellen gruppiert nach Land → Region, innerhalb Gruppe Nord→Süd (lat absteigend), jeder Hafen genau einmal. Spalten: Name, Typ, Position, Schutz (Kurzform „voll: … / teilw.: … / offen: …“, unbekannt „?“), Tiefe E / L, Brücke, VHF, Tel, Zuflucht (Kürzel B/P/A/G/N/–), Status (ungeprüft-Kennzeichen). Schrift ≥ 7 pt.
- Brücken-Seite: alle BRIDGES mit Höhe, Art, Öffnung; Spalte „Mast 18,5 m?“ gegen das **Default**-Profil.
- Gruppenköpfe nie allein am Seitenende (`break-after: avoid` + Test).

## 8. Offline
Wie Sardinien: SW nur bei http/https registrieren, Fehler still, Statuszeile ehrlich („offline bereit“ erst nach erfolgreichem Cache). PNG-Icons vorhanden.

## 9. Akzeptanztests (`tests/logic.test.js`, alle müssen PASS)
Profil im Test = Default (Tiefgang 1,95, Zuschlag 0,3, Mast 18,5, Abstand 1,0, Länge 10,51, Breite 3,49), Pegel 0, Sicht gut, sofern nicht anders genannt. `ev`-Helper wie Sardinien.

**Reff/Ampel/Offsets**
1. Reff wie Sardinien Test 8/8b (Grundschwellen 18/23/28, keine Lücke 0–60, monoton) – mit Kinder **und** mit Saison je −3; Kinder+Saison: −6, Untergrenze 12/17/22 greift (Test mit Wert 11 → Vollzeug, 12 → 1. Reff).
2. Ampel: Böen 17 g, 18 y, 27 y, 28 r; Kinder 15 y/25 r; Kinder+Vorsaison 12 y/22 r; Untergrenze: kein Wert unter 12/22.
3. Seegang: 1.0 g, 1.25 y, 2.0 r.
4. Nebel → overall mindestens y; Gewitter → mindestens y.
5. Pegel: −60 Info, −100 y, +100 y, +150 r.

**Gates**
6. Bornholm: Position Sassnitz, SW 15/23 → Gate `bornholm` rot (Böen ≥ 22). Gleiche Position, SW 12/16 → kein Gate.
7. Bornholm: Position Rønne, Seegang 1.5 m bei Wind 10/12 → rot, Titel enthält „BORNHOLM BLEIBEN“. Position Rønne, Nebel, Wind 8/10 → rot.
8. Bornholm vor der Zone: Position Tromper Wiek (lat 54.62, lon 13.45 – außerhalb der Box, ≤ 15 sm von Glowe/Lohme) → Gate aktiv bei 15/23. Position Kiel-Schilksee → kein Bornholm-Gate.
9. Anholt: Position Grenaa Marina, E 18/24 → rot; Position Grenaa, 10/14 → kein Gate; Kinder an, 10/19 → rot (22−3).
10. Brücke: Position 3 sm von Storebælt-Vestbro (55.30903, 10.8959) → Gate rot „passt nicht“ (18,0 < 19,5). Gleiche Position, Mast 15 m → kein rot.
11. Brücke `dk-bro-sj-lland-far-broen` (20,0 m), Position 3 sm entfernt: Mast 18,5 + Abstand 1,0 = 19,5 ≤ 20,0 → **nicht** rot, Info „Reserve 0,5 m“. Mit Pegel +60 cm → 19,4 < 19,5 → rot. (Prüft Pegel-Abzug.)
12. Brücke unbekannt: Position nahe `de-bro-wittow-freileitung` → gelb „Durchfahrtshöhe unbekannt“.
13. Kinder/Saison wirken im Gate: Bornholm Sassnitz 12/20, Kinder aus → kein Gate; Kinder an → rot (≥19); Vorsaison zusätzlich → rot bei 12/16 (≥16).

**Hafenstatus**
14. Windschutz: `dk-klintholm-havn` W 10/12 → nicht r (W full); SW 10/12 → y (part). `de-rerik` N → n (Schutz unbekannt für N).
15. Ansteuerung: `dk-klintholm-havn` (entranceOpen SW,W), Wind W 15/22 → r „Ansteuerung“; 12/16 → y; Wind E 15/22 → keine Ansteuerungsmeldung.
16. Tiefe: `dk-marstal-havn` (E 3.6, L 1.4–3.0): Default → y „nur an den tiefsten Plätzen“; Pegel −80 → r (3.0−0.8 = 2.2 < 2.25). Flachkiel 1,62 + Pegel 0 → y (1.4 < 1.92 ≤ 3.0).
17. Tiefe unbekannt: ein Hafen mit beiden Tiefen `null` → Level n, Text „Tiefe unbekannt“, niemals g (für alle 8 Richtungen geprüft).
18. maxDraft: `de-rerik` (1,8) mit Tiefgang 1,95 → r; Flachkiel 1,62 → kein maxDraft-Grund.
19. Brücke auf Zufahrt: ein Hafen mit `bridgeIds` auf eine Klappbrücke (z. B. `dk-bro-guldborgbroen`) → y „nur zu Öffnungszeiten“; Testdaten-Hafen mit fester Brücke unter Masthöhe → r. (Testhafen per `SKIPPER.harborStatus({...synthetisch}, state)`, kein DATA-Eingriff.)
20. Grenzfall/Notfall: `dk-nyord-havn` → Level nie g, Label „Grenzfall“; ein `notfall`-Hafen → nie g, Label „Berufshafen“.
21. Surge: `dk-marstal-havn`, Starkwind > 12 h aus SW (low 1.2 m), Pegel 0 → zusätzlicher y-Grund „bis −1,2 m“.
22. Saison: synthetischer Hafen `season {open:'04-01',close:'10-31'}` am 15.11. → y „außerhalb der Saison“; am 15.07. → kein Saison-Grund.
23. Kat: synthetischer Hafen `catFriendly:false`, Profil Katamaran → y.
24. Nie „immer grün“: jeder Hafen bei Böen 40 → nicht g.

**Liste/Empfehlung/Rechnen**
25. Haversine `de-heiligenhafen-marina`→`de-breege` 84 ± 1 sm; `de-sassnitz`→`dk-roenne-havn` 51 ± 1 sm.
26. `recommend` an Position Rønne, W 12/16: `green` ist ein Hafen mit refugeLevel ∈ {belegt, plan, abgeleitet}; kein `refugeLevel null` als green.
27. Filter „passt für mein Boot“ entfernt `de-rerik`; Filter „nur Zuflucht“ zeigt keine `refugeLevel null`.
28. Sonnenuntergang: `sunTimes(54.38, 10.98, 2026-06-21)` Untergang 21:55 ± 5 min MESZ; `2026-12-21` 15:53 ± 5 min MEZ (NOAA-Referenzrechnung).
29. Seegebiet: Position Kieler Bucht (54.5, 10.3) → ein Name aus SEAAREAS mit Zusatz „ungeprüft“.
30. Land: Position Sønderborg → DK (+ DE, wenn DE-Hafen ≤ 15 sm); Position Ueckermünde-Haff → DE + PL.
31. Datenintegrität: 430 Häfen, ids eindeutig, alle in `area`, alle `bridgeIds` auflösbar, Schema (Felder aus §2.1 vorhanden).
32. E1–E3 aus Sardinien (formatDM, euOffset/utcToLocal 25.10.2026, parseDM, isOutOfArea).

**System/PDF**
33. Keine JS-Fehler, 0 externe Requests nach Klick durch alle Tabs, Nachtmodus an/aus, Boot-Profil ändern.
34. PDF A4; Seite 1 enthält „MAYDAY“, „NAVTEX“, „Bremen“, „124 124“ oder „124124“, „JRCC“.
35. PDF: jeder Hafen genau einmal, Spalten vollständig, je Gruppe lat absteigend, kein Gruppenkopf als letzte Zeile einer Seite.
36. Keine Zahl in UI-Texten, die nicht aus `CONST`/Daten kommt: Regeln-Screen-Schwellen == `CONST` (Test liest DOM und vergleicht).

**Nachträge aus der Abnahme**
37. Rangfolge: `de-rerik` Wind N, Default-Profil → Level r (maxDraft rot schlägt „Schutz unbekannt“). `de-rerik` Wind N mit Flachkiel → n.
38. Ungeprüfte Brücke: Position 3 sm von `de-bro-fehmarnsund` (22 m, clearance ungeprüft), Mast 18,5 → Gate y mit „ungeprüft“ und „Reserve 2,5 m“; nie g. Synthetische Brücke 30 m `verified.clearance:true` → kein Gate (nur Info).

## 10. Abnahme (durch Opus, nicht Teil des Baus)
Tests selbst laufen lassen, alle Screenshots und PDF-Seiten ansehen, Stichprobe 15 Häfen gegen Quelle (Lotse-URL/Plan), Flugmodus-Test auf Honor 200 + Huawei-Tablet durch Christoph.

## 11. Bekannte Datenlücken (in App sichtbar, nicht im Code „reparieren“)
Freileitung Wittower Fähre ohne Höhe; Fehmarnsund 22/23 m, Gerüststatus nach 31.05.2026 unbelegt; Ziegelgraben-Koordinate Platzhalter; Seegebiets-Grenzen geschätzt; Hazard-Radien unbekannt; Schweden dünn (keine Zuflucht); DE ohne Pegel-je-Hafen; Heiligenhafen nur N/NW-Schutz abgeleitet; Burgtiefe Liegeplatz 1,8 m vs. maxDraft 2,8 m.
