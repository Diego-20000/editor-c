#include <stdio.h>
#include <stdlib.h>
int main(void){
  int f[6] = {0}, i;
  srand(1);
  for (i = 0; i < 600; i++) f[rand() % 6]++;
  for (i = 0; i < 6; i++) printf("%d ", f[i]);
  printf("\n");
  int a[3] = {1,1,1}, k = 0;
  a[k++] += 10;
  printf("%d %d %d k=%d\n", a[0], a[1], a[2], k);
  return 0;
}
