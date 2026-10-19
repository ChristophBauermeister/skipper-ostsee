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
