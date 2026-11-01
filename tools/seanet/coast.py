"""Simplified coastline for the offline map (data/coast.json).
Input: gshhs_region.pkl (read_gshhs.py). Output: land polygons in Web-Mercator pixel
coordinates at zoom 10 (256*2^10 px world), simplified, delta-encoded integers.
"""
import pickle, json, math, sys
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
TOL = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0   # px at z10
MIN_AREA = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0  # px² at z10
W = 256 * 2 ** 10
def merc(lon, lat):
    x = (lon + 180) / 360 * W
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * W
    return x, y
LON0, LON1, LAT0, LAT1 = 8.8, 16.3, 53.3, 58.4
clip = box(*merc(LON0, LAT1), *merc(LON1, LAT0))
polys = pickle.load(open("gshhs_region.pkl", "rb"))
land, lakes = [], []
for lev, a in polys:
    if a[:, 0].max() < LON0 or a[:, 0].min() > LON1 or a[:, 1].max() < LAT0 or a[:, 1].min() > LAT1:
        continue
    pts = [merc(lo, la) for lo, la in a]
    p = Polygon(pts).buffer(0)
    p = p.intersection(clip)
    if p.is_empty:
        continue
    (land if lev % 2 == 1 else lakes).append(p)
geom = unary_union(land)
if lakes:
    geom = geom.difference(unary_union(lakes))
geom = geom.simplify(TOL, preserve_topology=True)
parts = list(geom.geoms) if hasattr(geom, "geoms") else [geom]
out = []
n = 0
for p in parts:
    if p.area < MIN_AREA:
        continue
    rings = [p.exterior] + list(p.interiors)
    for r in rings:
        c = [(int(round(x)), int(round(y))) for x, y in r.coords]
        if len(c) < 4:
            continue
        d = [c[0][0], c[0][1]]
        for (x0, y0), (x1, y1) in zip(c, c[1:]):
            if x1 == x0 and y1 == y0:
                continue
            d += [x1 - x0, y1 - y0]
        out.append(d)
        n += len(d) // 2
json.dump({"version": "coast-1", "z": 10, "source": "GSHHG 2.3.7 full (NOAA NCEI, LGPL), vereinfacht %.1f px bei z10" % TOL,
           "bbox": [LON0, LAT0, LON1, LAT1], "rings": out}, open("../../data/coast.json", "w"), separators=(",", ":"))
print("rings", len(out), "points", n)
