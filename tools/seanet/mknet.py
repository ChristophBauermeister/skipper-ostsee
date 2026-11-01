import sys, pickle, json, math, heapq; sys.path.insert(0,'.')
from netcore import *
from collections import Counter, defaultdict
N=build(2); P=N['P']; deep=N['deep']
D=pickle.load(open("paths.pkl","rb")); paths=D['paths']; S=D['snaps']
H=harbours()
hcell={k:(s[1],s[2]) for k,s in enumerate(S) if s}
ends=set(hcell.values())
cnt=Counter(v for _,_,p in paths for v in p[1:-1])
R=float(sys.argv[1]) if len(sys.argv)>1 else 0.3
def dnm(a,b): return math.hypot((a[0]-b[0])*NM_LAT,(a[1]-b[1])*NM_LON[a[0]])
rep={}; centers=[]; grid=defaultdict(list); G=0.5
def key(c): return (int(c[0]*NM_LAT/G),int(c[1]*NM_LON[c[0]]/G))
for c in ends: rep[c]=c
for v,_ in cnt.most_common():
    if v in rep: continue
    k=key(v); best=None
    for dj in (-1,0,1):
        for di in (-1,0,1):
            for c in grid[(k[0]+dj,k[1]+di)]:
                d=dnm(v,c)
                if d<=R and (best is None or d<best[0]): best=(d,c)
    if best and los_ok(best[1],v) if False else best:
        rep[v]=best[1]
    else:
        rep[v]=v; grid[k].append(v)
def lineinfo(a,b):
    J,I=seg_cells(a[0],a[1],b[0],b[1])
    if not P[J,I].all(): return None
    L=dnm(a,b); n=len(J); sh=(~deep[J,I]).sum()/n*L
    dv=DEPTH[J,I]; unk=bool(np.isnan(dv).any()); md=float(np.nanmin(dv)) if (~np.isnan(dv)).any() else None
    return L,sh,md,unk
edges={}
fail=0
def add(a,b):
    if a==b: return True
    k=(a,b) if a<b else (b,a)
    if k in edges: return True
    li=lineinfo(a,b)
    if li is None: return False
    edges[k]=li; return True
fb=0
for _,_,p in paths:
    chain=[p[0]]+[rep.get(o,o) for o in p[1:-1]]+[p[-1]]
    ch=[c for k,c in enumerate(chain) if k==0 or c!=chain[k-1]]
    infos=[lineinfo(a,b) for a,b in zip(ch,ch[1:])]
    if any(i is None for i in infos):
        fb+=1; ch=p; infos=[lineinfo(a,b) for a,b in zip(ch,ch[1:])]
        if any(i is None for i in infos): fail+=1; continue
    for a,b,i in zip(ch,ch[1:],infos):
        if a==b: continue
        k=(a,b) if a<b else (b,a); edges[k]=i
print("fallback",fb)
nodes=sorted({c for k in edges for c in k}|set(hcell.values()))
print("nodes",len(nodes),"edges",len(edges),"fail",fail)
pickle.dump(dict(nodes=nodes,edges=edges,hcell=hcell,snaps=S),open("net.pkl","wb"))
