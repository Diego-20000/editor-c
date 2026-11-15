#include <stdio.h>
int main() { int A[4] = {7, -7, 7, -7}, B[4] = {2, 2, -2, -2}, I; for (I = 0; I < 4; I++) printf("%d/%d=%d %d%%%d=%d\n", A[I], B[I], A[I] / B[I], A[I], B[I], A[I] % B[I]); printf("%d %d %d\n", -1 / 2, 1 / -2, -1 % 2); printf("%ld %ld\n", -7L / 2, -7L % 2); return 0; }
