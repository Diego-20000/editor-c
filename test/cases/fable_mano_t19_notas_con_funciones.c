#include <stdio.h>
#define MAXA 10
void leer(float V[], int N); float promedio(float V[], int N); int sobre(float V[], int N, float P);
int main() { float V[MAXA], P; int N; scanf("%d", &N); if (N > MAXA) N = MAXA; leer(V, N); P = promedio(V, N); printf("PROMEDIO %.2f, %d SOBRE EL PROMEDIO\n", P, sobre(V, N, P)); return 0; }
void leer(float V[], int N) { int I; for (I = 0; I < N; I++) scanf("%f", &V[I]); }
float promedio(float V[], int N) { int I; float S = 0; for (I = 0; I < N; I++) S += V[I]; return S / N; }
int sobre(float V[], int N, float P) { int I, C = 0; for (I = 0; I < N; I++) if (V[I] > P) C++; return C; }
