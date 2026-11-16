#include <stdio.h>
int main() { int I; for (I = 0; I < 3000; I++) printf("%d,", I * 7 % 1000); printf("\n"); return 0; }
