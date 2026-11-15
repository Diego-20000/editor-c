# Generador de programas completos (con instrucciones) para comparar el editor contra gcc.
# uso: fuzz2.py SEMILLA SALIDA.c   -> escribe SALIDA.c y SALIDA.in (la entrada que lee el programa)
# Determinista por semilla. Solo genera programas SIN comportamiento indefinido:
#  - todo se inicializa; los enteros se mantienen chicos (cada asignación pasa por ACOTAR, así no hay desborde);
#  - los índices de arreglos salen de un resto positivo o de un contador del lazo, siempre dentro de rango;
#  - en cada expresión hay como mucho un efecto (una asignación o una llamada con efecto): el orden entre dos no está definido;
#  - se divide solo por constantes distintas de cero; los formatos coinciden con el tipo; los lazos tienen tope fijo.
import random, sys

seed = int(sys.argv[1]); out = sys.argv[2]
R = random.Random(seed)
L = []          # líneas del programa
ENT = []        # entrada (una cadena por valor o línea)
N1, N2F, N2C = R.randint(4, 9), R.randint(2, 4), R.randint(2, 5)
INTS = ['A', 'B', 'C', 'D']; FLTS = ['X', 'Y']; DBLS = ['P', 'Q']
ctr = [0]
def nuevo(pref):
    ctr[0] += 1; return pref + str(ctr[0])

def e_int(d=0, extra=()):
    """expresión entera de valor acotado (operandos menores que 1000 en valor absoluto)"""
    hojas = INTS + list(extra)
    r = R.random()
    if d > 2 or r < 0.3: return R.choice(hojas) if R.random() < 0.7 else str(R.randint(-20, 20))
    if r < 0.5: return '(%s %s %s)' % (e_int(d + 1, extra), R.choice('+-'), e_int(d + 1, extra))
    if r < 0.6: return '(%s * %d)' % (e_int(d + 1, extra), R.randint(-3, 3))
    if r < 0.72: return '(%s %s %d)' % (e_int(d + 1, extra), R.choice('/%'), R.choice([2, 3, 5, 7, -2, -3]))
    if r < 0.8: return 'V[IDX(%s)]' % e_int(d + 1, extra)
    if r < 0.85: return 'M[IDX2F(%s)][IDX2C(%s)]' % (e_int(d + 1, extra), e_int(d + 1, extra))
    if r < 0.9: return '(%s ? %s : %s)' % (e_cond(d + 1, extra), e_int(d + 1, extra), e_int(d + 1, extra))
    if r < 0.94: return '%s(%s, %s)' % (R.choice(['suma3', 'mayor']), e_int(d + 1, extra), e_int(d + 1, extra))
    if r < 0.97: return 'abs(%s)' % e_int(d + 1, extra)
    return "(int) ACF(%s)" % e_flt(d + 1)
def e_cond(d=0, extra=()):
    r = R.random()
    if d > 2 or r < 0.6: return '%s %s %s' % (e_int(d + 1, extra), R.choice(['<', '>', '<=', '>=', '==', '!=']), e_int(d + 1, extra))
    if r < 0.8: return '(%s) %s (%s)' % (e_cond(d + 1, extra), R.choice(['&&', '||']), e_cond(d + 1, extra))
    if r < 0.9: return '!(%s)' % e_cond(d + 1, extra)
    return '%s %s %s' % (R.choice(FLTS + DBLS), R.choice('<>'), e_flt(d + 1))
def e_flt(d=0):
    r = R.random()
    if d > 2 or r < 0.35: return R.choice(FLTS + DBLS + ['%.2f' % R.uniform(-9, 9), '%.1ff' % R.uniform(0, 5)])
    if r < 0.6: return '(%s %s %s)' % (e_flt(d + 1), R.choice('+-*'), e_flt(d + 1))
    if r < 0.7: return '(%s / %.1f)' % (e_flt(d + 1), R.choice([2, 4, 3, 7, 0.5]))
    if r < 0.8: return '(%s)' % R.choice(INTS)
    if r < 0.86: return 'sqrt(fabs(%s))' % e_flt(d + 1)
    if r < 0.9: return 'media(%s, %s)' % (e_flt(d + 1), e_flt(d + 1))
    if r < 0.94: return 'floor(%s)' % e_flt(d + 1)
    return '(float) %s / %d' % (R.choice(INTS), R.choice([2, 3, 4, 8]))

