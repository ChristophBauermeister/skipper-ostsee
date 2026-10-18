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
