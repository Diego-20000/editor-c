#include <stdio.h>
int main() { char T[] = "ñu"; unsigned char U; int I, N = 0; for (I = 0; T[I]; I++) { U = T[I]; if (T[I] < 0) N++; printf("%d %d ", T[I], U); } printf("\n%d %d\n", N, I); char C = 0; for (I = 0; I < 200; I++) C++; printf("%d\n", C); return 0; }
