#include <stdio.h>
int main(void){
  long long big = 1000000LL * 1000000;
  printf("%lld\n", big);
  printf("%d\n", -1 < 0u);
  printf("%d\n", -1 < 0xFFFFFFFF);
  unsigned u = 5;
  printf("%u\n", u - 0xFFFFFFFF);
  return 0;
}
