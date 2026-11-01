import sys, time, itertools, json, pickle; sys.path.insert(0,'.')
from netcore import *
T=2; MAXD=62.0
N=build(T); P=N['P']; deep=N['deep']
H=harbours()
S=[snap(N,h['lat'],h['lon'],3.0) for h in H]
def los(j0,i0,j1,i1):
    J,I=seg_cells(j0,i0,j1,i1)
    if not P[J,I].all(): return None
    return int((~deep[J,I]).sum())
def pull(J,I):
    sh=np.cumsum(~deep[J,I])
    out=[0]; k=0; n=len(J)
    while k<n-1:
        lo,hi=k+1,n-1; best=k+1
        # greedy: largest m with LOS and shallow not increased
        while lo<=hi:
            m=(lo+hi)//2; s=los(J[k],I[k],J[m],I[m])
            if s is not None and s<= (sh[m]-sh[k])+1: best=m; lo=m+1
            else: hi=m-1
        out.append(best); k=best
    return [(int(J[q]),int(I[q])) for q in out]
def work(a):
    res=[]
    if not S[a]: return res
    s=N['idx'][S[a][1],S[a][2]]
    dist,pred=dijkstra(N['G'],indices=s,return_predecessors=True,limit=MAXD*2.2)
    for b in range(a+1,len(H)):
        if not S[b]: continue
        t=N['idx'][S[b][1],S[b][2]]
        if not np.isfinite(dist[t]): continue
        p=path(N,pred,s,t)
        if p is None: continue
        J,I=np.divmod(N['ids'][p],NX)
        L,_=plen(N,p)
        if L>MAXD: continue
        res.append((a,b,pull(J,I)))
    return res
if __name__=="__main__":
    from multiprocessing import Pool
    t0=time.time()
    with Pool(2) as pool:
        out=[]
        for k,r in enumerate(pool.imap_unordered(work,range(len(H)),chunksize=4)):
            out.extend(r)
            if k%50==0: print(k,len(out),round(time.time()-t0),flush=True)
    pickle.dump(dict(paths=out,snaps=S),open("paths.pkl","wb"))
    print("paths",len(out),round(time.time()-t0))
