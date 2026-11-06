#include <stdio.h>
int main(void){
  unsigned x = 0x80000000u;
  unsigned y = 4000000000u;
  printf("%u %u\n", x >> 1, y >> 4);
  y >>= 1;
  printf("%u\n", y);
  int i;
  for (i = 31; i >= 28; i--) printf("%u", (4000000000u >> i) & 1);
  printf("\n");
  return 0;
}
