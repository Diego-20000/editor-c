#include <stdio.h>
int main() { unsigned char P[4] = {10, 200, 255, 128}; int I; for (I = 0; I < 4; I++) { P[I] = P[I] + 100; printf("%d ", P[I]); } unsigned char M = 0x0F; printf("%d %d %d\n", (unsigned char) ~M, M << 4, (unsigned char) (M << 5)); short S = 0x7FFF; S++; printf("%d\n", S); return 0; }
