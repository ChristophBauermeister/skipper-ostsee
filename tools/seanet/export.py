import sys,pickle,json,base64,math; sys.path.insert(0,'.')
from netcore import *
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
net=pickle.load(open("net.pkl","rb")); H=harbours()
nodes=net['nodes']; ix={c:k for k,c in enumerate(nodes)}
assert len(nodes)<65536
lat=np.array([cellll(*c)[0] for c in nodes]); lon=np.array([cellll(*c)[1] for c in nodes])
E=[]
for (a,b),(L,sh,md,unk) in sorted(net['edges'].items()):
    mdv=-1 if md is None or unk else max(0,min(126,int(math.floor(md))))
    E.append((ix[a],ix[b],min(255,int(round(sh*10))),mdv))
E=np.array(E)
G=coo_matrix((np.ones(len(E)),(E[:,0],E[:,1])),shape=(len(nodes),)*2)
nc,lab=connected_components(G,directed=False); from collections import Counter
main=Counter(lab).most_common(1)[0][0]
att={}; notin=[]
for k,h in enumerate(H):
    c=net['hcell'].get(k)
    if c is None or c not in ix or lab[ix[c]]!=main: notin.append(h['id']); continue
    att[h['id']]=[ix[c],round(net['snaps'][k][0],2)]
b64=lambda a,dt:base64.b64encode(np.asarray(a,dt).tobytes()).decode()
out={"version":"seanet-1","built":"2026-11-01",
 "sources":["GSHHG 2.3.7 full resolution (Wessel & Smith, NOAA NCEI, LGPL) via basemap-data-hires 2.0.0","GEBCO 2026 Grid (GEBCO Bathymetric Compilation Group 2026, doi:10.5285/4f68d5c7-45eb-f999-e063-7086abc036fa), gelesen aus markmclaren/global-bathymetry-pmtiles z9 (Terrain-RGB)"],
 "method":"Raster 0,002° × 0,0035° (≈ 220 m); Zelle Wasser, wenn ≥ 2/16 Teilpixel Wasser (GSHHG). Kürzeste Wege zwischen allen Hafenpaaren ≤ 62 sm (Flachwasser < 3 m GEBCO oder Tiefe unbelegt doppelt gewichtet), Sichtlinien-Vereinfachung, Knoten im Umkreis 0,3 sm zusammengefasst.",
 "deepM":3.0,"shallowPenalty":1.0,
 "n":len(nodes),"m":len(E),
 "lat":b64(np.rint(lat*1e5),'<i4'),"lon":b64(np.rint(lon*1e5),'<i4'),
 "ea":b64(E[:,0],'<u2'),"eb":b64(E[:,1],'<u2'),"esh":b64(E[:,2],'u1'),"emd":b64(E[:,3],'i1'),
 "harbours":att,"notInNet":notin}
json.dump(out,open("../../data/seanet.json","w"),separators=(',',':'))
print(len(nodes),len(E),"attached",len(att),"notin",len(notin),notin)
# weather grid
pts=[]
for la in np.arange(53.75,57.76,0.25):
    for lo in np.arange(9.5,15.76,0.5):
        d=np.min(np.hypot((lat-la)*60,(lon-lo)*60*math.cos(math.radians(la))))
        if d<=12: pts.append([round(float(la),2),round(float(lo),2)])
json.dump({"version":"wxgrid-1","note":"Abfragepunkte Open-Meteo: Raster 0,25° Breite × 0,5° Länge, nur Punkte mit Netzknoten ≤ 12 sm","points":pts},open("../../data/wxgrid.json","w"),separators=(',',':'))
print("wx points",len(pts))
