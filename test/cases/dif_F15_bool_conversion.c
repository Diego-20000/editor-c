#include <stdio.h>
#include <stdbool.h>
int main(void){
  bool b = 5;
  bool c = 0.5;
  printf("%d %d\n", b, c);
  b = 256;
  printf("%d\n", b);
  return 0;
}
