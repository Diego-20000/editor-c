#include <stdio.h>
int main() { int N, I; scanf("%d", &N); int V[N]; float M[N][2]; for (I = 0; I < N; I++) { V[I] = I * I; M[I][0] = I / 2.0f; M[I][1] = -I; } printf("%d %d %.1f %.1f %d\n", V[N - 1], (int) (sizeof(V) / sizeof(int)), M[N - 1][0], M[1][1], (int) sizeof(M)); return 0; }
