"""Offline test: conversion matches the app format, files are written atomically."""
import json, os, tempfile, gzip
import collector as C

pts = json.load(open(os.path.join(os.path.dirname(__file__), "..", "data", "wxgrid.json")))["points"]
time = ["2026-07-15T%02d:00" % h for h in range(24)]
fc = [{"hourly": {"time": time, "wind_speed_10m": [10.04] * 24, "wind_direction_10m": [225] * 24, "wind_gusts_10m": [14.2] * 24, "weather_code": [3] * 24, "visibility": [24000] * 24}} for _ in pts]
ma = [{"hourly": {"time": time, "wave_height": [0.444] * 24, "wave_direction": [230] * 24}} for _ in pts]
snap = C.to_snapshot(pts, fc, ma, "2026-07-15T06:00:00.000Z")
assert snap["t0"] == 1784073600000 and snap["hours"] == 24, snap["t0"]
assert snap["ws"][0][0] == 10.0 and snap["wg"][0][0] == 14.2 and snap["wh"][0][0] == 0.44 and snap["wd"][0][0] == 225
d = tempfile.mkdtemp()
os.environ.update(SKIPPER_WX_OUT=d + "/www", SKIPPER_WX_ARCHIVE=d + "/arch")
raw = json.dumps(snap).encode()
p = C.archive(snap, raw, d + "/arch")
assert json.loads(gzip.decompress(open(p, "rb").read()))["fetchedAt"] == snap["fetchedAt"]
C.atomic_write(d + "/www/latest.json", raw)
assert json.load(open(d + "/www/latest.json"))["type"] == "skipper-ostsee-wx"
fu, mu = C.urls(pts)
assert "wind_speed_unit=kn" in fu and "forecast_days=7" in mu and fu.count(",") > 100
print("collector ok", p)
