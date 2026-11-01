#!/usr/bin/env python3
"""Skipper Ostsee weather collector (SPEC §14.3).

Fetches the same Open-Meteo grid as the app (data/wxgrid.json), converts it to the
app's snapshot format, archives every run (gzip file + optional PostgreSQL) and
publishes latest.json for the app's "Plattform-Backup".

Stdlib only; PostgreSQL via psycopg (v3) if SKIPPER_WX_DSN is set.
Env:
  SKIPPER_WX_GRID   path to wxgrid.json            (default: ./wxgrid.json)
  SKIPPER_WX_OUT    directory for latest.json      (default: /var/www/skipper-wx)
  SKIPPER_WX_ARCHIVE directory for archive files   (default: /var/lib/skipper-wx)
  SKIPPER_WX_DSN    PostgreSQL DSN (optional)
  SKIPPER_WX_UA     User-Agent                     (default: skipper-ostsee-collector)
"""
import datetime as dt
import gzip
import hashlib
import json
import os
import sys
import tempfile
import time
import urllib.parse
import urllib.request

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
HOURLY = "wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,visibility"
MARINE_HOURLY = "wave_height,wave_direction"
DAYS = 7


def env(k, d):
    return os.environ.get(k, d)


def load_points(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)["points"]


def urls(points):
    la = ",".join(str(p[0]) for p in points)
    lo = ",".join(str(p[1]) for p in points)
    f = {"latitude": la, "longitude": lo, "hourly": HOURLY, "wind_speed_unit": "kn", "forecast_days": DAYS, "timezone": "GMT"}
    m = {"latitude": la, "longitude": lo, "hourly": MARINE_HOURLY, "forecast_days": DAYS, "timezone": "GMT"}
    return (FORECAST_URL + "?" + urllib.parse.urlencode(f, safe=","), MARINE_URL + "?" + urllib.parse.urlencode(m, safe=","))


def get_json(url, ua, tries=3):
    err = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # network, HTTP, JSON
            err = e
            time.sleep(5 * (i + 1))
    raise err


def parse_time(s):
    s = str(s)
    if len(s) <= 16:
        s += ":00"
    return int(dt.datetime.fromisoformat(s).replace(tzinfo=dt.timezone.utc).timestamp() * 1000)


def to_snapshot(points, fc, ma, fetched_at):
    """Same conversion as wxFromOpenMeteo() in the app."""
    F = fc if isinstance(fc, list) else [fc]
    M = (ma if isinstance(ma, list) else [ma]) if ma else None
    if len(F) != len(points):
        raise ValueError("Open-Meteo returned %d of %d points" % (len(F), len(points)))
    t = F[0]["hourly"]["time"]
    t0, hours = parse_time(t[0]), len(t)

    def col(src, k, dec=None):
        out = []
        for o in src:
            a = (o or {}).get("hourly", {}).get(k)
            if a is None:
                out.append(None)
                continue
            out.append([None if v is None else (round(v * dec) / dec if dec else int(round(v))) for v in a[:hours]])
        return out

    snap = {"type": "skipper-ostsee-wx", "version": 1, "fetchedAt": fetched_at, "source": "open-meteo",
            "points": points, "t0": t0, "hours": hours,
            "ws": col(F, "wind_speed_10m", 10), "wd": col(F, "wind_direction_10m"), "wg": col(F, "wind_gusts_10m", 10),
            "wc": col(F, "weather_code"), "vis": col(F, "visibility"),
            "wh": col(M, "wave_height", 100) if M else None, "wdir": col(M, "wave_direction") if M else None}
    if M:
        mt = (M[0] or {}).get("hourly", {}).get("time")
        if mt:
            sh = round((parse_time(mt[0]) - t0) / 3600000)
            if sh:
                for k in ("wh", "wdir"):
                    new = []
                    for a in snap[k]:
                        if a is None:
                            new.append(None)
                            continue
                        o = [None] * hours
                        for i, v in enumerate(a):
                            if 0 <= i + sh < hours:
                                o[i + sh] = v
                        new.append(o)
                    snap[k] = new
    return snap


def atomic_write(path, data):
    d = os.path.dirname(path) or "."
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=d, prefix=".tmp-")
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    os.chmod(tmp, 0o644)
    os.replace(tmp, path)


def archive(snap, raw, adir):
    ts = dt.datetime.fromisoformat(snap["fetchedAt"].replace("Z", "+00:00"))
    p = os.path.join(adir, ts.strftime("%Y/%m/%d"), ts.strftime("%H%M%S") + ".json.gz")
    atomic_write(p, gzip.compress(raw))
    return p


def store_db(dsn, snap, raw, sha):
    import psycopg  # only needed with a DSN
    with psycopg.connect(dsn) as con:
        con.execute(
            "INSERT INTO skipper_wx_snapshot (fetched_at, source, t0, hours, n_points, has_marine, sha256, payload) "
            "VALUES (%s, %s, to_timestamp(%s / 1000.0), %s, %s, %s, %s, %s::jsonb) ON CONFLICT (sha256) DO NOTHING",
            (snap["fetchedAt"], snap["source"], snap["t0"], snap["hours"], len(snap["points"]), snap["wh"] is not None, sha, raw.decode("utf-8")))


def run():
    points = load_points(env("SKIPPER_WX_GRID", "wxgrid.json"))
    ua = env("SKIPPER_WX_UA", "skipper-ostsee-collector")
    fu, mu = urls(points)
    fetched_at = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    fc = get_json(fu, ua)
    try:
        ma = get_json(mu, ua)
    except Exception as e:
        print("marine failed: %s (snapshot without waves)" % e, file=sys.stderr)
        ma = None
    snap = to_snapshot(points, fc, ma, fetched_at)
    raw = json.dumps(snap, separators=(",", ":")).encode("utf-8")
    sha = hashlib.sha256(raw).hexdigest()
    p = archive(snap, raw, env("SKIPPER_WX_ARCHIVE", "/var/lib/skipper-wx"))
    dsn = os.environ.get("SKIPPER_WX_DSN")
    if dsn:
        store_db(dsn, snap, raw, sha)
    atomic_write(os.path.join(env("SKIPPER_WX_OUT", "/var/www/skipper-wx"), "latest.json"), raw)
    print("ok %s points=%d hours=%d marine=%s archive=%s db=%s" % (fetched_at, len(points), snap["hours"], snap["wh"] is not None, p, bool(dsn)))


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print("collector failed: %s" % e, file=sys.stderr)
        sys.exit(1)
