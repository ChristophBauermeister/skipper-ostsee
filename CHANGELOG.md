# Changelog

## v1 (18.10.2026)

Erstausgabe der Ostsee-App nach SPEC_v1.md, aufbauend auf Skipper-Assistent Sardinien v2.

- 430 Häfen (DE/DK/SE), 52 Brücken, 57 Gefahrenstellen, Funkdaten und Seegebiete aus `data/*.json`, per `tools/build.js` in eine `index.html` eingebettet.
- Tabs Lage, Zuflucht, Notfall, Regeln, Boot; Nachtmodus, Stepper mit Halten, Kompassrose (unbekannte Sektoren gestrichelt).
- Alle Schwellen laufen über `effThresholds` (Kinder −3, Vor-/Nachsaison −3, Untergrenzen).
- Gates: Bornholm- und Anholt/Kattegat-Überfahrt (greifen schon an den Absprunghäfen), Brücken (Masthöhe + Pegel), VTG, Gefahrengebiete, Trend, Starkwind > 12 h, Stettiner Haff.
- Hafenstatus mit Tiefe (Pegel, Surge), Ansteuerung, Seegang, Maßen, Saison, Zuflucht-Einstufung; unbekannte Daten sind nie grün.
- Bootsprofil mit localStorage; Sonnenauf-/untergang (NOAA); Seegebiet und Land zur Position.
- Bordkarte als PDF (Print-Stylesheet) und Akzeptanztests (§9, 36 Punkte).

## v1.1 (19.10.2026) Abnahme-Korrekturen

- Rangfolge im Hafenstatus jetzt r > n > y > g: ein bekannter roter Grund (z. B. max. Tiefgang) wird nicht mehr durch „unbekannt“ verdeckt.
- Brücken mit ungeprüfter Höhe sind nie grün: Reserve < 3,0 m gelb („Höhe ungeprüft, Reserve nur X m“), sonst nur Info. Fehmarnsund wird bei Mast 18,5 m gelb.
- PDF-Brückenseite zeigt bei ungeprüfter Höhe „ungeprüft“.
- Tests 37 und 38 ergänzt.

## v1.2 (19.10.2026) Abnahme Runde 2
- Brücken in der Nähe färben die Gesamtampel und die Kopfzeile nicht mehr: eigene Liste `res.bridges` und Block "Brücken in der Nähe" im Lage-Tab. Hafenstatus (bridgeIds) unverändert.
- Notfall-Tab: DSC-Distress/MAYDAY-CH-16-Block ganz oben; danach Nummern der Länder an der Position, 112, übrige Länder unter "Weitere Länder".
- PDF-Hafentabellen: Spalte Brücke nur "<Name> <Höhe> m" bzw. "<Name> ?".
- Tests 4/5 wieder mit Heiligenhafen als Grün-Kontrolle; Tests 10/11/12/38 auf `res.bridges`; Test 10 prüft zusätzlich overall g bei roter Brücke.

## v1.3 (19.10.2026) Eigner-Boot als Default
- Default-Profil: "Dehler 35 CWS (BJ 1994, Flachkiel)" 10,50 / 3,30 / Tiefgang 1,55 / Mast 19,0 m (Angabe Eigner 19.10.2026); Hinweis "Masthöhe geschätzt" entfällt dafür, Quellenzeile im Boot-Tab. 18,5 m nur noch in den Profilen "Dehler 35 (ab 2010)".
- PDF-Brückenseite: Spalte "Mast 19,0 m?" aus dem Default-Profil. Reserve-Angaben mit mindestens einer Nachkommastelle.
- Tests setzen das Boot explizit; neuer Test 39. SPEC_v1.md §3 angepasst.

## v1.4 (19.10.2026) Ziel, Kurs und Kurs zum Wind (SPEC §12)
- Lage-Tab: neuer Abschnitt "3 · Ziel" (Hafensuche, manuell Grad/Dezimalminuten, "Als Ziel" im Zuflucht-Tab, "Ziel löschen"); Ziel in `state.target` und localStorage.
- Loxodrome rwK/Distanz (Luftlinie), Windwinkel, Seite, Kurs zum Wind (Faustregel, im Regeln-Screen), Kreuzen mit 1,4-fachem Weg für die Fahrzeit.
- Kurs zum Wind automatisch aus Ziel; manuelle Eingabe gilt, mit Hinweis bei Abweichung und Button "Automatik".
- Zielhafen als Hafenkarte (Sonnenuntergang mit Ziel-ETA); Brücken nahe der Luftlinie nur als Hinweis, ohne Einfluss auf die Gesamtampel.
- Tests 40–47; Screenshots 11 und 12; Service-Worker-Cache `skipper-ostsee-v1.4-20261019`.

## v1.5 (19.10.2026) Änderungen der Koordination
- Brückenkorridor 7 sm neben der Luftlinie als nach Ampel und Abstand sortierte Liste im Ziel-Block.
- Fix: `seasonText` stürzt bei unvollständigen Saisondaten nicht mehr ab.
- Tests 45b/45c; `SKIPPER.harborCardHTML`; `bridges.json` mit neuen `tel`/`opening`-Werten.

