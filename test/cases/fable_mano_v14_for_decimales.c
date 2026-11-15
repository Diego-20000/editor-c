#include <stdio.h>
int main() { float X; double D; int C = 0; for (X = 0; X < 1; X += 0.1f) C++; printf("%d\n", C); C = 0; for (D = 0; D < 1; D += 0.1) C++; printf("%d\n", C); for (X = 1; X > 0.001f; X /= 2) C++; printf("%d\n", C); for (D = 0.5; D <= 2.5; D += 0.5) printf("%.1f ", D); printf("\n"); return 0; }
