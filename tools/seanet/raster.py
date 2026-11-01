import numpy as np, pickle, glob, math
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS=None
LON0,LON1,LAT0,LAT1=9.3,15.85,53.7,58.0
DLON,DLAT=0.0035,0.002
NX=int(round((LON1-LON0)/DLON)); NY=int(round((LAT1-LAT0)/DLAT))
SS=4
W,H=NX*SS,NY*SS
img=Image.new("L",(W,H),0); dr=ImageDraw.Draw(img)
polys=pickle.load(open("gshhs_region.pkl","rb"))
for lev,a in sorted(polys,key=lambda t:t[0]):
    x=(a[:,0]-LON0)/DLON*SS; y=(LAT1-a[:,1])/DLAT*SS
    if x.max()<0 or x.min()>W or y.max()<0 or y.min()>H: continue
    dr.polygon(list(zip(x.tolist(),y.tolist())),fill=1 if lev%2==1 else 0)
land=np.array(img,dtype=np.uint8).reshape(NY,SS,NX,SS).sum(axis=(1,3))  # 0..16 land subpixels
# GEBCO z9
Z=9; n=2**Z
tiles={}
for f in glob.glob("gebco/9_*.webp"):
    _,x,y=f[6:-5].split("_"); a=np.array(Image.open(f).convert("RGB")).astype(np.int64)
    tiles[(int(x),int(y))]=-10000+(a[...,0]*65536+a[...,1]*256+a[...,2])*0.1
TS=next(iter(tiles.values())).shape[0]-1  # 257 -> buffered? use 256
depth=np.full((NY,NX),np.nan,dtype=np.float32)
lats=LAT1-(np.arange(NY)+0.5)*DLAT; lons=LON0+(np.arange(NX)+0.5)*DLON
gx=(lons+180)/360*n
for j,la in enumerate(lats):
    gy=(1-math.asinh(math.tan(math.radians(la)))/math.pi)/2*n
    ty=int(gy); py=min(int((gy-ty)*256),255)
    for i in range(NX):
        tx=int(gx[i]); px=min(int((gx[i]-tx)*256),255)
        t=tiles.get((tx,ty))
        if t is None: continue
        v=t[py,px]
        if v>-9000: depth[j,i]=-v
print(NX,NY, (land==0).mean(), np.nanmin(depth), np.nanmax(depth))
np.savez_compressed("grid.npz",land=land,depth=depth,meta=np.array([LON0,LAT1,DLON,DLAT,NX,NY]))
