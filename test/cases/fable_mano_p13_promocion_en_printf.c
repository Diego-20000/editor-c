#include <stdio.h>
int main() { char C = 'a'; short S = 300; float F = 1.5f; unsigned char U = 250; printf("%d %d %f %d %c\n", C, S, F, U + 10, C - 32); printf("%d %d\n", (char) 200, (unsigned char) -1); printf("%.3f %.3f\n", F / 4, (double) F * 2); return 0; }
