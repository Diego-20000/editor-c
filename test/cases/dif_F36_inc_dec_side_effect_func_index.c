#include <stdio.h>
int k = 0;
int siguiente(void){ return k++ % 3; }
int main(void){
  int a[3] = {0, 0, 0};
  a[siguiente()]++;
  a[siguiente()] += 5;
  printf("%d %d %d k=%d\n", a[0], a[1], a[2], k);
  return 0;
}