## v1.6 (19.10.2026) Brücken: Öffnungszeiten und Kontakt (SPEC §13)
- `bridgeContactHTML`: Öffnung, UKW und Tel.; jede Nummer ein eigener `tel:`-Link, Zusatztext bleibt sichtbar; "Kontakt: nicht belegt" bei beweglichen Brücken ohne Tel und UKW; Badge "ungeprüft" bei `verified.tel===false`.
- Angezeigt im Banner "Brücken in der Nähe", in der Liste neben der Luftlinie, auf der Hafenkarte (einklappbar "Brückendetails"), in der Klappbrücken-Liste der Regeln und im PDF (neue Spalte "Tel.").
- Tests 48–51; Screenshot 13; SW-Cache `skipper-ostsee-v1.6-20261019`.

## v2.0 (01.11.2026) Törnplaner mit Wetter, Wegpunkt-Netz und Backup (SPEC §14)
- Neuer Tab „Törn“: Rundtörn, Ziel oder frei über 2–7 Tage aus der Open-Meteo-Vorhersage (Wind, Böen, Welle, Gewitter, Sicht), Abruf nur auf Tippen.
- Wegpunkt-Netz `data/seanet.json` (7382 Knoten, 13969 Kanten) aus GSHHG-Küste und GEBCO-2026-Tiefen, erzeugt mit `tools/seanet/`; Flachwasser < 3 m/unbelegt markiert und teurer; 16 Häfen in Schlei, Trave, Mariager und Randers Fjord nicht im Netz.
- Etappen werden mit der bestehenden Logik bewertet (Böen/Reff, Seegang, Kurs zum Wind, Kreuzen ×1,41, Bornholm/Anholt-Gate nur bei echter Überfahrt, Brücken an der Route, Tageslicht, Nachtschutz im Zielhafen). Rote Etappen werden nie geplant.
- Wegpunktliste je Etappe (GG°MM,m′, rwK, sm), Konfidenz je Tag, Alternativen für Tag 1, „Als Ziel“.
- Boot-Tab: „max. Etappe (h)“ (Default 8) und „Ankunft vor Sonnenuntergang“.
- Backup: jeder Wetterstand in IndexedDB (letzte 20), Export/Import als JSON, Plattform-URL als Rückfall; Collector für die eigene Plattform in `platform/` (Python, systemd-Timer, PostgreSQL, latest.json mit CORS).
- Design: Schrift Atkinson Hyperlegible (eingebettet, OFL), Seekarten-Palette, Überschriften ohne Versalien, Schritt-Nummern, 6 Tabs.
- Tests 52–60, Screenshots 14/15, SW-Cache `skipper-ostsee-v2.0-20261101`.

## v2.0.1 (01.11.2026)
- Eigenes App-Icon (Ostsee-Leuchtturm) statt des Sardinien-Icons; SW-Cache `skipper-ostsee-v2.0.1-20261101`.

## v2.0.2 (01.11.2026)
- Manifest mit eigener `id`, damit Android die App mit neuem Icon neu installieren kann; SW-Cache `skipper-ostsee-v2.0.2-20261101`.

## v2.1 (01.11.2026) Törnkarte und GPX (SPEC §15)
- Offline-Karte im Törn-Tab: Küste aus GSHHG (`data/coast.json`), Routen je Tag farbig, Tageshäfen nummeriert, Verschieben/Zoomen, Tag antippen hebt die Etappe hervor.
- Schalter „Online-Seekarte (OpenSeaMap)“: OSM-Karte mit Seezeichen-Overlay, nur wenn eingeschaltet.
- GPX-Export (teilen/speichern): eine Route je Segeltag, Häfen als Wegpunkte – für Navionics, OpenCPN, Plotter.
- Tests 61–64, Screenshot 16, SW-Cache `skipper-ostsee-v2.1-20261101`.

## v2.2 (01.11.2026) Angesehene Kartenkacheln offline (SPEC §15.4)
- Kacheln, die online angesehen wurden, bleiben auf dem Gerät (IndexedDB, max. 4000, 30 Tage frisch) und erscheinen ohne Netz; kein Vorab-Download (OSM-Nutzungsregeln).
- Anzeige des Speichers und Knopf zum Löschen. Test 65, SW-Cache `skipper-ostsee-v2.2-20261101`.

## v2.3 (01.11.2026) Gesamtstrecke und Nachtfahrten (SPEC §16)
- Törn-Formular: Gesamtstrecke in sm (optional) und Anzahl Nachtfahrten; Boot-Tab: max. Nachtfahrt (h, Default 24).
- Nachtfahrten nur durch Dunkelheit, gleiche Schwellen wie tags, Hinweis Ankunft bei Dunkelheit; Folgetag „Ankunft nach Nachtfahrt“.
- Tests 66–68, SW-Cache `skipper-ostsee-v2.3-20261101`.

## v2.4 (01.11.2026)
- Boot-Tab: Abschnitt „Über die App“ (Herausgeber Christoph Bauermeister, Entwicklung AIxion Systems, Quellen und Lizenzen). SW-Cache `skipper-ostsee-v2.4-20261101`.

## v2.5 (01.11.2026) Navily-Abgleich (SPEC §17)
- Lage-Tab: Wind/Böen/Seegang aus dem Wetterstand übernehmen.
- Hafenkarten: 72-h-Schutzverlauf in 3-h-Schritten mit Zusammenfassung.
- Meine Notiz je Hafen (Text, Sterne, war schon da), im Backup.
- Törnplaner: bis 3 Über-Häfen (z. B. Rund Fünen); Hinweis, wenn die Gesamtstrecke über dem Maximum liegt.
- Tests 69–72, SW-Cache `skipper-ostsee-v2.5-20261101`.
