#include <stdio.h>
int main() { int A = 7, B = 2; float X; double D; X = A / B; printf("%.2f\n", X); X = (float) A / B; printf("%.2f\n", X); X = A / 2.0; printf("%.2f\n", X); D = (double) (A / B); printf("%.2f\n", D); X = A / B * 2.0; printf("%.2f\n", X); X = 2.0 * A / B; printf("%.2f\n", X); printf("%d %d\n", (int) 3.99, (int) -3.99); return 0; }
