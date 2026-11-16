#include <stdio.h>
int main() { int A[5] = {1, 2}, B[] = {4, 5, 6}, C[3] = {0}, I; char T[5] = "ab", U[] = "xyz", W[3] = {'h', 'i'}; float F[4] = {1.5f}; double D[2][2] = {{1}, {0, 2}}; for (I = 0; I < 5; I++) printf("%d ", A[I]); printf("%d %d %d %d %d\n", B[2], C[1], (int) sizeof(B), (int) sizeof(U), T[3]); printf("%s %.1f %.1f %.1f %.1f\n", W, F[0], F[3], D[0][1], D[1][1]); return 0; }
