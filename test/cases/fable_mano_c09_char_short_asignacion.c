#include <stdio.h>
int main() { char C = 300; short S = 70000; unsigned char U = -1; signed char G = 128; int I = 65; printf("%d %d %d %d\n", C, S, U, G); C = I; printf("%c %d\n", C, C); C = 'A' + 200; printf("%d\n", C); S = 32767; S = S + 1; printf("%d\n", S); C = 127; C += 1; printf("%d\n", C); U = 250; U += 10; printf("%d\n", U); return 0; }
