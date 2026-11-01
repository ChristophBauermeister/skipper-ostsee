import sys,pickle; sys.path.insert(0,'.')
from netcore import *
from PIL import Image, ImageDraw
net=pickle.load(open("net.pkl","rb")); N=build(2)
name,lo0,lo1,la0,la1=sys.argv[1],*map(float,sys.argv[2:6]); sc=int(sys.argv[6]) if len(sys.argv)>6 else 3
i0=int((lo0-LON0)/DLON); i1=int((lo1-LON0)/DLON); j0=int((LAT1-la1)/DLAT); j1=int((LAT1-la0)/DLAT)
L=LAND[j0:j1,i0:i1]; D=DEPTH[j0:j1,i0:i1]
rgb=np.zeros(L.shape+(3,),np.uint8); rgb[:]=(40,90,200); rgb[np.isnan(D)]=(230,160,230)
rgb[D<5]=(90,170,240); rgb[D<3]=(150,220,250); rgb[D<2]=(255,230,160)
rgb[~N['P'][j0:j1,i0:i1]]=(130,130,130)
im=Image.fromarray(rgb).resize((L.shape[1]*sc,L.shape[0]*sc),Image.NEAREST); d=ImageDraw.Draw(im)
f=lambda c:((c[1]-i0+.5)*sc,(c[0]-j0+.5)*sc)
for (a,b),(Ln,sh,md,unk) in net['edges'].items():
    d.line([f(a),f(b)],fill=(220,0,0) if sh>0.05 else (0,120,0),width=1)
for c in net['hcell'].values(): x,y=f(c); d.ellipse([x-3,y-3,x+3,y+3],fill=(0,0,0))
im.save(f"net_{name}.png"); print(im.size)
