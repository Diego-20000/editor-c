#include <stdio.h>
int clase(int N) { switch (N % 3) { case 0: return 10; case 1: return 20; } return 30; }
int main() { int I, S = 0; for (I = 0; I < 9; I++) { switch (I % 4) { case 0: continue; case 1: S += 1; break; case 2: S += clase(I); } S += 1000; } printf("%d\n", S); return clase(4); }
