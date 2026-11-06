#include <stdio.h>
int pow(int b, int e){ int r = 1; while (e-- > 0) r *= b; printf("[mi pow]"); return r; }
int main(){ printf("%d\n", pow(2, 10)); return 0; }
