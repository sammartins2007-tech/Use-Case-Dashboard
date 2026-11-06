import json,sys
i=sys.argv[1]; d=json.load(open(f'solutions/{i}.json')); e=[]
t=d.get('techViews')
if not isinstance(t,dict): print('missing techViews'); sys.exit(1)
def s(v,n,mx=None):
    if not isinstance(v,str) or not v.strip(): e.append(f'{n} empty')
    elif mx and len(v.split())>mx: e.append(f'{n} > {mx} words')
L=t.get('layers',{}); s(L.get('headline'),'layers.headline',16)
ids=[x.get('id') for x in L.get('layers',[])]
if ids!=['experience','intelligence','orchestration','data','platform']: e.append(f'layer ids {ids}')
for x in L.get('layers',[]):
    c=x.get('components',[])
    if not 1<=len(c)<=5: e.append(f'{x.get("id")} components {len(c)}')
    for k in c:
        for f in ('name','product'): s(k.get(f),f'{x.get("id")}.{f}')
        s(k.get('role'),f'{x.get("id")}.role',14)
        if k.get('status') not in ('existing','new','to-confirm'): e.append('bad status')
C=t.get('context',{}); s(C.get('headline'),'context.headline',16); s(C.get('system'),'system')
if not 2<=len(C.get('actors',[]))<=5: e.append('actors count')
for a in C.get('actors',[]): s(a.get('name'),'actor.name'); s(a.get('interaction'),'actor.interaction',12)
if not 2<=len(C.get('systems',[]))<=6: e.append('systems count')
for a in C.get('systems',[]):
    s(a.get('name'),'sys.name'); s(a.get('exchange'),'sys.exchange',12)
    if a.get('kind') not in ('customer','microsoft','external'): e.append('sys.kind')
    if a.get('direction') not in ('in','out','both'): e.append('sys.direction')
D=t.get('data',{}); s(D.get('headline'),'data.headline',16); s(D.get('residency'),'residency')
if not 1<=len(D.get('sources',[]))<=6: e.append('sources count')
for a in D.get('sources',[]):
    for f in ('name','system','format','volume','access'): s(a.get(f),'src.'+f)
    if a.get('classification') not in ('Public','Internal','Confidential','Highly confidential','To confirm'): e.append('classification')
if not 3<=len(D.get('pipeline',[]))<=6: e.append('pipeline count')
for a in D.get('pipeline',[]):
    if a.get('stage') not in ('Capture','Ingest','Index','Ground','Reason','Act','Store','Monitor'): e.append('stage '+str(a.get('stage')))
    s(a.get('what'),'pipe.what',14); s(a.get('product'),'pipe.product')
if not 1<=len(D.get('outputs',[]))<=4: e.append('outputs count')
for a in D.get('outputs',[]):
    for f in ('name','store','retention'): s(a.get(f),'out.'+f)
Dc=t.get('decisions',[])
if not 2<=len(Dc)<=4: e.append('decisions count')
for a in Dc:
    s(a.get('question'),'dec.q'); s(a.get('why'),'dec.why',30)
    o=a.get('options',[])
    if not 2<=len(o)<=3 or a.get('choice') not in o: e.append('dec options/choice')
    if not isinstance(a.get('ref'),str): e.append('dec.ref')
N=t.get('nfr',[])
if not 4<=len(N)<=7: e.append('nfr count')
for a in N:
    if a.get('area') not in ('Security','Identity','Licensing','Scale & limits','Cost','Operations','Compliance','Responsible AI'): e.append('nfr.area')
    s(a.get('point'),'nfr.point',28)
print('OK' if not e else '; '.join(sorted(set(e))[:12])); sys.exit(1 if e else 0)
