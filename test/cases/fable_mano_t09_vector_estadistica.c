#include <stdio.h>
#include <math.h>
#define N 6
int main() { float V[N], S = 0, M, D = 0; int I; for (I = 0; I < N; I++) { scanf("%f", &V[I]); S += V[I]; } M = S / N; for (I = 0; I < N; I++) D += (V[I] - M) * (V[I] - M); printf("%.3f %.3f\n", M, sqrt(D / N)); for (I = N - 1; I >= 0; I--) printf("%6.1f", V[I]); printf("\n"); return 0; }
