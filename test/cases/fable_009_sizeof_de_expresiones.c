#include <stdio.h>
int main() { char C = 'x'; short S = 1; float F = 1; long L = 2; int I = 3; double D = 4; unsigned char U = 1;
  printf("%zu %zu %zu %zu %zu\n", sizeof(1), sizeof(1L), sizeof(1.0f), sizeof('a'), sizeof(2147483648));
  printf("%zu %zu %zu %zu %zu %zu\n", sizeof(C + 1), sizeof(C + C), sizeof(S * S), sizeof(F + 1), sizeof(I + L), sizeof(F * D));
  printf("%zu %zu %zu %zu %zu %zu\n", sizeof((char) I), sizeof((short) I), sizeof(-C), sizeof(I > 2), sizeof("hola"), sizeof(!D));
  printf("%zu %zu %zu %zu %zu\n", sizeof(1.0), sizeof(U), sizeof(+U), sizeof(I ? C : S), sizeof(3u));
  printf("%d\n", (int) sizeof(I) * 2); return 0; }
