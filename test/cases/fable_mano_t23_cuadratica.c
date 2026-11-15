#include <stdio.h>
#include <math.h>
int main() { float A, B, C, D; while (scanf("%f %f %f", &A, &B, &C) == 3) { D = B * B - 4 * A * C; if (D > 0) printf("%.3f %.3f\n", (-B + sqrt(D)) / (2 * A), (-B - sqrt(D)) / (2 * A)); else if (D == 0) printf("%.3f\n", -B / (2 * A)); else printf("%.3f+-%.3fi\n", -B / (2 * A), sqrt(-D) / (2 * A)); } return 0; }
