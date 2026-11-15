#include <stdio.h>
int main() { float F = 0.1f; double D = 0.1; printf("%.10f %.10f\n", F, D); printf("%d %d %d\n", F == 0.1, F == 0.1f, D == 0.1); F = 16777216.0f; F = F + 1.0f; printf("%.1f\n", F); F = 1.0f / 3.0f; D = 1.0 / 3.0; printf("%.12f %.12f %d\n", F, D, F == D); printf("%.9f\n", 0.1f + 0.2f); printf("%.17f\n", 0.1 + 0.2); F = 1e38f; F = F * 10; printf("%f\n", F); return 0; }
