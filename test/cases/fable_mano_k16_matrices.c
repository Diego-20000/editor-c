#include <stdio.h>
#define F 3
#define C 4
int main() { int M[F][C], T[C][F], I, J, S = 0, D = 0; for (I = 0; I < F; I++) for (J = 0; J < C; J++) M[I][J] = I * C + J; for (I = 0; I < F; I++) for (J = 0; J < C; J++) T[J][I] = M[I][J]; for (I = 0; I < C; I++) { for (J = 0; J < F; J++) printf("%3d", T[I][J]); printf("\n"); } for (I = 0; I < F; I++) { S += M[I][C - 1]; D += M[I][I]; } printf("%d %d\n", S, D); int Z[2][3] = {1, 2, 3, 4}; int W[][2] = {{1}, {2, 3}, {0}}; printf("%d %d %d %d %d\n", Z[1][0], Z[1][2], W[0][1], W[1][1], (int) (sizeof(W) / sizeof(W[0]))); return 0; }
