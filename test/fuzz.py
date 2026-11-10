import random, sys
# uso: fuzz.py SEMILLA [N_EXPRESIONES] [SALIDA.c]
random.seed(int(sys.argv[1]) if len(sys.argv)>1 else 1)
VARS = {'a':'int','b':'int','c':'int','u':'uint','x':'float','y':'float','z':'double','ch':'char','L':'long'}
def rank(t):
    return {'char':0,'int':1,'uint':2,'long':3,'float':4,'double':5}[t]
def arith(a,b):
    if 'double' in (a,b): return 'double'
    if 'float' in (a,b): return 'float'
    if 'long' in (a,b): return 'long'
    if 'uint' in (a,b): return 'uint'
    return 'int'
def lit():
    r=random.random()
    if r<0.3: return (str(random.choice([0,1,2,3,5,7,10,100,1000,46341,2147483647])),'int')
    if r<0.55: return (random.choice(['0.5','1.5','2.25','0.1','3.14159','100.0','1e3','0.3']),'double')
    if r<0.7: return (random.choice(['0.5f','1.5f','0.1f','2.75f','10.0f']),'float')
    return (random.choice(list(VARS)), None)
def gen(d):
    if d==0 or random.random()<0.2:
        s,t=lit()
        if t is None: return (s,VARS[s])
        return (s,t)
    k=random.random()
    if k<0.55:
        op=random.choice('+-*/%')
        l=gen(d-1); r=gen(d-1)
        t=arith(l[1],r[1])
        if op=='%':
            if t in ('float','double'): op='+'
            else: r=('((%s)|1)'%r[0] if r[1] in ('int','char','long','uint') else r[0], r[1])
        if op=='/' and t not in ('float','double'):
            r=('((%s)|1)'%r[0] if r[1] in ('int','char','long','uint') else '(1+(int)(%s)*0)'%r[0], 'int' if r[1] not in ('int','char','long','uint') else r[1])
            t=arith(l[1],r[1])
        return ('(%s %s %s)'%(l[0],op,r[0]), t)
    if k<0.7:
        l=gen(d-1); r=gen(d-1)
        op=random.choice(['<','>','<=','>=','==','!='])
        return ('(%s %s %s)'%(l[0],op,r[0]),'int')
    if k<0.8:
        l=gen(d-1); r=gen(d-1)
        return ('(%s %s %s)'%(l[0],random.choice(['&&','||']),r[0]),'int')
    if k<0.88:
        e=gen(d-1)
        if e[1] in ('float','double'): return ('(%s + 0)'%e[0], e[1])   # el signo de un NaN negado no se reproduce igual (ver docs/COMPATIBILIDAD.md)
        return ('(-%s)'%e[0], 'int' if e[1]=='char' else e[1])
    if k<0.93:
        e=gen(d-1); return ('(!%s)'%e[0],'int')
    if k<0.97:
        c=gen(d-1); a=gen(d-1); b=gen(d-1)
        return ('(%s ? %s : %s)'%(c[0],a[0],b[0]), arith(a[1],b[1]))
    e=gen(d-1); t=random.choice(['int','float','double','long'])
    if e[1] in ('float','double') and t in ('int','long'): t='double'   # decimal fuera de rango a entero es comportamiento indefinido (docs/COMPATIBILIDAD.md): no se genera
    return ('((%s)%s)'%(t,e[0]), t)

N=int(sys.argv[2]) if len(sys.argv)>2 else 200
lines=['#include <stdio.h>','int main() {',
 ' int a=7,b=-3,c=100000; unsigned u=4000000000u; float x=2.5f,y=0.1f; double z=1.0/3; char ch=65; long L=3000000000L;']
for i in range(N):
    e,t=gen(random.randint(1,4))
    if t in ('float','double'): lines.append(' printf("%d: %%.9g\\n", (double)(%s));'%(i,e) if False else ' printf("%d: %%.9g\\n", %s);'%(i,e))
    elif t=='long': lines.append(' printf("%d: %%ld\\n", %s);'%(i,e))
    elif t=='uint': lines.append(' printf("%d: %%u\\n", %s);'%(i,e))
    else: lines.append(' printf("%d: %%d\\n", %s);'%(i,e))
lines.append(' return 0;\n}')
open(sys.argv[3] if len(sys.argv)>3 else '/tmp/fuzz.c','w').write('\n'.join(lines))
