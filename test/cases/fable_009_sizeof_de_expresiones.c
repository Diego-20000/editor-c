#include <stdio.h>
int otra();
int main() { char C = 'x'; short S = 1; float F = 1; long L = 2; int I = 3; double D = 4; unsigned char U = 1;
  printf("%zu %zu %zu %zu %zu\n", sizeof(1), sizeof(1L), sizeof(1.0f), sizeof('a'), sizeof(2147483648));
  printf("%zu %zu %zu %zu %zu %zu\n", sizeof(C + 1), sizeof(C + C), sizeof(S * S), sizeof(F + 1), sizeof(I + L), sizeof(F * D));
  printf("%zu %zu %zu %zu %zu %zu\n", sizeof((char) I), sizeof((short) I), sizeof(-C), sizeof(I > 2), sizeof("hola"), sizeof(!D));
  printf("%zu %zu %zu %zu %zu\n", sizeof(1.0), sizeof(U), sizeof(+U), sizeof(I ? C : S), sizeof(3u));
  printf("%d\n", (int) sizeof(I) * 2); return otra(); }
// sizeof de una expresión dentro de una cuenta (el resultado es unsigned long)
int otra() { int I = 3; long L = sizeof(I + 1) * 2 + sizeof('a'); int K = (int) sizeof(1.5) + (int) sizeof("ab"); printf("%ld %d %d\n", L, K, sizeof(1) == 4); return 0; }
