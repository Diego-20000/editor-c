#include <stdio.h>
int main() { int C, L = 0, P = 0, N = 0, EN = 0; while ((C = getchar()) != EOF) { N++; if (C == '\n') L++; if (C == ' ' || C == '\n' || C == '\t') EN = 0; else if (!EN) { EN = 1; P++; } } printf("%d %d %d\n", L, P, N); return 0; }
