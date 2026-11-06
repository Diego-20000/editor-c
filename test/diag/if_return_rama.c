// espera: limpio
#include <stdio.h>
int f(int n){ int x; if (n > 0) return 1; else x = 2; return x; }
int main(){ printf("%d\n", f(1)); return 0; }
