#include <stdio.h>
int G; float GF; char GT[5]; int GV[3];
int contador(void) { static int N; static int M = 10; N++; M += N; return M; }
int otra(void) { static int N = 100; return N++; }
int main() { int I; for (I = 0; I < 4; I++) printf("%d ", contador()); printf("%d %d %d\n", otra(), otra(), G); printf("%d %.1f [%s] %d\n", G, GF, GT, GV[2]); G = 5; { int G = 7; G++; } printf("%d\n", G); return 0; }
