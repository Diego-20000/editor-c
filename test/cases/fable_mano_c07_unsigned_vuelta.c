#include <stdio.h>
int main() { unsigned U = 0; U = U - 1; printf("%u\n", U); U = 4294967295u; U = U + 2; printf("%u\n", U); U = 5; printf("%u %d\n", U - 10, U - 10 > 0); printf("%u\n", 3000000000u + 3000000000u); printf("%u %u\n", -1 / 2u, 7u / -1); unsigned char C = 255; C++; printf("%d\n", C); C = 0; C--; printf("%d\n", C); unsigned short S = 65535; S += 2; printf("%d\n", S); return 0; }
