#include <stdio.h>
int main() { int I; float P[3] = {12.5f, 100.0f, 7.25f}; char N[3][10] = {"pan", "leche", "te"}; printf("%-10s|%8s|%6s\n", "Producto", "Precio", "IVA"); for (I = 0; I < 3; I++) printf("%-10s|%8.2f|%5.1f%%\n", N[I], P[I], P[I] * 0.21); printf("%-10s|%8.2f|\n", "Total", P[0] + P[1] + P[2]); return 0; }
