#include <stdio.h>
int main() { int A = 3, B = 5; printf("%f\n", A > B ? 1 : 2.5); printf("%d\n", A < B ? A : B); printf("%.1f %.1f\n", 1 ? 3 / 2 : 0.0, 0 ? 0.0 : 3 / 2); printf("%c\n", A % 2 ? 'I' : 'P'); printf("%s\n", A > B ? "mayor" : A == B ? "igual" : "menor"); printf("%d\n", A > 1 ? A > 2 ? 22 : 11 : 0); return 0; }
