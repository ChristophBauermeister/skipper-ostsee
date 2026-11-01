import numpy as np, json
D="bm/mpl_toolkits/basemap_data/"
raw=open(D+"gshhs_f.dat","rb").read()
polys=[]
for line in open(D+"gshhsmeta_f.dat"):
    p=line.split(); lev=int(p[0]); n=int(p[2]); s=float(p[3]); nn=float(p[4]); off=int(p[5]); nb=int(p[6])
    if nn<53.5 or s>58.3: continue
    a=np.frombuffer(raw[off:off+nb],dtype='<f4').reshape(-1,2).astype(float)
    if a[:,0].max()>360 or abs(a[:,1]).max()>90: a=np.frombuffer(raw[off:off+nb],dtype='>f4').reshape(-1,2).astype(float)
    lon=a[:,0].copy(); lon[lon>180]-=360
    if lon.max()<9.0 or lon.min()>16.0: continue
    polys.append((lev,np.c_[lon,a[:,1]]))
print(len(polys), [ (l,len(x)) for l,x in polys[:5]])
import pickle; pickle.dump(polys,open("gshhs_region.pkl","wb"))