def w(ind, s): L.append('    ' * ind + s)

def imprimir(ind, extra=()):
    r = R.random()
    if r < 0.35:
        f = R.choice(['%d', '%5d', '%-5d|', '%05d', '%+d', '%3d', '%x', '%o', '% d'])
        w(ind, 'printf("%s %s\\n", %s, %s);' % (f, R.choice(['%d', '%4d']), e_int(1, extra), e_int(1, extra)))
    elif r < 0.6:
        f = R.choice(['%f', '%.2f', '%8.3f', '%-8.1f|', '%e', '%g', '%.0f', '%+.2f', '%10.4f', '%.3e'])
        w(ind, 'printf("%s\\n", ACF(%s));' % (f, e_flt(1)))
    elif r < 0.7: w(ind, 'printf("%%c%%c %%3c|\\n", LETRA(%s), \'%s\', LETRA(%s));' % (e_int(1, extra), R.choice('azAZ09#'), e_int(1, extra)))
    elif r < 0.8: w(ind, 'printf("%%s %%10s|%%-10s|%%.3s %%d\\n", T, T, U, U, (int) strlen(T));')
    elif r < 0.9: w(ind, 'printf("%%ld %%u %%d\\n", (long) %s * 100000L, (unsigned) ACOTAR(%s) + 2000u, (%s));' % (e_int(1, extra), e_int(1, extra), e_cond(1, extra)))
    else: w(ind, 'puts(%s);' % R.choice(['T', 'U', '"linea"']))

def asignar(ind, extra=()):
    r = R.random()
    if r < 0.4: w(ind, '%s = ACOTAR(%s);' % (R.choice(INTS), e_int(0, extra)))
    elif r < 0.5: w(ind, '%s %s ACOTAR(%s); %s = ACOTAR(%s);' % ((lambda v: (v, R.choice(['+=', '-=']), e_int(1, extra), v, v))(R.choice(INTS))))
    elif r < 0.56: w(ind, '%s%s; %s = ACOTAR(%s);' % ((lambda v: (v, R.choice(['++', '--']), v, v))(R.choice(INTS))))
    elif r < 0.7: w(ind, 'V[IDX(%s)] = ACOTAR(%s);' % (e_int(1, extra), e_int(0, extra)))
    elif r < 0.78: w(ind, 'M[IDX2F(%s)][IDX2C(%s)] = ACOTAR(%s);' % (e_int(1, extra), e_int(1, extra), e_int(0, extra)))
    elif r < 0.9: w(ind, '%s = ACF(%s);' % (R.choice(FLTS + DBLS), e_flt(0)))
    elif r < 0.95: w(ind, 'E = (unsigned char) (%s); S = (short) (%s * 300); printf("%%d %%d\\n", E, S);' % (e_int(1, extra), e_int(1, extra)))
    elif r < 0.975: w(ind, 'CUENTA = contar(V, %d, %s);' % (N1, e_int(1, extra)))
    else: w(ind, '%s = veces();' % R.choice(INTS))

def leer(ind):
    r = R.random()
    if r < 0.4:
        v = R.choice(INTS); ENT.append(str(R.randint(-99, 99)))
        w(ind, 'if (scanf("%%d", &%s) != 1) %s = 0;' % (v, v)); w(ind, '%s = ACOTAR(%s);' % (v, v))
    elif r < 0.55:
        a, b = R.sample(INTS, 2); ENT.append('%d %s%d' % (R.randint(-50, 50), R.choice(['', ' ', '\n', '\t']), R.randint(0, 50)))
        w(ind, 'LEIDOS = scanf("%%d%%d", &%s, &%s); printf("leidos %%d\\n", LEIDOS);' % (a, b)); w(ind, '%s = ACOTAR(%s); %s = ACOTAR(%s);' % (a, a, b, b))
    elif r < 0.7:
        v = R.choice(FLTS); ENT.append(R.choice(['%.2f', '%.0f', '%.1fe1', '%.3f']) % R.uniform(-30, 30))
        w(ind, 'if (scanf("%%f", &%s) != 1) %s = 1.5f;' % (v, v)); w(ind, '%s = ACF(%s);' % (v, v))
    elif r < 0.8:
        v = R.choice(DBLS); ENT.append('%.4f' % R.uniform(-30, 30))
        w(ind, 'if (scanf("%%lf", &%s) != 1) %s = 2.5;' % (v, v)); w(ind, '%s = ACF(%s);' % (v, v))
    elif r < 0.9:
        ENT.append(R.choice(['x', 'Q', '7', ' k', '\n m']))
        w(ind, 'if (scanf(" %c", &LET) != 1) LET = \'?\';'); w(ind, 'printf("letra %c %d\\n", LET, LET);')
    else:
        ENT.append(R.choice(['hola', 'Morón', 'C99', 'a_b', '  sep']))
        w(ind, 'if (scanf("%19s", T) != 1) strcpy(T, "nada");'); w(ind, 'printf("[%s] %d\\n", T, (int) strlen(T));')

