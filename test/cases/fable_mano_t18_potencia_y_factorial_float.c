#include <stdio.h>
int main() { double E = 1, T = 1; float F = 1; int I; for (I = 1; I <= 15; I++) { T /= I; E += T; F *= I; } printf("%.12f %.1f %e\n", E, F, F); return 0; }
