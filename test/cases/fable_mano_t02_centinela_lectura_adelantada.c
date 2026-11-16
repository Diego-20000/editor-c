#include <stdio.h>
int main() { float NOTA, S = 0; int C = 0, AP = 0; scanf("%f", &NOTA); while (NOTA >= 0) { S += NOTA; C++; if (NOTA >= 6) AP++; scanf("%f", &NOTA); } if (C == 0) printf("NO HAY DATOS\n"); else printf("%d %d %.2f %.1f%%\n", C, AP, S / C, AP * 100.0 / C); return 0; }