def bloque(ind, prof, extra=(), enlazo=False):
    for _ in range(R.randint(1, 4 if prof < 2 else 2)): instr(ind, prof, extra, enlazo)

def instr(ind, prof, extra=(), enlazo=False):
    r = R.random()
    if prof >= 3 or r < 0.28: (asignar if R.random() < 0.6 else imprimir)(ind, extra); return
    if r < 0.36: imprimir(ind, extra); return
    if r < 0.42 and not enlazo: leer(ind); return
    if r < 0.58:
        w(ind, 'if (%s) {' % e_cond(0, extra)); bloque(ind + 1, prof + 1, extra, enlazo)
        for _ in range(R.randint(0, 2)): w(ind, '} else if (%s) {' % e_cond(0, extra)); bloque(ind + 1, prof + 1, extra, enlazo)
        if R.random() < 0.6: w(ind, '} else {'); bloque(ind + 1, prof + 1, extra, enlazo)
        w(ind, '}'); return
    if r < 0.72:
        k = nuevo('I'); n = R.randint(1, 6); paso = R.choice(['%s++', '%s += 2', '++%s']) % k
        if R.random() < 0.5: w(ind, 'for (%s = 0; %s < %d; %s) {' % (k, k, n, paso))
        else: paso = '%s--' % k; w(ind, 'for (%s = %d; %s > 0; %s) {' % (k, n, k, paso))
        DECL.append(k); bloque(ind + 1, prof + 1, tuple(extra) + (k,), True)
        if R.random() < 0.3: w(ind + 1, 'if (%s) %s;' % (e_cond(1, tuple(extra) + (k,)), R.choice(['break', 'continue'])))
        if R.random() < 0.3: imprimir(ind + 1, tuple(extra) + (k,))
        w(ind, '}'); return
    if r < 0.82:
        k = nuevo('W'); DECL.append(k); n = R.randint(1, 5)
        w(ind, '%s = 0;' % k); w(ind, 'while (%s < %d) {' % (k, n)); w(ind + 1, '%s++;' % k)
        if R.random() < 0.3: w(ind + 1, 'if (%s) continue;' % e_cond(1, tuple(extra) + (k,)))
        bloque(ind + 1, prof + 1, tuple(extra) + (k,), True)
        if R.random() < 0.25: w(ind + 1, 'if (%s) break;' % e_cond(1, tuple(extra) + (k,)))
        w(ind, '}'); return
    if r < 0.92:
        w(ind, 'switch (IDX(%s)) {' % e_int(0, extra)); casos = R.sample(range(0, N1 + 2), R.randint(2, 4))
        for c in casos:
            w(ind + 1, 'case %d:' % c)
            if R.random() < 0.25: continue
            bloque(ind + 2, prof + 2, extra, enlazo)
            if R.random() < 0.7: w(ind + 2, 'break;')
        if R.random() < 0.7: w(ind + 1, 'default:'); bloque(ind + 2, prof + 2, extra, enlazo)
        w(ind, '}'); return
    w(ind, '{'); k = nuevo('Z'); w(ind + 1, 'int %s = ACOTAR(%s), A = %d;' % (k, e_int(1, extra), R.randint(-9, 9)))
    w(ind + 1, 'printf("bloque %%d %%d\\n", %s, A);' % k); bloque(ind + 1, prof + 1, extra, enlazo); w(ind, '}')

