import sys, os, urllib.request, mercantile
from pmtiles.reader import Reader
from concurrent.futures import ThreadPoolExecutor
URL="https://huggingface.co/datasets/markmclaren/global-bathymetry-pmtiles/resolve/main/gebco_2026_terrain_rgb.pmtiles"
def get(o,l):
    for t in range(4):
        try:
            r=urllib.request.Request(URL,headers={"Range":f"bytes={o}-{o+l-1}"})
            return urllib.request.urlopen(r,timeout=90).read()
        except Exception as e: err=e
    raise err
rd=Reader(get)
Z=int(sys.argv[1])
tiles=list(mercantile.tiles(9.3,53.7,15.85,58.0,Z))
print(len(tiles))
def job(t):
    p=f"gebco/{Z}_{t.x}_{t.y}.webp"
    if os.path.exists(p): return
    d=rd.get(Z,t.x,t.y)
    if d: open(p,"wb").write(d)
with ThreadPoolExecutor(8) as ex: list(ex.map(job,tiles))
print("done", len(os.listdir("gebco")))
