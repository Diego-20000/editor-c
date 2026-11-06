#include <stdio.h>
int main(void){
  long long a = 0, b = 1, t;
  int i;
  for (i = 0; i < 92; i++) { t = a + b; a = b; b = t; }
  printf("%lld\n", a);
  unsigned long long u = 18446744073709551615ULL;
  printf("%llu %llu\n", u, u + 1);
  return 0;
}
