#include <stdio.h>
#define N 3
#define MODO 2
#undef N
#define N 5
int main() {
#if MODO == 1
  printf("uno\n");
#elif MODO == 2 && defined(N)
  printf("dos %d\n", N);
#else
  printf("otro\n");
#endif
#ifndef NOEXISTE
  printf("no definido\n");
#  ifdef N
  printf("anidado\n");
#  endif
#endif
#if 0
  esto no se compila ni se lee 'comilla
#endif
  return 0;
}
