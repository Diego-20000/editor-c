#include <stdio.h>
int main() { int N, S = 0, C = 0; float P; scanf("%d", &N); while (N != -1) { S += N; C++; scanf("%d", &N); } if (C > 0) { P = (float) S / C; printf("%d %d %.2f\n", S, C, P); } else printf("sin datos\n"); return 0; }
