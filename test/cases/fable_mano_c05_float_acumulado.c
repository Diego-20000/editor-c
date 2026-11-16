#include <stdio.h>
int main() { float S = 0; double T = 0; int I; for (I = 0; I < 10; I++) { S += 0.1f; T += 0.1; } printf("%.8f %.16f %d %d\n", S, T, S == 1.0f, T == 1.0); for (I = 0, S = 0; I < 1000; I++) S += 0.01f; printf("%.5f\n", S); return 0; }
