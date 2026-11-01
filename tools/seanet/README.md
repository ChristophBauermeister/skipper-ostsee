# Wegpunkt-Netz (`data/seanet.json`)

Wird offline erzeugt, nicht beim normalen Build. Arbeitsverzeichnis: dieser Ordner (Zwischendateien `gebco/`, `bm/`, `*.npz`, `*.pkl` nicht einchecken).

```
pip install --break-system-packages pmtiles mercantile scipy pillow numpy
pip download basemap-data-hires --no-deps -d /tmp/bm && mkdir -p bm && (cd bm && unzip -q /tmp/bm/*.whl)
python3 fetch_gebco.py 9      # GEBCO 2026 z9-Kacheln (Range-Requests auf Hugging Face)
python3 read_gshhs.py         # GSHHG full -> gshhs_region.pkl
python3 raster.py             # -> grid.npz (Land 16 Teilpixel, Tiefe GEBCO)
python3 buildnet.py           # Hafenpaare <= 62 sm -> paths.pkl (~3 min, 2 Kerne)
python3 mknet.py 0.3          # Knoten zusammenfassen -> net.pkl
python3 evalnet.py            # Kontrolle: Netz-/Rasterweg, Verhältnis ~1,0
python3 export.py             # -> ../../data/seanet.json, ../../data/wxgrid.json
python3 drawnet.py suedsee 10.1 11.1 54.75 55.15 2   # Sichtprüfung als PNG
python3 coast.py 1.0 2        # -> ../../data/coast.json (Offline-Karte im Törn-Tab)
```

Quellen: GSHHG 2.3.7 full (NOAA NCEI, LGPL), GEBCO 2026 Grid (gemeinfrei). Beide ausdrücklich **nicht für die Navigation**. Das Netz ist eine Planungshilfe: Tiefen < 3 m oder unbelegt zählen als Flachwasser („nur im betonnten Fahrwasser“), schmale Fjorde/Flüsse (Schlei, Trave, Mariager, Randers) fehlen in GSHHG und sind als `notInNet` markiert.
