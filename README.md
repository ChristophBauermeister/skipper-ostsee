# Skipper-Assistent Ostsee

Offline-App (eine `index.html`) für Törns in der westlichen Ostsee, Dänischen Südsee, Bornholm und Kattegat: Lagebewertung, Zuflucht, Notfall/Funk, Törnplaner mit Wetter (Open-Meteo, nur auf Tippen), Regeln, Bootsprofil. Spezifikation: `SPEC_v1.md`.

## Bauen und testen

```
node tools/build.js                      # src/app.html + data/*.json -> index.html
cd .. && NODE_PATH=$(npm root -g) node skipper-ostsee/tests/logic.test.js   # Tests, baut auch das PDF
NODE_PATH=$(npm root -g) node skipper-ostsee/tests/screens.js               # Screenshots in screens/
```

`data/*.json` nicht von Hand ändern (`seanet.json` erzeugt `tools/seanet/`). Keine Abhängigkeiten; externe Requests nur auf Tippen im Törn-Tab (Open-Meteo bzw. eigene Plattform-URL). Plattform-Backup: `platform/README.md`.

Alle Schwellen ohne Quelle sind Faustregeln. Ersetzt weder Seekarte noch Revierführer noch amtlichen Seewetterbericht.
