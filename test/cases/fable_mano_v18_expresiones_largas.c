#include <stdio.h>
int main() { int A = 3, B = 4, C = 5; double R; R = (A * A + B * B == C * C) ? (A + B + C) / 2.0 * ((A + B + C) / 2.0 - A) : -1; printf("%.2f\n", R); R = ((((A + 1) * (B - 1)) / (C - 3)) % 4) + (A > B ? A : B) * (C / 2) - -A + +B - (-(-C)); printf("%.1f\n", R); printf("%d\n", A+++B); printf("%d %d\n", A, A---B); return 0; }
