// espera: limpio
#include <stdio.h>
int main(){
  int n = 5, s = 0, i = 0, k = 3, m = 4;
  while (n-- > 0) s += n;
  while (i++ < 3) s += 10;
  while (--k > 0) s += 100;
  do { s++; } while (m-- > 0);
  printf("%d\n", s);
  return 0;
}
