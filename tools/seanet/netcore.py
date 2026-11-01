import numpy as np, math, json, glob
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
g=np.load("grid.npz"); LAND=g["land"]; DEPTH=g["depth"]
LON0,LAT1,DLON,DLAT,NX,NY=g["meta"]; NX=int(NX); NY=int(NY)
LATS=LAT1-(np.arange(NY)+0.5)*DLAT
NM_LAT=DLAT*60.0                      # sm per row
NM_LON=DLON*60.0*np.cos(np.radians(LATS))  # sm per col, by row
def cell(lat,lon): return int((LAT1-lat)/DLAT), int((lon-LON0)/DLON)
def cellll(j,i): return LAT1-(j+0.5)*DLAT, LON0+(i+0.5)*DLON
def build(T=4, extra_open=None, deep_m=3.0, shallow_pen=2.0):
    P=(16-LAND)>=T
    if extra_open is not None: P|=extra_open
    deep=np.nan_to_num(DEPTH,nan=0)>=deep_m
    idx=np.full((NY,NX),-1,np.int64); ids=np.flatnonzero(P.ravel()); idx.ravel()[ids]=np.arange(len(ids))
    rows=[];cols=[];w=[]
    J,I=np.divmod(ids,NX)
    for dj,di in [(0,1),(1,0),(1,1),(1,-1)]:
        j2=J+dj;i2=I+di; ok=(j2<NY)&(i2>=0)&(i2<NX)
        a=ids[ok]; jj=j2[ok]; ii=i2[ok]; b=idx[jj,ii]; m=b>=0
        a=a[m]; b=b[m]; ja=J[ok][m]; ia=I[ok][m]; jb=jj[m]; ib=ii[m]
        # knight moves: require intermediate cells passable
        if abs(dj)+abs(di)==3:
            mj=ja+(1 if dj==2 else 0)*0; 
            c1=P[ja+ (dj//2 if dj==2 else dj), ia+(di//2 if abs(di)==2 else 0)] if False else None
        lat=(LATS[ja]+LATS[jb])/2
        d=np.hypot(dj*NM_LAT, di*DLON*60*np.cos(np.radians(lat)))
        sh=~(deep[ja,ia]&deep[jb,ib])
        cost=d*np.where(sh,shallow_pen,1.0)
        rows.append(idx[ja,ia]);cols.append(b);w.append(cost)
    r=np.concatenate(rows);c=np.concatenate(cols);ww=np.concatenate(w)
    G=coo_matrix((np.r_[ww,ww],(np.r_[r,c],np.r_[c,r])),shape=(len(ids),len(ids))).tocsr()
    return dict(P=P,deep=deep,idx=idx,ids=ids,G=G)
def harbours():
    return [h for f in sorted(glob.glob('../../data/harbours-*.json')) for h in json.load(open(f))]
def snap(N,lat,lon,maxnm=3.0):
    j,i=cell(lat,lon); best=None
    R=int(maxnm/NM_LAT)+2
    for jj in range(max(0,j-R),min(NY,j+R+1)):
        for ii in range(max(0,i-2*R),min(NX,i+2*R+1)):
            if N['P'][jj,ii]:
                d=math.hypot((jj-j)*NM_LAT,(ii-i)*NM_LON[jj])
                if d<=maxnm and (best is None or d<best[0]): best=(d,jj,ii)
    return best
def path(N,pred,src,dst):
    out=[];k=dst
    while k!=-9999 and k>=0:
        out.append(k)
        if k==src: break
        k=pred[k]
    return out[::-1] if out and out[-1]==src else None
def seg_cells(j0,i0,j1,i1):
    n=int(max(abs(j1-j0),abs(i1-i0))*2)+1
    t=np.linspace(0,1,n+1); return np.rint(j0+(j1-j0)*t).astype(int), np.rint(i0+(i1-i0)*t).astype(int)
def plen(N,cells):
    J,I=np.divmod(N['ids'][cells],NX); L=0;S=0
    for k in range(1,len(J)):
        d=math.hypot((J[k]-J[k-1])*NM_LAT,(I[k]-I[k-1])*NM_LON[J[k]])
        L+=d
        if not(N['deep'][J[k],I[k]] and N['deep'][J[k-1],I[k-1]]): S+=d
    return L,S
