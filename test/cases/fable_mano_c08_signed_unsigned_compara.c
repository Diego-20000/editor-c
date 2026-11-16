#include <stdio.h>
int main() { int A = -1; unsigned B = 1; long L = -1; printf("%d %d %d\n", A < B, A > B, L < B); printf("%d\n", A == 4294967295u); printf("%d %d\n", (unsigned) A > 100, -1 < 0u); unsigned char C = 200; printf("%d %d\n", C > 100, (char) C > 100); return 0; }
