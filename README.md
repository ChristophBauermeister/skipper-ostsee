# Skipper-Assistent Ostsee

Offline-App (eine `index.html`) für Törns in der westlichen Ostsee, Dänischen Südsee, Bornholm und Kattegat: Lagebewertung, Zuflucht, Notfall/Funk, Regeln, Bootsprofil. Spezifikation: `SPEC_v1.md`.

## Bauen und testen

```
node tools/build.js                      # src/app.html + data/*.json -> index.html
cd .. && NODE_PATH=$(npm root -g) node skipper-ostsee/tests/logic.test.js   # Tests, baut auch das PDF
NODE_PATH=$(npm root -g) node skipper-ostsee/tests/screens.js               # Screenshots in screens/
```

`data/*.json` nicht von Hand ändern. Keine externen Requests, keine Abhängigkeiten.

Alle Schwellen ohne Quelle sind Faustregeln. Ersetzt weder Seekarte noch Revierführer noch amtlichen Seewetterbericht.
