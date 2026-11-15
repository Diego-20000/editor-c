#include <stdio.h>
int main() { int I = 5; float F = 2.0f; double D = 3.0; long L = 4; char C = 'A'; unsigned U = 3; printf("%f %f %f %ld %d %u\n", I / F, I / D, F / D, I * L, C + I, U + I); printf("%f\n", I / 2 + F); printf("%f\n", I / 2.0f + F); printf("%d\n", (int) (I / F)); printf("%.3f %.3f\n", (float) I / 3, (double) I / 3); printf("%d %d\n", C / 2, 'a' - 'A'); return 0; }
