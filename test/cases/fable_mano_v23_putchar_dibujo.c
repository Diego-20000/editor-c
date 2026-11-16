#include <stdio.h>
int main() { int I, J; for (I = 0; I < 4; I++) { for (J = 0; J < 8; J++) putchar((I + J) % 2 ? '#' : '.'); putchar('\n'); } putchar('A' + 2); putchar(10); return 0; }
