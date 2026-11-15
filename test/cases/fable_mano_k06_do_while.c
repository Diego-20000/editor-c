#include <stdio.h>
int main() { int I = 10, C = 0; do { C++; I--; } while (I > 20); printf("%d %d\n", C, I); do { I -= 3; if (I % 2) continue; C++; } while (I > 0); printf("%d %d\n", C, I); do C++; while (C < 10); printf("%d\n", C); return 0; }
