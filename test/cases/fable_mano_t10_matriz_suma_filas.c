#include <stdio.h>
int main() { int M[3][3], I, J, SF, SC[3] = {0}, T = 0; for (I = 0; I < 3; I++) for (J = 0; J < 3; J++) scanf("%d", &M[I][J]); for (I = 0; I < 3; I++) { SF = 0; for (J = 0; J < 3; J++) { printf("%5d", M[I][J]); SF += M[I][J]; SC[J] += M[I][J]; } printf(" |%5d\n", SF); T += SF; } printf("%5d%5d%5d |%5d\n", SC[0], SC[1], SC[2], T); return 0; }
