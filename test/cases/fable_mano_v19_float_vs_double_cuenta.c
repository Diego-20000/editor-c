#include <stdio.h>
int main() { float F = 1.1f; double D = 1.1; float G = F * F; double E = D * D; printf("%.10f %.10f %.10f\n", G, E, F * F); printf("%d %d\n", G == F * F, (double) G == (double) F * F); float H = 1e-10f + 1.0f - 1.0f; printf("%g\n", H); float K = 3.0f; printf("%.8f %.8f\n", K / 7, 3.0 / 7); printf("%.2f\n", 0.1f * 3 * 100); return 0; }
