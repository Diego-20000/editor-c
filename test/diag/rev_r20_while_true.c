// espera: limpio
#include <stdio.h>
#include <stdbool.h>
int f(int x){ while (true) { if (x > 3) return x; x++; } }
int main(){ printf("%d\n", f(1)); return 0; }
