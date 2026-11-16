#include <stdio.h>
void cambia(int A, int V[], int M[][3], char T[]) { A = 99; V[0] = 99; M[1][2] = 99; T[0] = 'X'; }
void doble(int V[], int N) { int I; for (I = 0; I < N; I++) V[I] *= 2; }
int maximo(int V[5]) { int I, M = V[0]; for (I = 1; I < 5; I++) if (V[I] > M) M = V[I]; return M; }
int main() { int A = 1, V[5] = {3, 8, 2, 9, 4}, M[2][3] = {{1, 2, 3}, {4, 5, 6}}; char T[] = "hola"; cambia(A, V, M, T); doble(V, 5); printf("%d %d %d %s %d %d\n", A, V[0], M[1][2], T, maximo(V), V[4]); return 0; }
