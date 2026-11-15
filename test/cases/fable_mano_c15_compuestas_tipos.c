#include <stdio.h>
int main() { int I = 7; I *= 1.5; printf("%d\n", I); I /= 2.5; printf("%d\n", I); I += 0.9; printf("%d\n", I); char C = 100; C *= 2; printf("%d\n", C); unsigned U = 10; U -= 20; printf("%u\n", U); float F = 5; F /= 2; printf("%.2f\n", F); I = 17; I %= 5; I <<= 2; I |= 1; I ^= 3; I &= 14; I >>= 1; printf("%d\n", I); double D = 1; D += I; D *= D; printf("%.1f\n", D); return 0; }
