import sys,pickle,random; sys.path.insert(0,'.')
from netcore import *
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra as dj
net=pickle.load(open("net.pkl","rb")); D=pickle.load(open("paths.pkl","rb"))
nodes=net['nodes']; ix={c:k for k,c in enumerate(nodes)}
r=[];c=[];w=[]
for (a,b),(L,sh,md,unk) in net['edges'].items():
    r.append(ix[a]);c.append(ix[b]);w.append(L+sh)
G=coo_matrix((w+w,(r+c,c+r)),shape=(len(nodes),)*2).tocsr()
N=build(2)
random.seed(3); sample=random.sample(D['paths'],300)
rat=[]
for a,b,p in sample:
    sa=D['snaps'][a]; sb=D['snaps'][b]
    d=dj(G,indices=ix[(sa[1],sa[2])])[ix[(sb[1],sb[2])]]
    # pulled path cost
    L=0
    for u,v in zip(p,p[1:]):
        J,I=seg_cells(*u,*v); n=len(J); l=math.hypot((u[0]-v[0])*NM_LAT,(u[1]-v[1])*NM_LON[u[0]]); L+=l+(~N['deep'][J,I]).sum()/n*l
    rat.append(d/L)
rat=np.array([x for x in rat if np.isfinite(x)]); print(len(rat)); print("ratio graph/pulled: mean",rat.mean().round(3),"max",rat.max().round(3),"min",rat.min().round(3), (rat>1.05).sum())
import json
print("nodes",len(nodes),"edges",len(net['edges']))
