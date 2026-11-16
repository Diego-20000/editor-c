#include <stdio.h>
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define CUAD(x) ((x) * (x))
#define INC(v) (v)++
#define SWAP(a, b) { int T_ = a; a = b; b = T_; }
int N = 0;
int f(void) { N++; return N; }
int main() { int A = 3, B = 5, R; R = MAX(A++, B++); printf("%d %d %d\n", R, A, B); R = MAX(f(), 0); printf("%d %d\n", R, N); INC(A); SWAP(A, B) printf("%d %d\n", A, B); R = CUAD(A + 1) / CUAD(2); printf("%d\n", R); return 0; }
