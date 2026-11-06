#include <stdio.h>
int main(void){
  unsigned long a = 0;
  a = a - 1;
  printf("%lu\n", a);
  unsigned long b = 4000000000UL;
  printf("%lu\n", b * 4);
  printf("%d\n", (unsigned long)-1 > 5);
  return 0;
}
