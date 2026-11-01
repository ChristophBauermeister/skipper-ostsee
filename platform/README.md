# Plattform-Backup für den Törnplaner

Holt dasselbe Wetter-Raster wie die App (`data/wxgrid.json`, 108 Punkte) alle 3 Stunden von Open-Meteo, archiviert jeden Lauf und stellt `latest.json` für die App bereit („Vom Plattform-Backup“ bzw. automatischer Rückfall, wenn Open-Meteo nicht erreichbar ist).

Speicherung pro Lauf:
- gzip-Datei unter `/var/lib/skipper-wx/JJJJ/MM/TT/HHMMSS.json.gz`
- optional PostgreSQL-Tabelle `skipper_wx_snapshot` (jsonb, Duplikate per SHA-256 verworfen)
- `/var/www/skipper-wx/latest.json` (über nginx mit CORS für GitHub Pages)

## Installation (z. B. ops1)

```
sudo useradd --system --home /opt/skipper-wx --shell /usr/sbin/nologin skipperwx
sudo install -d -o skipperwx -g skipperwx /opt/skipper-wx /var/www/skipper-wx /var/lib/skipper-wx
sudo install -m 644 collector.py ../data/wxgrid.json /opt/skipper-wx/
# optional DB (db1):
psql "$DSN" -f schema.sql
echo 'SKIPPER_WX_DSN=postgresql://skipperwx:…@db1/aixion' | sudo tee /etc/skipper-wx.env && sudo chmod 600 /etc/skipper-wx.env
sudo apt install python3-psycopg        # nur mit DSN nötig
sudo install -m 644 skipper-wx.service skipper-wx.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now skipper-wx.timer
sudo systemctl start skipper-wx.service && journalctl -u skipper-wx.service -n 5
```

nginx: `nginx-skipper-wx.conf` in den passenden `server {}` einbinden, dann in der App unter Törn → Backup die URL eintragen, z. B. `https://<domain>/skipper-wx/latest.json`.

Last: 2 Aufrufe je Lauf, Open-Meteo zählt jeden Punkt als Aufruf → ca. 216 × 8 = 1.728 Aufrufe/Tag (frei bis 10.000/Tag, nur nicht-kommerziell). Attribution: Open-Meteo.com, DWD ICON / ICON-Wave, CC BY 4.0.

Test ohne Netz: `python3 test_collector.py`.
