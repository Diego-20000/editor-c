#include <stdio.h>
int main() { int N; N = printf("hola\n"); printf("%d\n", N); N = printf("%5d|%-3s|%.2f\n", 7, "x", 1.0); printf("%d\n", N); N = printf("%s", ""); printf("%d\n", N); N = printf("ñ\n"); printf("%d\n", N); return 0; }