DECL = []
cuerpo_ini = len(L)
bloque(1, 0)
for _ in range(R.randint(3, 7)): instr(1, 0)
CUERPO = L[:]; L = []
A = L.append
A('// programa aleatorio, semilla %d (test/fuzz2.py)' % seed)
A('#include <stdio.h>'); A('#include <stdlib.h>'); A('#include <string.h>'); A('#include <math.h>')
A('#define N1 %d' % N1); A('#define N2F %d' % N2F); A('#define N2C %d' % N2C)
A('#define ACOTAR(x) ((x) % 1000)')
A('#define IDX(x) (abs(x) % N1)'); A('#define IDX2F(x) (abs(x) % N2F)'); A('#define IDX2C(x) (abs(x) % N2C)')
A('#define LETRA(x) (\'a\' + abs(x) % 26)')
A('int suma3(int A, int B);'); A('int mayor(int A, int B);'); A('float media(float A, float B);'); A('int contar(int V[], int N, int X);'); A('int veces(void);'); A('int fact(int N);'); A('void mostrar(int M[N2F][N2C]);'); A('double ACF(double X);')
A('int GLOBAL = %d;' % R.randint(1, 9)); A('')
A('int main() {')
A('    int %s;' % ', '.join('%s = %d' % (v, R.randint(-30, 30)) for v in INTS))
A('    float %s;' % ', '.join('%s = %.2ff' % (v, R.uniform(-5, 5)) for v in FLTS))
A('    double %s;' % ', '.join('%s = %.3f' % (v, R.uniform(-5, 5)) for v in DBLS))
A('    int V[N1] = {%s};' % ', '.join(str(R.randint(-40, 40)) for _ in range(R.randint(1, N1))))
A('    int M[N2F][N2C] = {%s};' % ', '.join('{%s}' % ', '.join(str(R.randint(-9, 9)) for _ in range(R.randint(1, N2C))) for _ in range(N2F)))
A('    char T[20] = "%s", U[20] = "%s", LET = \'%s\';' % (R.choice(['uno', 'texto', 'abc def']), R.choice(['dos', 'XYZ', '']), R.choice('qRs')))
A('    unsigned char E = 0; short S = 0; int CUENTA = 0, LEIDOS = 0, K = 0;')
if DECL: A('    int %s;' % ', '.join(v + ' = 0' for v in DECL))
L.extend(CUERPO)
A('    strcat(U, "+"); if (strcmp(T, U) < 0) printf("menor\\n"); else printf("no menor\\n");')
A('    for (K = 0; K < N1; K++) printf("%d ", V[K]);'); A('    printf("\\n"); mostrar(M);')
A('    printf("%d %d %d %d %.3f %.3f %.4f %.4f %d %d %d %d %d\\n", A, B, C, D, X, Y, P, Q, E, S, CUENTA, fact(IDX(A)), GLOBAL);')
A('    return %s;' % R.choice(['0', '0', 'IDX(A)', '3']))
A('}')
A('int suma3(int A, int B) { return ACOTAR(A + B + 3); }')
A('// la única función con efecto (static y global): se llama sola en su instrucción, porque el orden entre dos efectos de una misma expresión no está definido en C')
A('int veces(void) { static int VECES = 0; VECES++; GLOBAL = ACOTAR(GLOBAL + VECES); return VECES; }')
A('int mayor(int A, int B) { if (A > B) return A; return B; }')
A('float media(float A, float B) { return (A + B) / 2; }')
A('int contar(int V[], int N, int X) { int K, C = 0; for (K = 0; K < N; K++) if (V[K] > X) C++; return C; }')
A('int fact(int N) { if (N <= 1) return 1; return N * fact(N - 1); }')
A('void mostrar(int M[N2F][N2C]) { int F, C; for (F = 0; F < N2F; F++) { for (C = 0; C < N2C; C++) printf("%4d", M[F][C]); printf("\\n"); } }')
A('// mantiene los decimales en un rango chico y sin NaN ni infinitos')
A('double ACF(double X) { if (X != X) return 0.5; if (X > 1e6) return 1e6; if (X < -1e6) return -1e6; return X; }')
open(out, 'w').write('\n'.join(L) + '\n')
open(out[:-2] + '.in', 'w').write('\n'.join(ENT) + ('\n' if ENT else ''))
